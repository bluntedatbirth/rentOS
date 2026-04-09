import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { extractAndTranslateContract } from '@/lib/claude/extractContract';
import type { Database } from '@/lib/supabase/types';
import fs from 'fs';
import path from 'path';

// DEV ONLY — test the OCR pipeline with an actual Thai PDF file
export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const adminClient = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get landlord user
  const { data: landlord } = await adminClient
    .from('profiles')
    .select('id')
    .eq('role', 'landlord')
    .limit(1)
    .single();

  if (!landlord) {
    return NextResponse.json({ error: 'No landlord found. Seed users first.' }, { status: 400 });
  }

  // Get or create property
  const { data: properties } = await adminClient.from('properties').select('id').limit(1);

  let propertyId: string;
  if (properties && properties.length > 0) {
    propertyId = properties[0]!.id;
  } else {
    const { data: newProp } = await adminClient
      .from('properties')
      .insert({
        landlord_id: landlord.id,
        name: 'Condo Sukhumvit 24',
        address: '123 Sukhumvit Soi 24, Bangkok',
        unit_number: '8A',
      })
      .select()
      .single();
    propertyId = newProp!.id;
  }

  // Create contract record
  const { data: contract } = await adminClient
    .from('contracts')
    .insert({
      property_id: propertyId,
      landlord_id: landlord.id,
      status: 'active',
      original_file_url: 'test/sample-contract.pdf',
    })
    .select()
    .single();

  if (!contract) {
    return NextResponse.json({ error: 'Failed to create contract' }, { status: 500 });
  }

  try {
    // Read the actual PDF file
    const pdfPath = path.join(process.cwd(), 'public', 'user-contract-2.pdf');
    const pdfBuffer = fs.readFileSync(pdfPath);
    const base64 = pdfBuffer.toString('base64');

    // Send through the real extractAndTranslateContract pipeline
    const extracted = await extractAndTranslateContract(base64, 'application/pdf');

    // Save to database
    await adminClient
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
      .eq('id', contract.id);

    return NextResponse.json({
      success: true,
      contract_id: contract.id,
      property_id: propertyId,
      clauses_count: extracted.clauses.length,
      extracted,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OCR failed';
    return NextResponse.json({ error: message, contract_id: contract.id }, { status: 500 });
  }
}
