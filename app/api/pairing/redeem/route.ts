import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { activateContract } from '@/lib/contracts/activate';
import { sendNotification } from '@/lib/notifications/send';

const schema = z.object({
  code: z.string().length(8),
});

// Tenant redeems an 8-char pair code to link themselves to a property.
//
// Atomic claim pattern: the UPDATE for current_tenant_id includes all guard
// predicates in the WHERE clause so PostgREST compiles it into a single
// SQL UPDATE ... WHERE ... RETURNING. This prevents the race where two
// concurrent tenants both pass the IS NULL check before either write lands.
export async function POST(request: Request) {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const body: unknown = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest('Invalid pairing code');

  const adminClient = createServiceRoleClient();

  // 1. Look up the property by pair_code — must be real (not shell) and active
  const { data: propertyRaw, error: lookupError } = await adminClient
    .from('properties')
    .select('id, name, landlord_id')
    .eq('pair_code' as never, parsed.data.code.toUpperCase())
    .eq('is_shell' as never, false)
    .eq('is_active', true as never)
    .maybeSingle();

  if (lookupError) {
    return serverError(lookupError.message);
  }

  if (!propertyRaw) {
    return NextResponse.json({ error: 'Invalid pair code.' }, { status: 404 });
  }

  const property = propertyRaw as Record<string, unknown>;
  const propertyId = property['id'] as string;
  const propertyName = property['name'] as string;
  const landlordId = property['landlord_id'] as string;

  // 2. Enforce 1-tenant cap atomically: UPDATE only when current_tenant_id IS NULL
  //    If another tenant already claimed this property, zero rows are returned.
  const { data: claimed, error: claimError } = await adminClient
    .from('properties')
    .update({
      current_tenant_id: user.id,
      grace_period_ends_at: null,
    } as Record<string, unknown>)
    .eq('id', propertyId)
    .is('current_tenant_id' as never, null)
    .select('id')
    .maybeSingle();

  if (claimError) {
    return serverError(claimError.message);
  }

  if (!claimed) {
    return NextResponse.json(
      { error: 'This property already has a paired tenant.' },
      { status: 409 }
    );
  }

  // 3. Check for an unassigned contract on this property — assign the tenant
  //    and attempt to activate it. Pairing is valid even if no contract exists.
  const { data: unassignedContract } = await adminClient
    .from('contracts')
    .select('id')
    .eq('property_id', propertyId)
    .is('tenant_id', null)
    .in('status', ['pending', 'active'])
    .maybeSingle();

  if (unassignedContract) {
    // Assign the tenant to the contract first so activateContract can verify it
    await adminClient
      .from('contracts')
      .update({ tenant_id: user.id })
      .eq('id', unassignedContract.id);

    const result = await activateContract(adminClient, unassignedContract.id);
    if (!result.success) {
      // Non-fatal: pairing succeeded; contract activation can be retried separately
      console.error('[pairing/redeem] Contract activation failed:', result.error);
    }
  }

  // 4. Notify landlord of the new pairing (fire-and-forget)
  void sendNotification({
    recipientId: landlordId,
    type: 'pairing_confirmed',
    titleEn: 'Tenant Paired',
    titleTh: 'เชื่อมต่อผู้เช่าแล้ว',
    bodyEn: `A tenant has paired with your property "${propertyName}".`,
    bodyTh: `ผู้เช่าได้เชื่อมต่อกับอสังหาริมทรัพย์ "${propertyName}" ของคุณแล้ว`,
    url: `/landlord/properties/${propertyId}`,
  });

  return NextResponse.json({ propertyId, propertyName });
}
