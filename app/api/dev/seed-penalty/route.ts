import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { isDevEndpointAllowed } from '@/lib/devGuard';

/**
 * POST /api/dev/seed-penalty
 *
 * Seeds a test penalty for a given contract.
 * Requires: contract_id in the request body.
 * Dev-only endpoint — blocked in production.
 */
export async function POST(request: Request) {
  if (!isDevEndpointAllowed()) return new Response(null, { status: 404 });

  const body = (await request.json()) as { contract_id?: string };
  const contractId = body.contract_id;

  if (!contractId) {
    return NextResponse.json({ error: 'contract_id is required' }, { status: 400 });
  }

  const admin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Verify contract exists and get the landlord_id
  const { data: contract, error: contractError } = await admin
    .from('contracts')
    .select('id, landlord_id')
    .eq('id', contractId)
    .single();

  if (contractError || !contract) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
  }

  // Create a sample penalty
  const { data: penalty, error: penaltyError } = await admin
    .from('penalties')
    .insert({
      contract_id: contractId,
      clause_id: 'CL-001',
      raised_by: contract.landlord_id,
      description_th: 'ชำระค่าเช่าล่าช้า 3 วัน',
      description_en: 'Late rent payment by 3 days',
      calculated_amount: 1500,
      status: 'pending_landlord_review',
    })
    .select('id')
    .single();

  if (penaltyError || !penalty) {
    return NextResponse.json(
      { error: penaltyError?.message ?? 'Failed to create penalty' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: 'Test penalty seeded',
    penalty_id: penalty.id,
    contract_id: contractId,
  });
}
