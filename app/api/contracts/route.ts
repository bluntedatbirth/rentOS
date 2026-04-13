import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { activateContract } from '@/lib/contracts/activate';

const createContractSchema = z.object({
  property_id: z.string().uuid(),
  tenant_id: z.string().uuid().optional(),
  lease_start: z.string().optional(),
  lease_end: z.string().optional(),
  monthly_rent: z.number().positive().optional(),
  security_deposit: z.number().nonnegative().optional(),
  raw_text_th: z.string().optional(),
  translated_text_en: z.string().optional(),
  structured_clauses: z.array(z.any()).optional(),
});

// Fields a tenant is allowed to supply when creating their own standalone lease row.
// All other fields (landlord_id, status, property_id, etc.) are either forced by the
// server or rejected. This schema intentionally has no property_id — tenant-owned
// contracts are not linked to a properties row (no landlord, no property_id join).
const tenantCreateLeaseSchema = z.object({
  property_name: z.string().min(1).max(255),
  lease_start: z.string().optional(),
  lease_end: z.string().optional(),
  monthly_rent: z.number().positive().optional(),
  due_day: z.number().int().min(1).max(31).optional(),
  notes: z.string().max(2000).optional(),
});

export async function GET() {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  // RLS ensures landlords see their contracts, tenants see theirs
  // Exclude heavy JSONB columns (raw_text_th, translated_text_en, structured_clauses)
  // that are only needed on the individual contract detail endpoint.
  const { data, error } = await supabase
    .from('contracts')
    .select(
      'id, property_id, tenant_id, landlord_id, lease_start, lease_end, monthly_rent, security_deposit, status, pairing_code, pairing_expires_at, renewed_from, created_at, property_name, due_day, notes, properties(name, address, unit_number)'
    )
    .order('created_at', { ascending: false });

  if (error) {
    return serverError(error.message);
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  // Look up the caller's role to determine which branch to take.
  const admin = createServiceRoleClient();
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();

  const isTenant = profile?.role === 'tenant';

  // --- Tenant branch: create a standalone lease row with no landlord ---
  if (isTenant) {
    const body: unknown = await request.json();

    // Reject any attempt to embed landlord_id, status, or property_id
    if (
      typeof body === 'object' &&
      body !== null &&
      ('landlord_id' in body || 'status' in body || 'property_id' in body)
    ) {
      return badRequest('Tenants may not set landlord_id, status, or property_id');
    }

    const parsed = tenantCreateLeaseSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
    }

    const { data, error } = await supabase
      .from('contracts')
      .insert({
        tenant_id: user.id,
        landlord_id: null,
        property_id: null,
        property_name: parsed.data.property_name,
        status: 'active',
        lease_start: parsed.data.lease_start ?? null,
        lease_end: parsed.data.lease_end ?? null,
        monthly_rent: parsed.data.monthly_rent ?? null,
        due_day: parsed.data.due_day ?? null,
        notes: parsed.data.notes ?? null,
      })
      .select()
      .single();

    if (error) {
      return serverError(error.message);
    }

    return NextResponse.json(data, { status: 201 });
  }

  // --- Landlord branch (original logic, unchanged) ---
  const body: unknown = await request.json();
  const parsed = createContractSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  // Determine initial status based on invariants
  const hasClauses =
    Array.isArray(parsed.data.structured_clauses) && parsed.data.structured_clauses.length > 0;
  const hasTenant = !!parsed.data.tenant_id;
  const leaseStart = parsed.data.lease_start ? new Date(parsed.data.lease_start) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let initialStatus: 'pending' | 'active' | 'scheduled' | 'parse_failed';
  if (!hasClauses) {
    initialStatus = 'parse_failed';
  } else if (!hasTenant) {
    initialStatus = 'pending';
  } else if (leaseStart && leaseStart > today) {
    initialStatus = 'scheduled';
  } else {
    initialStatus = 'active';
  }

  // Pre-flight: if this contract would be active, ensure no other active contract on this property
  if (initialStatus === 'active') {
    const { data: existingActive, error: checkError } = await supabase
      .from('contracts')
      .select('id')
      .eq('property_id', parsed.data.property_id)
      .eq('status', 'active')
      .maybeSingle();

    if (checkError) {
      return serverError(checkError.message);
    }
    if (existingActive) {
      return badRequest('Property already has an active contract');
    }
  }

  const { data, error } = await supabase
    .from('contracts')
    .insert({
      property_id: parsed.data.property_id,
      landlord_id: user.id,
      tenant_id: parsed.data.tenant_id ?? null,
      status: initialStatus,
      lease_start: parsed.data.lease_start ?? null,
      lease_end: parsed.data.lease_end ?? null,
      monthly_rent: parsed.data.monthly_rent ?? null,
      security_deposit: parsed.data.security_deposit ?? null,
      raw_text_th: parsed.data.raw_text_th ?? null,
      translated_text_en: parsed.data.translated_text_en ?? null,
      structured_clauses: parsed.data.structured_clauses ?? null,
    })
    .select()
    .single();

  if (error) {
    return serverError(error.message);
  }

  // If contract is active, seed payment rows via shared helper
  if (initialStatus === 'active' && data) {
    const result = await activateContract(admin, data.id);
    if (!result.success) {
      console.error('[POST /api/contracts] Payment seeding failed:', result.error);
    }
  }

  return NextResponse.json(data, { status: 201 });
}
