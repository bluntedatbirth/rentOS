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
 * POST /api/payments/[id]/claim
 *
 * Tenant claims they have paid a payment. Records claim metadata on the
 * payments row and notifies the landlord so they can confirm receipt.
 * Does not change the payment's status — the landlord must still confirm
 * via /api/payments/[id]/confirm to mark it as paid.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  // Optional note from tenant (e.g. bank transfer reference)
  let note: string | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    if (body && typeof body.note === 'string' && body.note.trim().length > 0) {
      note = body.note.trim().slice(0, 500);
    }
  } catch {
    // body is optional
  }

  const adminClient = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: payment, error: fetchError } = await adminClient
    .from('payments')
    .select('*')
    .eq('id', params.id)
    .single();

  if (fetchError || !payment) {
    return notFound('Payment not found');
  }

  if (payment.status === 'paid') {
    return badRequest('Payment is already marked as paid');
  }

  // Verify the user is the tenant on this contract
  const { data: contract, error: contractError } = await adminClient
    .from('contracts')
    .select('landlord_id, tenant_id, property_id')
    .eq('id', payment.contract_id)
    .single();

  if (contractError || !contract) {
    return notFound('Contract not found');
  }

  if (contract.tenant_id !== user.id) {
    return forbidden();
  }

  // Look up tenant name and property name for the notification body
  const [{ data: tenantProfile }, { data: property }] = await Promise.all([
    adminClient.from('profiles').select('full_name').eq('id', user.id).single(),
    contract.property_id
      ? adminClient.from('properties').select('name').eq('id', contract.property_id).single()
      : Promise.resolve({ data: null }),
  ]);

  const now = new Date().toISOString();

  // Record the claim on the payments row
  const updatePayload: { claimed_by: string; claimed_at: string; claimed_note?: string } = {
    claimed_by: user.id,
    claimed_at: now,
  };
  if (note !== undefined) updatePayload.claimed_note = note;

  const { data: updated, error: updateError } = await adminClient
    .from('payments')
    .update(updatePayload)
    .eq('id', params.id)
    .select()
    .single();

  if (updateError) {
    return serverError(updateError.message);
  }

  // Notify the landlord
  if (contract.landlord_id) {
    const tenantName = tenantProfile?.full_name ?? 'Tenant';
    const propertyName = property?.name ?? '';
    const amountLabel = `฿${Number(payment.amount).toLocaleString()}`;
    const bodyEn = propertyName
      ? `${tenantName} claims to have paid ${amountLabel} for ${propertyName}. Please confirm once you've received the funds.`
      : `${tenantName} claims to have paid ${amountLabel}. Please confirm once you've received the funds.`;
    const bodyTh = propertyName
      ? `${tenantName} แจ้งว่าได้ชำระเงิน ${amountLabel} สำหรับ ${propertyName} แล้ว กรุณายืนยันเมื่อคุณได้รับเงิน`
      : `${tenantName} แจ้งว่าได้ชำระเงิน ${amountLabel} แล้ว กรุณายืนยันเมื่อคุณได้รับเงิน`;

    void sendNotification({
      recipientId: contract.landlord_id,
      type: 'payment_claimed',
      titleEn: 'Tenant Payment Claim',
      titleTh: 'แจ้งการชำระเงินจากผู้เช่า',
      bodyEn,
      bodyTh,
      url: '/landlord/payments',
      payload: { target_route: 'payments.list' },
    });
  }

  return NextResponse.json(updated);
}
