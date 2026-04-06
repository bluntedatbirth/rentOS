import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser, unauthorized, badRequest } from '@/lib/supabase/api';
import { extractAndTranslateContract } from '@/lib/claude/extractContract';
import type { Database } from '@/lib/supabase/types';

const ocrRequestSchema = z.object({
  contract_id: z.string().uuid(),
  file_url: z.string(),
  file_type: z.enum(['image', 'pdf']),
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

  const body: unknown = await request.json();
  const parsed = ocrRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const { contract_id, file_url, file_type } = parsed.data;

  // Use service role client to bypass RLS for admin operations
  const adminClient = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Download file from Supabase Storage
    const { data: fileData, error: downloadError } = await adminClient.storage
      .from('contracts')
      .download(file_url);

    if (downloadError || !fileData) {
      return NextResponse.json(
        { error: 'Failed to download file: ' + (downloadError?.message ?? 'unknown') },
        { status: 500 }
      );
    }

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = getMimeType(file_type, file_url);

    // Call Claude OCR
    const extracted = await extractAndTranslateContract(base64, mimeType);

    // Save results to contracts table
    const { error: updateError } = await adminClient
      .from('contracts')
      .update({
        raw_text_th: extracted.raw_text_th,
        translated_text_en: extracted.translated_text_en,
        structured_clauses: extracted.clauses,
        lease_start: extracted.lease_start,
        lease_end: extracted.lease_end,
        monthly_rent: extracted.monthly_rent,
        security_deposit: extracted.security_deposit,
      })
      .eq('id', contract_id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to save results: ' + updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      contract_id,
      clauses_count: extracted.clauses.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OCR processing failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
