import { NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  unauthorized,
  badRequest,
  notFound,
  serverError,
} from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendNotification } from '@/lib/notifications/send';

/**
 * POST /api/contracts/[id]/activate
 * Landlord confirms physical contract has been signed.
 * Moves renewal from awaiting_signature → active and expires the old contract.
 */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const admin = createServiceRoleClient();

  // Load the contract
  const { data: contractRaw, error: fetchError } = await admin
    .from('contracts')
    .select('id, landlord_id, tenant_id, status, renewed_from')
    .eq('id', params.id)
    .single();

  if (fetchError || !contractRaw) {
    return notFound('Contract not found');
  }

  const contract = contractRaw as unknown as {
    id: string;
    landlord_id: string;
    tenant_id: string | null;
    status: string;
    renewed_from: string | null;
  };

  // Only the landlord can activate
  if (contract.landlord_id !== user.id) {
    return unauthorized();
  }

  // Must be in awaiting_signature status
  if (contract.status !== 'awaiting_signature') {
    return badRequest('Contract is not awaiting signature');
  }

  // Activate the renewal contract
  const { error: activateError } = await admin
    .from('contracts')
    .update({ status: 'active' })
    .eq('id', contract.id);

  if (activateError) {
    console.error('[Activate] Failed to activate:', activateError.message);
    return serverError('Failed to activate contract');
  }

  // Expire the original contract
  if (contract.renewed_from) {
    const { error: expireError } = await admin
      .from('contracts')
      .update({ status: 'expired' })
      .eq('id', contract.renewed_from);

    if (expireError) {
      console.error('[Activate] Failed to expire original:', expireError.message);
      // Non-fatal — renewal is already activated
    }
  }

  // Notify the tenant that the contract is now active
  if (contract.tenant_id) {
    await sendNotification({
      recipientId: contract.tenant_id,
      type: 'lease_renewal_response',
      titleEn: 'Contract Renewal Finalized',
      titleTh: 'สัญญาเช่าต่อสัญญาสำเร็จ',
      bodyEn: 'Your renewed lease contract has been signed and is now active.',
      bodyTh: 'สัญญาเช่าที่ต่อได้ลงนามและมีผลบังคับใช้แล้ว',
      url: '/tenant/contract/view',
    });
  }

  return NextResponse.json({ success: true });
}
