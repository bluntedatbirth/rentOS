import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/supabase/api';

const createContractSchema = z.object({
  property_id: z.string().uuid(),
  tenant_id: z.string().uuid().optional(),
  lease_start: z.string().optional(),
  lease_end: z.string().optional(),
  monthly_rent: z.number().positive().optional(),
  security_deposit: z.number().nonnegative().optional(),
  raw_text_th: z.string().optional(),
  translated_text_en: z.string().optional(),
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
    return serverError(error.message);
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
      status: parsed.data.tenant_id ? 'active' : 'pending',
      lease_start: parsed.data.lease_start ?? null,
      lease_end: parsed.data.lease_end ?? null,
      monthly_rent: parsed.data.monthly_rent ?? null,
      security_deposit: parsed.data.security_deposit ?? null,
      raw_text_th: parsed.data.raw_text_th ?? null,
      translated_text_en: parsed.data.translated_text_en ?? null,
    })
    .select()
    .single();

  if (error) {
    return serverError(error.message);
  }

  return NextResponse.json(data, { status: 201 });
}
