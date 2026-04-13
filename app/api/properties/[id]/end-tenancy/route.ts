import { NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorized, notFound, serverError } from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { endTenancy } from '@/lib/properties/endTenancy';

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  // Verify the authenticated user owns this property (via RLS-scoped client)
  const { data: property, error: fetchError } = await supabase
    .from('properties')
    .select('id, landlord_id')
    .eq('id', params.id)
    .eq('landlord_id', user.id)
    .single();

  if (fetchError || !property) {
    return notFound('Property not found');
  }

  // Use service role client for endTenancy — it modifies fields that may not be
  // in RLS scope (e.g. last_tenant_id, grace_period_ends_at, previous_tenant_count)
  const adminClient = createServiceRoleClient();

  try {
    const result = await endTenancy(adminClient, params.id);
    return NextResponse.json({ success: result.success, newPairCode: result.newPairCode });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : String(err));
  }
}
