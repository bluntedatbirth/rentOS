import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getAuthenticatedUser, unauthorized, badRequest, forbidden } from '@/lib/supabase/api';
import { extractContractWithProgress, ContractValidationError } from '@/lib/claude/extractContract';
import { checkRateLimit, logAISpend } from '@/lib/rateLimit/persistent';
import { sendNotification } from '@/lib/notifications/send';

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

  // Persistent rate limit: 10/hour, 20/day per user
  const rl = await checkRateLimit(user.id, 'ocr', 10, 20);
  if (!rl.allowed) {
    console.warn('[rateLimit] ocr blocked, reason:', rl.reason, 'user:', user.id);
    return new Response(
      JSON.stringify({ error: 'ai_unavailable', retryAfterSeconds: rl.retryAfterSeconds }),
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

  // Stream progress via SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
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
          await adminClient
            .from('contracts')
            .update({ status: 'parse_failed' })
            .eq('id', contract_id);
          send({ step: 'error', error: 'Failed to save: ' + updateError.message });
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
        const isValidationErr = err instanceof ContractValidationError;
        if (isValidationErr) {
          send({ step: 'error', error: err.code });
        } else {
          send({
            step: 'error',
            error: err instanceof Error ? err.message : 'OCR processing failed',
          });
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
        controller.close();
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
