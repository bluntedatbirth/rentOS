import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getAuthenticatedUser,
  unauthorized,
  notFound,
  forbidden,
  badRequest,
  serverError,
} from '@/lib/supabase/api';
import { sendNotification } from '@/lib/notifications/send';
import type { Database } from '@/lib/supabase/types';

/**
 * POST /api/payments/[id]/confirm
 *
 * Landlord confirms they received a payment.
 * Updates status from 'pending' to 'paid', records confirmation metadata,
 * and notifies the tenant.
 */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const adminClient = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch payment
  const { data: payment, error: fetchError } = await adminClient
    .from('payments')
    .select('id, status, contract_id, amount, due_date')
    .eq('id', params.id)
    .single();

  if (fetchError || !payment) {
    return notFound('Payment not found');
  }

  // Only pending or overdue payments can be confirmed
  if (payment.status !== 'pending' && payment.status !== 'overdue') {
    return badRequest(`Cannot confirm a payment with status '${payment.status}'`);
  }

  // Verify the user is the landlord of this contract
  const { data: contract, error: contractError } = await adminClient
    .from('contracts')
    .select('landlord_id, tenant_id')
    .eq('id', payment.contract_id)
    .single();

  if (contractError || !contract) {
    return notFound('Contract not found');
  }

  if (contract.landlord_id !== user.id) {
    return forbidden();
  }

  const now = new Date().toISOString();
  const paidDate = now.split('T')[0]!;

  // Update payment: mark as paid with confirmation metadata
  const { data: updated, error: updateError } = await adminClient
    .from('payments')
    .update({
      status: 'paid' as const,
      paid_date: paidDate,
      confirmation_date: now,
      confirmed_by: user.id,
    })
    .eq('id', params.id)
    .select()
    .single();

  if (updateError) {
    return serverError(updateError.message);
  }

  // Notify the tenant
  if (contract.tenant_id) {
    void sendNotification({
      recipientId: contract.tenant_id,
      type: 'payment_due',
      titleEn: 'Payment Confirmed',
      titleTh: 'ยืนยันการชำระเงินแล้ว',
      bodyEn: `Your payment of ${payment.amount} THB has been confirmed by the landlord.`,
      bodyTh: `การชำระเงิน ${payment.amount} บาท ได้รับการยืนยันจากเจ้าของที่พักแล้ว`,
      url: '/tenant/payments',
    });
  }

  return NextResponse.json(updated);
}
