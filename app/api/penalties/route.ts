import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/supabase/api';

export async function GET(request: Request) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const contractId = searchParams.get('contract_id');

  let query = supabase
    .from('penalties')
    .select(
      'id, contract_id, clause_id, raised_by, description_th, description_en, calculated_amount, confirmed_amount, status, tenant_appeal_note, landlord_resolution_note, created_at, resolved_at'
    )
    .order('created_at', { ascending: false });

  if (contractId) {
    query = query.eq('contract_id', contractId);
  }

  const { data, error } = await query;

  if (error) {
    return serverError(error.message);
  }

  return NextResponse.json(data);
}

const createPenaltySchema = z.object({
  contract_id: z.string().uuid(),
  // null means a manual (free-form) penalty entry not tied to a specific clause
  clause_id: z.string().min(1).nullable(),
  description_th: z.string().optional(),
  description_en: z.string().optional(),
  calculated_amount: z.number().min(0),
});

export async function POST(request: Request) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const body: unknown = await request.json();
  const parsed = createPenaltySchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const { data, error } = await supabase
    .from('penalties')
    .insert({
      contract_id: parsed.data.contract_id,
      // clause_id is nullable for manual (free-form) penalty entries. The
      // generated Supabase type expects string but the column allows NULL —
      // cast to satisfy the type checker without changing runtime behaviour.
      clause_id: (parsed.data.clause_id ?? null) as string,
      description_th: parsed.data.description_th ?? null,
      description_en: parsed.data.description_en ?? null,
      calculated_amount: parsed.data.calculated_amount,
      raised_by: user.id,
      status: 'pending_landlord_review',
    })
    .select()
    .single();

  if (error) {
    return serverError(error.message);
  }

  return NextResponse.json(data, { status: 201 });
}
