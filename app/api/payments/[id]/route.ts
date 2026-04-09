import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getAuthenticatedUser,
  unauthorized,
  badRequest,
  notFound,
  forbidden,
  serverError,
} from '@/lib/supabase/api';

const updatePaymentSchema = z.object({
  status: z.enum(['pending', 'paid', 'overdue']),
  paid_date: z.string().optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const body: unknown = await request.json();
  const parsed = updatePaymentSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  // Fetch the payment and verify ownership through contract
  const { data: payment, error: fetchError } = await supabase
    .from('payments')
    .select('id, contract_id')
    .eq('id', params.id)
    .single();

  if (fetchError || !payment) {
    return notFound('Payment not found');
  }

  // Verify the user is the landlord of this contract
  const { data: contract, error: contractError } = await supabase
    .from('contracts')
    .select('landlord_id')
    .eq('id', payment.contract_id)
    .single();

  if (contractError || !contract) {
    return notFound('Contract not found');
  }

  if (contract.landlord_id !== user.id) {
    return forbidden();
  }

  const updateData: { status: 'pending' | 'paid' | 'overdue'; paid_date?: string } = {
    status: parsed.data.status,
  };
  if (parsed.data.paid_date) {
    updateData.paid_date = parsed.data.paid_date;
  } else if (parsed.data.status === 'paid') {
    updateData.paid_date = new Date().toISOString().slice(0, 10);
  }

  const { data, error } = await supabase
    .from('payments')
    .update(updateData)
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return serverError(error.message);
  }

  return NextResponse.json(data);
}
