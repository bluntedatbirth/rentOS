import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { onTenantPaired } from '@/lib/notifications/events';
import { activateContract } from '@/lib/contracts/activate';

const schema = z.object({
  code: z.string().length(6),
});

// Tenant redeems a pairing code to link to a contract.
//
// P1-I: atomic claim-the-code pattern. Previously this route did a
// SELECT-check-then-UPDATE, which races: two concurrent tenants could
// both pass `tenant_id IS NULL` before either write landed, and the
// second silently overwrote the first.
//
// The new flow issues a single UPDATE with all the guarding predicates
// inside the WHERE clause and uses .select() so PostgREST compiles it
// into one SQL statement with RETURNING. If zero rows come back, the
// code is invalid/expired/already-claimed — no second query needed.
// Combined with the unique partial index on contracts(pairing_code)
// added by the database branch migration, this closes PA-1 and PA-2.
export async function POST(request: Request) {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const body: unknown = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest('Invalid pairing code');

  const adminClient = createServiceRoleClient();

  // Verify user is a tenant (cheap profile lookup, no race impact)
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'tenant') {
    return badRequest('Only tenants can redeem pairing codes');
  }

  // Atomic claim: one UPDATE that only touches a contract which is
  //   (a) has a matching pairing code,
  //   (b) still unclaimed (tenant_id IS NULL),
  //   (c) in a status that can accept pairing,
  //   (d) not yet expired.
  // PostgREST turns this into a single SQL UPDATE ... WHERE ... RETURNING.
  const nowIso = new Date().toISOString();
  const { data: claimed, error: claimError } = await adminClient
    .from('contracts')
    .update({
      tenant_id: user.id,
      pairing_code: null,
      pairing_expires_at: null,
    } as Record<string, unknown>)
    .eq('pairing_code', parsed.data.code.toUpperCase())
    .is('tenant_id', null)
    .in('status', ['pending', 'active'])
    .gt('pairing_expires_at', nowIso)
    .select('id, landlord_id')
    .maybeSingle();

  if (claimError) {
    return serverError(claimError.message);
  }

  if (!claimed) {
    // Either the code doesn't exist, already claimed, or expired.
    // Return a generic "code_already_used" rather than a 404 so the
    // client sees a single consistent failure mode for all three cases.
    return NextResponse.json({ error: 'code_already_used' }, { status: 409 });
  }

  // Step 2: Route through activateContract — flips status to active AND
  // seeds the rent payment rows. This must succeed for the pairing to be
  // meaningful; if it fails we leave the tenant linked but inactive and
  // the landlord can retry.
  const result = await activateContract(adminClient, claimed.id);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  // Fire-and-forget: notify both parties of successful pairing
  void onTenantPaired(claimed.id);

  return NextResponse.json({
    success: true,
    contract_id: claimed.id,
    message: 'Successfully paired to contract',
  });
}
