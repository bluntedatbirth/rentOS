import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database, StructuredClause } from '@/lib/supabase/types';

/**
 * POST /api/dev/seed-contract
 *
 * Seeds a test contract for a given landlord user.
 * Requires: landlord_id in the request body.
 * Dev-only endpoint — blocked in production.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const body = (await request.json()) as { landlord_id?: string };
  const landlordId = body.landlord_id;

  if (!landlordId) {
    return NextResponse.json({ error: 'landlord_id is required' }, { status: 400 });
  }

  const admin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Get or create a property for this landlord
  const { data: existingProps } = await admin
    .from('properties')
    .select('id')
    .eq('landlord_id', landlordId)
    .limit(1);

  let propertyId: string;

  if (existingProps && existingProps.length > 0) {
    propertyId = existingProps[0]!.id;
  } else {
    const { data: newProp, error: propError } = await admin
      .from('properties')
      .insert({
        landlord_id: landlordId,
        name: 'Test Condo Unit A',
        address: '123 Sukhumvit Soi 11, Bangkok 10110',
        unit_number: 'A-101',
      })
      .select('id')
      .single();

    if (propError || !newProp) {
      return NextResponse.json(
        { error: propError?.message ?? 'Failed to create property' },
        { status: 500 }
      );
    }
    propertyId = newProp.id;
  }

  // 2. Create sample structured clauses
  const sampleClauses: StructuredClause[] = [
    {
      clause_id: 'CL-001',
      title_th: 'การชำระค่าเช่า',
      title_en: 'Rent Payment',
      text_th: 'ผู้เช่าต้องชำระค่าเช่าภายในวันที่ 5 ของทุกเดือน',
      text_en: 'Tenant must pay rent by the 5th of every month.',
      category: 'payment',
      penalty_defined: true,
      penalty_amount: 500,
      penalty_currency: 'THB',
      penalty_description: 'Late payment fee of 500 THB per day',
    },
    {
      clause_id: 'CL-002',
      title_th: 'การบำรุงรักษา',
      title_en: 'Maintenance',
      text_th: 'ผู้เช่ารับผิดชอบการซ่อมแซมเล็กน้อย',
      text_en: 'Tenant is responsible for minor repairs.',
      category: 'maintenance',
      penalty_defined: false,
      penalty_amount: null,
      penalty_currency: null,
      penalty_description: null,
    },
    {
      clause_id: 'CL-003',
      title_th: 'สัตว์เลี้ยง',
      title_en: 'Pets',
      text_th: 'ไม่อนุญาตให้เลี้ยงสัตว์โดยไม่ได้รับอนุญาตจากเจ้าของ',
      text_en: 'No pets allowed without landlord approval.',
      category: 'pets',
      penalty_defined: true,
      penalty_amount: 5000,
      penalty_currency: 'THB',
      penalty_description: 'Unauthorized pet penalty 5,000 THB',
    },
  ];

  // 3. Compute lease dates: start today, end in 12 months
  const leaseStart = new Date().toISOString().split('T')[0]!;
  const leaseEndDate = new Date();
  leaseEndDate.setFullYear(leaseEndDate.getFullYear() + 1);
  const leaseEnd = leaseEndDate.toISOString().split('T')[0]!;

  // 4. Generate a pairing code
  const pairingCode = Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map((b) => b.toString(36).padStart(2, '0'))
    .join('')
    .substring(0, 6)
    .toUpperCase();

  const pairingExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h for dev

  // 5. Insert the contract
  const { data: contract, error: contractError } = await admin
    .from('contracts')
    .insert({
      property_id: propertyId,
      landlord_id: landlordId,
      structured_clauses: sampleClauses,
      lease_start: leaseStart,
      lease_end: leaseEnd,
      monthly_rent: 15000,
      security_deposit: 30000,
      status: 'active',
      pairing_code: pairingCode,
      pairing_expires_at: pairingExpiresAt,
    })
    .select('id, pairing_code')
    .single();

  if (contractError || !contract) {
    return NextResponse.json(
      { error: contractError?.message ?? 'Failed to create contract' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: 'Test contract seeded',
    contract_id: contract.id,
    pairing_code: contract.pairing_code,
    property_id: propertyId,
    lease_start: leaseStart,
    lease_end: leaseEnd,
  });
}
