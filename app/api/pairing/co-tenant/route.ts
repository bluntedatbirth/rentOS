import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser, unauthorized, badRequest } from '@/lib/supabase/api';
import type { Database } from '@/lib/supabase/types';

const addSchema = z.object({
  contract_id: z.string().uuid(),
  full_name: z.string().min(1),
  phone: z.string().optional(),
});

const removeSchema = z.object({
  contract_id: z.string().uuid(),
  index: z.number().min(0).max(1),
});

const MAX_CO_TENANTS = 2;

interface ContractCoTenantRow {
  id: string;
  tenant_id: string | null;
  landlord_id: string;
  co_tenants: Array<{ full_name: string; phone?: string }> | null;
}

function getAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function isAuthorized(contract: ContractCoTenantRow, userId: string): boolean {
  return contract.tenant_id === userId || contract.landlord_id === userId;
}

// GET: list co-tenants for a contract
export async function GET(request: Request) {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const url = new URL(request.url);
  const contractId = url.searchParams.get('contract_id');
  if (!contractId) return badRequest('contract_id required');

  const adminClient = getAdminClient();

  const { data: contract } = await adminClient
    .from('contracts')
    .select('id, tenant_id, landlord_id, co_tenants')
    .eq('id', contractId)
    .single();

  const contractData = contract as unknown as ContractCoTenantRow | null;

  if (!contractData || !isAuthorized(contractData, user.id)) {
    return badRequest('Contract not found or not authorized');
  }

  return NextResponse.json({
    co_tenants: contractData.co_tenants ?? [],
  });
}

// POST: add a co-tenant
export async function POST(request: Request) {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const body: unknown = await request.json();
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) return badRequest('Invalid data');

  const adminClient = getAdminClient();

  const { data: contract } = await adminClient
    .from('contracts')
    .select('id, tenant_id, landlord_id, co_tenants')
    .eq('id', parsed.data.contract_id)
    .single();

  const contractData = contract as unknown as ContractCoTenantRow | null;

  if (!contractData || !isAuthorized(contractData, user.id)) {
    return badRequest('Contract not found or not authorized');
  }

  const existing = contractData.co_tenants ?? [];
  if (existing.length >= MAX_CO_TENANTS) {
    return badRequest(`Maximum ${MAX_CO_TENANTS} co-tenants allowed`);
  }

  const updated = [...existing, { full_name: parsed.data.full_name, phone: parsed.data.phone }];

  await adminClient
    .from('contracts')
    .update({ co_tenants: updated } as Record<string, unknown>)
    .eq('id', parsed.data.contract_id);

  return NextResponse.json({ success: true, co_tenants: updated });
}

// DELETE: remove a co-tenant by index
export async function DELETE(request: Request) {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const body: unknown = await request.json();
  const parsed = removeSchema.safeParse(body);
  if (!parsed.success) return badRequest('Invalid data');

  const adminClient = getAdminClient();

  const { data: contract } = await adminClient
    .from('contracts')
    .select('id, tenant_id, landlord_id, co_tenants')
    .eq('id', parsed.data.contract_id)
    .single();

  const contractData = contract as unknown as ContractCoTenantRow | null;

  if (!contractData || !isAuthorized(contractData, user.id)) {
    return badRequest('Contract not found or not authorized');
  }

  const existing = contractData.co_tenants ?? [];
  const updated = existing.filter((_, i) => i !== parsed.data.index);

  await adminClient
    .from('contracts')
    .update({ co_tenants: updated } as Record<string, unknown>)
    .eq('id', parsed.data.contract_id);

  return NextResponse.json({ success: true, co_tenants: updated });
}
