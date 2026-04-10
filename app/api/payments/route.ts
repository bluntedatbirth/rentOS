import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getAuthenticatedUser,
  unauthorized,
  badRequest,
  forbidden,
  serverError,
} from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';

const createPaymentSchema = z.object({
  contract_id: z.string().uuid(),
  amount: z.number().positive(),
  due_date: z.string(),
  payment_type: z.enum(['rent', 'utility', 'deposit', 'penalty']),
  paid_date: z.string().optional(),
  status: z.enum(['pending', 'paid', 'overdue']).optional(),
  notes: z.string().max(1000).optional(),
});

export async function GET(request: Request) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const contractId = searchParams.get('contract_id');

  let query = supabase
    .from('payments')
    .select(
      'id, contract_id, amount, due_date, paid_date, payment_type, status, promptpay_ref, notes, claimed_by, claimed_at, claimed_note'
    )
    .order('due_date', { ascending: false });

  if (contractId) {
    query = query.eq('contract_id', contractId);
  }

  const { data, error } = await query;

  if (error) {
    return serverError(error.message);
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const body: unknown = await request.json();
  const parsed = createPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  // Ownership check: verify the contract belongs to this landlord before inserting
  const adminClient = createServiceRoleClient();
  const { data: contract, error: contractError } = await adminClient
    .from('contracts')
    .select('landlord_id')
    .eq('id', parsed.data.contract_id)
    .single();

  if (contractError || !contract) {
    return forbidden();
  }

  if (contract.landlord_id !== user.id) {
    return forbidden();
  }

  const { data, error } = await supabase
    .from('payments')
    .insert({
      contract_id: parsed.data.contract_id,
      amount: parsed.data.amount,
      due_date: parsed.data.due_date,
      payment_type: parsed.data.payment_type,
      paid_date: parsed.data.paid_date ?? null,
      status: parsed.data.status ?? 'pending',
      notes: parsed.data.notes ?? null,
    })
    .select()
    .single();

  if (error) {
    return serverError(error.message);
  }

  return NextResponse.json(data, { status: 201 });
}
