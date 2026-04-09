import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/supabase/api';

const createPaymentSchema = z.object({
  contract_id: z.string().uuid(),
  amount: z.number().positive(),
  due_date: z.string(),
  payment_type: z.enum(['rent', 'utility', 'deposit', 'penalty']),
  paid_date: z.string().optional(),
  status: z.enum(['pending', 'paid', 'overdue']).optional(),
  promptpay_ref: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

export async function GET(request: Request) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const contractId = searchParams.get('contract_id');

  let query = supabase.from('payments').select('*').order('due_date', { ascending: false });

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

  const { data, error } = await supabase
    .from('payments')
    .insert({
      contract_id: parsed.data.contract_id,
      amount: parsed.data.amount,
      due_date: parsed.data.due_date,
      payment_type: parsed.data.payment_type,
      paid_date: parsed.data.paid_date ?? null,
      status: parsed.data.status ?? 'pending',
      promptpay_ref: parsed.data.promptpay_ref ?? null,
      notes: parsed.data.notes ?? null,
    })
    .select()
    .single();

  if (error) {
    return serverError(error.message);
  }

  return NextResponse.json(data, { status: 201 });
}
