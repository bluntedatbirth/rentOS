import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser, unauthorized, badRequest } from '@/lib/supabase/api';
import { extractContractWithProgress, ContractValidationError } from '@/lib/claude/extractContract';
import { checkRateLimit, logAISpend } from '@/lib/rateLimit/persistent';
import type { Database } from '@/lib/supabase/types';

const ocrRequestSchema = z.object({
  contract_id: z.string().uuid(),
  file_url: z.string(),
  file_type: z.enum(['image', 'pdf']),
  property_id: z.string().uuid().optional(),
});

function getMimeType(
  fileType: string,
  fileUrl: string
): 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf' {
  if (fileType === 'pdf') return 'application/pdf';
  if (fileUrl.endsWith('.png')) return 'image/png';
  if (fileUrl.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

export async function POST(request: Request) {
  const { user } = await getAuthenticatedUser();
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

  const { contract_id, file_url, file_type } = parsed.data;

  if (file_url.includes('..') || file_url.includes('//')) {
    return badRequest('Invalid file path');
  }

  const adminClient = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Stream progress via SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        // Step 1: Download file
        send({ step: 'downloading', progress: 5, message: 'ocr.step_downloading' });

        const { data: fileData, error: downloadError } = await adminClient.storage
          .from('contracts')
          .download(file_url);

        if (downloadError || !fileData) {
          send({ step: 'error', error: 'Failed to download file' });
          controller.close();
          return;
        }

        if (fileData.size > 20 * 1024 * 1024) {
          send({ step: 'error', error: 'File too large' });
          controller.close();
          return;
        }

        const arrayBuffer = await fileData.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = getMimeType(file_type, file_url);

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

        // Step 4: Verify ownership then update property
        const { data: currentContract } = await adminClient
          .from('contracts')
          .select('property_id, landlord_id')
          .eq('id', contract_id)
          .single();

        if (!currentContract || currentContract.landlord_id !== user.id) {
          send({ step: 'error', error: 'Forbidden' });
          controller.close();
          return;
        }

        if (extracted.property && currentContract.property_id) {
          const prop = extracted.property;
          const propertyName =
            prop.name_en || prop.name_th || prop.address_en || 'Unnamed Property';
          const propertyAddress = prop.address_en || prop.address_th || '';

          const { data: existingProp } = await adminClient
            .from('properties')
            .select('name')
            .eq('id', currentContract.property_id)
            .single();

          if (existingProp?.name === 'Detecting from contract...') {
            await adminClient
              .from('properties')
              .update({
                name: propertyName,
                address: propertyAddress,
                unit_number: prop.unit_number || null,
              })
              .eq('id', currentContract.property_id);
          }
        }

        // Step 5: Save to DB
        send({ step: 'saving', progress: 90, message: 'ocr.step_saving' });

        const updateData: Record<string, unknown> = {
          raw_text_th: extracted.raw_text_th,
          translated_text_en: extracted.translated_text_en,
          structured_clauses: extracted.clauses,
          lease_start: extracted.lease_start,
          lease_end: extracted.lease_end,
          monthly_rent: extracted.monthly_rent,
          security_deposit: extracted.security_deposit,
        };

        const { error: updateError } = await adminClient
          .from('contracts')
          .update(updateData)
          .eq('id', contract_id);

        if (updateError) {
          send({ step: 'error', error: 'Failed to save: ' + updateError.message });
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
      } catch (err) {
        if (err instanceof ContractValidationError) {
          send({ step: 'error', error: err.code });
        } else {
          send({
            step: 'error',
            error: err instanceof Error ? err.message : 'OCR processing failed',
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
