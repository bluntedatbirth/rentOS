import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getAuthenticatedUser,
  unauthorized,
  badRequest,
  notFound,
  serverError,
} from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendNotification } from '@/lib/notifications/send';

const respondSchema = z.object({
  accept: z.boolean(),
});

interface RenewalContractRow {
  id: string;
  landlord_id: string;
  tenant_id: string | null;
  status: string;
  renewed_from: string | null;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const body: unknown = await request.json();
  const parsed = respondSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const { accept } = parsed.data;

  const admin = createServiceRoleClient();

  // Load the renewal contract
  const { data: contractRaw, error: fetchError } = await admin
    .from('contracts')
    .select('id, landlord_id, tenant_id, status, renewed_from')
    .eq('id', params.id)
    .single();

  if (fetchError || !contractRaw) {
    return notFound('Contract not found');
  }

  const contract = contractRaw as unknown as RenewalContractRow;

  // Only the tenant on this contract may respond
  if (contract.tenant_id !== user.id) {
    return unauthorized();
  }

  // The contract must be a pending renewal (has renewed_from)
  if (contract.status !== 'pending' || !contract.renewed_from) {
    return badRequest('This contract is not awaiting a renewal response');
  }

  if (accept) {
    // Tenant agreed — move to awaiting_signature (landlord must confirm physical signing)
    const { error: updateError } = await admin
      .from('contracts')
      .update({ status: 'awaiting_signature' })
      .eq('id', contract.id);

    if (updateError) {
      console.error('[RenewRespond] Failed to update renewal status:', updateError.message);
      return serverError('Failed to update renewal contract');
    }

    // Do NOT expire the original contract yet — that happens when landlord activates
  } else {
    // Tenant declined — delete the renewal contract (no need to keep it)
    const { error: deleteError } = await admin.from('contracts').delete().eq('id', contract.id);

    if (deleteError) {
      console.error('[RenewRespond] Failed to delete declined renewal:', deleteError.message);
      return serverError('Failed to remove renewal contract');
    }
  }

  // Notify the landlord
  await sendNotification({
    recipientId: contract.landlord_id,
    type: 'lease_renewal_response',
    titleEn: accept ? 'Tenant Accepted Renewal — Sign Contract' : 'Lease Renewal Declined',
    titleTh: accept ? 'ผู้เช่ายอมรับการต่อสัญญา — รอลงนาม' : 'ผู้เช่าปฏิเสธการต่อสัญญา',
    bodyEn: accept
      ? 'Your tenant has agreed to the renewal terms. Please schedule a physical contract signing to finalize.'
      : 'Your tenant has declined the lease renewal.',
    bodyTh: accept
      ? 'ผู้เช่ายอมรับเงื่อนไขการต่อสัญญาแล้ว กรุณานัดลงนามสัญญาเพื่อดำเนินการ'
      : 'ผู้เช่าปฏิเสธการต่อสัญญาเช่า',
    url: `/contracts/${contract.id}`,
  });

  return NextResponse.json({ success: true, accepted: accept });
}
