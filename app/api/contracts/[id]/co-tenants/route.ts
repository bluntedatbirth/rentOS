import { NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorized, notFound } from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/contracts/[id]/co-tenants
 *
 * List co-tenants for a specific contract.
 * Auth: only the primary tenant or landlord of the contract can view.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const adminClient = createServiceRoleClient();

  const { data: contract, error } = await adminClient
    .from('contracts')
    .select('tenant_id, landlord_id, co_tenants')
    .eq('id', params.id)
    .single();

  if (error || !contract) {
    return notFound('Contract not found');
  }

  // Only landlord or primary tenant can view co-tenants
  if (contract.landlord_id !== user.id && contract.tenant_id !== user.id) {
    return notFound('Contract not found');
  }

  const coTenants = (contract.co_tenants ?? []) as Array<{ full_name: string; phone?: string }>;

  return NextResponse.json({ co_tenants: coTenants });
}
