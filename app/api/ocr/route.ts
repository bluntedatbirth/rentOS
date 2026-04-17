import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getAuthenticatedUser, unauthorized, badRequest, forbidden } from '@/lib/supabase/api';
import { extractContractWithProgress, ContractValidationError } from '@/lib/claude/extractContract';
import { checkRateLimit, incrementRateLimit, logAISpend } from '@/lib/rateLimit/persistent';
import { getAILimits } from '@/lib/ai/limits';
import { sendNotification } from '@/lib/notifications/send';

// Contract parsing runs two Claude passes (90s + 180s SDK timeouts) plus
// storage download + DB writes. Allow up to 5 minutes on Vercel.
export const maxDuration = 300;

/** Fire-and-forget notification — NEVER crashes the caller */
function safeNotify(params: Parameters<typeof sendNotification>[0]) {
  setTimeout(() => {
    sendNotification(params).catch((err) =>
      console.error('[OCR] Notification send failed (non-blocking):', err)
    );
  }, 0);
}

const ocrRequestSchema = z.object({
  contract_id: z.string().uuid(),
  file_type: z.enum(['image', 'pdf']),
  // file_url is accepted but ignored — storage path is derived server-side from the contract record
  file_url: z.string().optional(),
});

function getMimeType(
  fileType: string,
  storagePath: string
): 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf' {
  if (fileType === 'pdf') return 'application/pdf';
  if (storagePath.endsWith('.png')) return 'image/png';
  if (storagePath.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

export async function POST(request: Request) {
  const { user, supabase: sessionClient } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  // Per-user daily AI limit scales with property slots: 4 successful parses/day
  // for 2-slot users, scaling up to 20/day for 10-slot users. hourly = daily / 2.
  const budgetClient = createServiceRoleClient();
  const { count: propertyCount } = await budgetClient
    .from('properties')
    .select('id', { count: 'exact', head: true })
    .eq('landlord_id', user.id);

  const limits = getAILimits(propertyCount ?? 0);

  // skipIncrement so only SUCCESSFUL parses count — we increment after the
  // success path via incrementRateLimit(user.id, 'ocr').
  // Dev/test bypass is handled inside checkRateLimit via userEmail option.
  const rl = await checkRateLimit(user.id, 'ocr', limits.hourlyOcr, limits.dailyOcr, {
    skipIncrement: true,
    userEmail: user.email ?? undefined,
  });
  if (!rl.allowed) {
    console.warn('[rateLimit] ocr blocked, reason:', rl.reason, 'user:', user.id);
    return new Response(
      JSON.stringify({
        error: 'ai_unavailable',
        reason: rl.reason,
        retryAfterSeconds: rl.retryAfterSeconds,
        dailyLimit: limits.dailyOcr,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(rl.retryAfterSeconds),
        },
      }
    );
  }

  const body: unknown = await request.json();
  const parsed = ocrRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const { contract_id, file_type } = parsed.data;

  // Ownership check BEFORE any storage access: fetch via session client (RLS-enforced).
  // The session client will only return the contract if landlord_id = auth.uid() per RLS.
  // We also explicitly verify landlord_id === user.id as belt-and-suspenders.
  const { data: contract, error: contractFetchError } = await sessionClient
    .from('contracts')
    .select('id, property_id, landlord_id, original_file_url')
    .eq('id', contract_id)
    .single();

  if (contractFetchError || !contract) {
    return forbidden();
  }

  if (contract.landlord_id !== user.id) {
    return forbidden();
  }

  // Derive storage path server-side from the stored URL — never use client-supplied path.
  // URL format: https://<project>.supabase.co/storage/v1/object/public/contracts/<storagePath>
  const storagePath = contract.original_file_url
    ? (contract.original_file_url.split('/storage/v1/object/public/contracts/')[1] ?? null)
    : null;

  if (!storagePath) {
    return badRequest('Contract has no associated file');
  }

  const adminClient = createServiceRoleClient();
  const contractPropertyId = contract.property_id as string | null;

  // On parse failure, don't orphan the property in the "Detecting from
  // contract..." placeholder state. Rename it to something editable so the
  // user can still manage the property and re-upload if they want.
  async function recoverPropertyOnFailure() {
    if (!contractPropertyId) return;
    try {
      const { data: prop } = await adminClient
        .from('properties')
        .select('name')
        .eq('id', contractPropertyId)
        .single();
      if (prop?.name === 'Detecting from contract...') {
        await adminClient
          .from('properties')
          .update({ name: 'Unnamed property' })
          .eq('id', contractPropertyId);
      }
    } catch (err) {
      console.error('[OCR] recoverPropertyOnFailure failed (non-blocking):', err);
    }
  }

  // Stream progress via SSE
  const encoder = new TextEncoder();

  // Internal timeout: 180 s — fires before Vercel's 300 s maxDuration so the
  // stream closes cleanly rather than being killed mid-SSE-frame.
  const OCR_TIMEOUT_MS = 180_000;

  const stream = new ReadableStream({
    async start(controller) {
      // Timeout guard: if the Claude call hangs longer than OCR_TIMEOUT_MS,
      // we send a structured error event and close the stream cleanly.
      let timedOut = false;
      const timeoutId = setTimeout(() => {
        timedOut = true;
        try {
          // Send in the same shape the client parser expects (step:'error')
          // so ContractParseProvider shows the error toast and exits cleanly.
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ step: 'error', error: 'Analysis timed out — please try again' })}\n\n`
            )
          );
          controller.close();
        } catch {
          // controller may already be closed — safe to ignore
        }
      }, OCR_TIMEOUT_MS);

      function send(data: Record<string, unknown>) {
        if (timedOut) return; // stream already closed by timeout
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        // Step 1: Download file using server-side derived path (not client-supplied)
        send({ step: 'downloading', progress: 5, message: 'ocr.step_downloading' });

        const { data: fileData, error: downloadError } = await adminClient.storage
          .from('contracts')
          .download(storagePath);

        if (downloadError || !fileData) {
          await adminClient
            .from('contracts')
            .update({ status: 'parse_failed' })
            .eq('id', contract_id);
          await recoverPropertyOnFailure();
          send({ step: 'error', error: 'Failed to download file' });
          try {
            safeNotify({
              recipientId: user.id,
              type: 'custom',
              titleEn: 'Contract parsing failed',
              titleTh: 'วิเคราะห์สัญญาล้มเหลว',
              bodyEn: 'There was an error parsing your contract. Please try again.',
              bodyTh: 'เกิดข้อผิดพลาดในการวิเคราะห์สัญญา กรุณาลองอีกครั้ง',
              url: `/landlord/contracts/upload`,
            });
          } catch (notifErr) {
            console.error('[OCR] Failed to send error notification (non-blocking):', notifErr);
          }
          controller.close();
          return;
        }

        if (fileData.size > 20 * 1024 * 1024) {
          await adminClient
            .from('contracts')
            .update({ status: 'parse_failed' })
            .eq('id', contract_id);
          await recoverPropertyOnFailure();
          send({ step: 'error', error: 'File too large' });
          try {
            safeNotify({
              recipientId: user.id,
              type: 'custom',
              titleEn: 'Contract parsing failed',
              titleTh: 'วิเคราะห์สัญญาล้มเหลว',
              bodyEn: 'There was an error parsing your contract. Please try again.',
              bodyTh: 'เกิดข้อผิดพลาดในการวิเคราะห์สัญญา กรุณาลองอีกครั้ง',
              url: `/landlord/contracts/upload`,
            });
          } catch (notifErr) {
            console.error('[OCR] Failed to send error notification (non-blocking):', notifErr);
          }
          controller.close();
          return;
        }

        const arrayBuffer = await fileData.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = getMimeType(file_type, storagePath);

        send({ step: 'pass1', progress: 15, message: 'ocr.step_analyzing' });

        // Step 2-3: Claude OCR with progress callback
        // logAISpend is called once per Claude call (Pass 1 and Pass 2 each trigger onUsage)
        const extracted = await extractContractWithProgress(
          base64,
          mimeType,
          (step) => {
            if (step === 'pass1_done') {
              send({ step: 'pass2', progress: 40, message: 'ocr.step_extracting' });
            } else if (step === 'pass2_done') {
              send({ step: 'saving', progress: 85, message: 'ocr.step_saving' });
            }
          },
          (usage) => {
            // Called once for Pass 1 and once for Pass 2
            void logAISpend(user.id, 'ocr', usage.input_tokens, usage.output_tokens);
          }
        );

        // Gate: if extraction returned 0 clauses, treat as parse failure
        if (extracted.clauses.length === 0) {
          await adminClient
            .from('contracts')
            .update({ status: 'parse_failed' })
            .eq('id', contract_id);
          await recoverPropertyOnFailure();
          const failReason = extracted.warnings?.length
            ? extracted.warnings[0]
            : 'No contract clauses could be extracted. Please upload a valid rental contract.';
          send({ step: 'error', error: failReason });
          safeNotify({
            recipientId: user.id,
            type: 'custom',
            titleEn: 'Wrong format detected',
            titleTh: 'รูปแบบไฟล์ไม่ถูกต้อง',
            bodyEn: 'No contract clauses were found. Please upload a valid rental contract.',
            bodyTh: 'ไม่พบข้อสัญญา กรุณาอัปโหลดสัญญาเช่าที่ถูกต้อง',
            url: `/landlord/contracts/upload`,
          });
          controller.close();
          return;
        }

        // Step 4: Update property name if auto-detected
        if (extracted.property && contract.property_id) {
          const prop = extracted.property;
          const propertyName =
            prop.name_en || prop.name_th || prop.address_en || 'Unnamed Property';
          const propertyAddress = prop.address_en || prop.address_th || '';

          const { data: existingProp } = await adminClient
            .from('properties')
            .select('name')
            .eq('id', contract.property_id)
            .single();

          if (existingProp?.name === 'Detecting from contract...') {
            await adminClient
              .from('properties')
              .update({
                name: propertyName,
                address: propertyAddress,
                unit_number: prop.unit_number || null,
              })
              .eq('id', contract.property_id);
          }
        }

        // Sync lease/rent info to property (but never overwrite name)
        if (contract.property_id) {
          const propertyUpdate: Record<string, unknown> = {};
          if (extracted.lease_start) propertyUpdate.lease_start = extracted.lease_start;
          if (extracted.lease_end) propertyUpdate.lease_end = extracted.lease_end;
          if (extracted.monthly_rent) propertyUpdate.monthly_rent = extracted.monthly_rent;
          // security_deposit is not a column on the properties table — omitted intentionally

          if (Object.keys(propertyUpdate).length > 0) {
            await adminClient
              .from('properties')
              .update(propertyUpdate)
              .eq('id', contract.property_id);
          }
        }

        // Step 5: Save to DB
        send({ step: 'saving', progress: 90, message: 'ocr.step_saving' });

        // Determine contract status based on extracted dates
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let derivedStatus = 'active';
        if (extracted.lease_start && extracted.lease_end) {
          const leaseStart = new Date(extracted.lease_start);
          const leaseEnd = new Date(extracted.lease_end);
          if (leaseEnd < today) {
            derivedStatus = 'expired';
          } else if (leaseStart > today) {
            derivedStatus = 'scheduled';
          } else {
            derivedStatus = 'active';
          }
        } else if (extracted.lease_start) {
          const leaseStart = new Date(extracted.lease_start);
          if (leaseStart > today) {
            derivedStatus = 'scheduled';
          }
        } else if (extracted.lease_end) {
          const leaseEnd = new Date(extracted.lease_end);
          if (leaseEnd < today) {
            derivedStatus = 'expired';
          }
        }

        const updateData: Record<string, unknown> = {
          raw_text_th: extracted.raw_text_th,
          translated_text_en: extracted.translated_text_en,
          structured_clauses: extracted.clauses,
          lease_start: extracted.lease_start,
          lease_end: extracted.lease_end,
          monthly_rent: extracted.monthly_rent,
          security_deposit: extracted.security_deposit,
          status: derivedStatus,
        };

        const { error: updateError } = await adminClient
          .from('contracts')
          .update(updateData)
          .eq('id', contract_id);

        if (updateError) {
          // Postgres error 23505 = unique_violation. If the one-active-per-property
          // index fires on the status update (e.g. another contract was activated
          // between upload and OCR completion), surface a clear message.
          const isUniqueViolation =
            (updateError as { code?: string }).code === '23505' &&
            updateError.message?.includes('contracts_one_active_per_property');

          await adminClient
            .from('contracts')
            .update({ status: 'parse_failed' })
            .eq('id', contract_id);
          await recoverPropertyOnFailure();

          const userFacingError = isUniqueViolation
            ? 'property_has_active_contract'
            : 'Failed to save: ' + updateError.message;

          send({ step: 'error', error: userFacingError });
          try {
            safeNotify({
              recipientId: user.id,
              type: 'custom',
              titleEn: isUniqueViolation ? 'Contract conflict' : 'Contract parsing failed',
              titleTh: isUniqueViolation ? 'สัญญาซ้ำซ้อน' : 'วิเคราะห์สัญญาล้มเหลว',
              bodyEn: isUniqueViolation
                ? 'This property already has an active or pending contract. Resolve the existing contract before uploading a new one.'
                : 'There was an error parsing your contract. Please try again.',
              bodyTh: isUniqueViolation
                ? 'พร็อพเพอร์ตี้นี้มีสัญญาที่ใช้งานอยู่แล้ว กรุณาจัดการสัญญาเดิมก่อน'
                : 'เกิดข้อผิดพลาดในการวิเคราะห์สัญญา กรุณาลองอีกครั้ง',
              url: `/landlord/contracts/upload`,
            });
          } catch (notifErr) {
            console.error('[OCR] Failed to send error notification (non-blocking):', notifErr);
          }
          controller.close();
          return;
        }

        // Only count SUCCESSFUL parses against the daily limit. Fire-and-forget
        // — we don't block the SSE completion on the counter write.
        void incrementRateLimit(user.id, 'ocr');

        send({
          step: 'done',
          progress: 100,
          message: 'ocr.step_done',
          contract_id,
          clauses_count: extracted.clauses.length,
          property_detected: extracted.property?.name_en || extracted.property?.name_th || null,
        });

        try {
          safeNotify({
            recipientId: user.id,
            type: 'custom',
            titleEn: 'Contract parsed successfully',
            titleTh: 'วิเคราะห์สัญญาสำเร็จ',
            bodyEn: `${extracted.clauses.length} clauses extracted from your contract.`,
            bodyTh: `สกัดได้ ${extracted.clauses.length} ข้อจากสัญญาของคุณ`,
            url: `/landlord/contracts/${contract_id}`,
          });
        } catch (notifErr) {
          console.error('[OCR] Failed to send success notification (non-blocking):', notifErr);
        }
      } catch (err) {
        await adminClient
          .from('contracts')
          .update({ status: 'parse_failed' })
          .eq('id', contract_id);
        await recoverPropertyOnFailure();
        const isValidationErr = err instanceof ContractValidationError;
        if (isValidationErr) {
          send({ step: 'error', error: err.code });
        } else {
          console.error('[ocr] non-validation error:', err instanceof Error ? err.message : err);
          send({ step: 'error', error: 'processing_failed' });
        }
        // Use "wrong format" messaging for validation errors, generic for others
        if (isValidationErr) {
          safeNotify({
            recipientId: user.id,
            type: 'custom',
            titleEn: 'Wrong format detected',
            titleTh: 'รูปแบบไฟล์ไม่ถูกต้อง',
            bodyEn:
              'The uploaded file does not appear to be a rental contract. Please upload again.',
            bodyTh: 'ไฟล์ที่อัปโหลดไม่ใช่สัญญาเช่า กรุณาอัปโหลดใหม่',
            url: `/landlord/contracts/upload`,
          });
        } else {
          safeNotify({
            recipientId: user.id,
            type: 'custom',
            titleEn: 'Contract parsing failed',
            titleTh: 'วิเคราะห์สัญญาล้มเหลว',
            bodyEn: 'There was an error parsing your contract. Please try again.',
            bodyTh: 'เกิดข้อผิดพลาดในการวิเคราะห์สัญญา กรุณาลองอีกครั้ง',
            url: `/landlord/contracts/upload`,
          });
        }
      } finally {
        clearTimeout(timeoutId);
        if (!timedOut) {
          controller.close();
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
