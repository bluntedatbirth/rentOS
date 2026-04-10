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
import { activateContract } from '@/lib/contracts/activate';

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
    .select('id, landlord_id, tenant_id, status, renewed_from, structured_clauses, lease_start')
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
    structured_clauses: unknown[] | null;
    lease_start: string | null;
  };

  // Only the landlord can activate
  if (contract.landlord_id !== user.id) {
    return unauthorized();
  }

  // Must be in awaiting_signature status
  if (contract.status !== 'awaiting_signature') {
    return badRequest('Contract is not awaiting signature');
  }

  // Check invariants before allowing transition
  const hasClauses =
    Array.isArray(contract.structured_clauses) && contract.structured_clauses.length > 0;
  if (!hasClauses) {
    return badRequest('Contract has no structured clauses and cannot be activated');
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const leaseStart = contract.lease_start ? new Date(contract.lease_start) : null;
  if (!leaseStart || leaseStart > today) {
    return badRequest(
      `Lease start date (${contract.lease_start ?? 'not set'}) has not arrived yet`
    );
  }

  // Use shared helper to activate + seed payments
  const result = await activateContract(admin, contract.id);
  if (!result.success) {
    console.error('[Activate] Failed:', result.error);
    return serverError(`Failed to activate contract: ${result.error}`);
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

  return NextResponse.json({ success: true, seededPayments: result.seededCount });
}
