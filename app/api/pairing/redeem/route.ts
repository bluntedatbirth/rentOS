import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser, unauthorized, badRequest, forbidden } from '@/lib/supabase/api';
import type { Database } from '@/lib/supabase/types';
import { onTenantPaired } from '@/lib/notifications/events';
import { activateContract } from '@/lib/contracts/activate';

const schema = z.object({
  code: z.string().length(6),
});

// Tenant redeems a pairing code to link to a contract
export async function POST(request: Request) {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const body: unknown = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest('Invalid pairing code');

  const adminClient = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Verify user is a tenant
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'tenant') {
    return badRequest('Only tenants can redeem pairing codes');
  }

  // Find contract with matching pairing code
  // We query using raw SQL-like filter since pairing_code may be a JSON field
  const { data: contracts } = await adminClient
    .from('contracts')
    .select('id, tenant_id, landlord_id, pairing_code, pairing_expires_at')
    .eq('pairing_code' as string, parsed.data.code.toUpperCase())
    .in('status', ['pending', 'active']);

  const contract = (
    contracts as unknown as Array<{
      id: string;
      tenant_id: string | null;
      landlord_id: string;
      pairing_code: string;
      pairing_expires_at: string;
    }>
  )?.[0];

  if (!contract) {
    return badRequest('Invalid or expired pairing code');
  }

  // Check expiry
  if (new Date(contract.pairing_expires_at) < new Date()) {
    return badRequest('Pairing code has expired');
  }

  // Check if already paired
  if (contract.tenant_id && contract.tenant_id !== user.id) {
    return forbidden();
  }

  // Step 1: Link tenant and clear pairing code — leave status untouched
  const { error: pairError } = await adminClient
    .from('contracts')
    .update({
      tenant_id: user.id,
      pairing_code: null,
      pairing_expires_at: null,
    } as Record<string, unknown>)
    .eq('id', contract.id);

  if (pairError) {
    return NextResponse.json({ error: pairError.message }, { status: 500 });
  }

  // Step 2: Route through activateContract — flips status to active AND seeds 12 payment rows
  const result = await activateContract(adminClient, contract.id);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  // Fire-and-forget: notify both parties of successful pairing
  void onTenantPaired(contract.id);

  return NextResponse.json({
    success: true,
    contract_id: contract.id,
    message: 'Successfully paired to contract',
  });
}
