import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser, unauthorized, badRequest } from '@/lib/supabase/api';

const createContractSchema = z.object({
  property_id: z.string().uuid(),
  tenant_id: z.string().uuid().optional(),
  lease_start: z.string().optional(),
  lease_end: z.string().optional(),
  monthly_rent: z.number().positive().optional(),
  security_deposit: z.number().nonnegative().optional(),
});

export async function GET() {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  // RLS ensures landlords see their contracts, tenants see theirs
  const { data, error } = await supabase
    .from('contracts')
    .select('*, properties(name, address, unit_number)')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const body: unknown = await request.json();
  const parsed = createContractSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const { data, error } = await supabase
    .from('contracts')
    .insert({
      property_id: parsed.data.property_id,
      landlord_id: user.id,
      tenant_id: parsed.data.tenant_id ?? null,
      lease_start: parsed.data.lease_start ?? null,
      lease_end: parsed.data.lease_end ?? null,
      monthly_rent: parsed.data.monthly_rent ?? null,
      security_deposit: parsed.data.security_deposit ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
