import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendNotification } from './send';

/**
 * Look up a contract's landlord_id and tenant_id.
 */
async function getContractParties(contractId: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('contracts')
    .select('landlord_id, tenant_id')
    .eq('id', contractId)
    .single();

  if (error || !data) {
    console.error('[NotificationEvents] Could not find contract:', contractId, error?.message);
    return null;
  }
  return data;
}

/**
 * Fired when a landlord confirms a penalty.
 * Notifies the tenant.
 */
export async function onPenaltyConfirmed(penaltyId: string, contractId: string): Promise<void> {
  const parties = await getContractParties(contractId);
  if (!parties?.tenant_id) return;

  await sendNotification({
    recipientId: parties.tenant_id,
    type: 'penalty_raised',
    titleEn: 'Penalty Confirmed',
    titleTh: 'ค่าปรับถูกยืนยันแล้ว',
    bodyEn: 'A penalty on your contract has been confirmed by the landlord.',
    bodyTh: 'ค่าปรับในสัญญาของคุณถูกยืนยันโดยเจ้าของที่พัก',
    url: '/tenant/penalties',
    payload: { target_route: 'penalties.list' },
  });
}

/**
 * Fired when a maintenance request status changes.
 * Notifies the tenant who raised the request.
 */
export async function onMaintenanceStatusChanged(
  requestId: string,
  contractId: string,
  newStatus: string,
  previousStatus?: string
): Promise<void> {
  // Dedup guard: no-op if status hasn't actually changed (T-BUG-08)
  if (previousStatus !== undefined && previousStatus === newStatus) return;

  // Whitelist: only fire for actionable transitions
  if (newStatus !== 'in_progress' && newStatus !== 'resolved') return;

  const parties = await getContractParties(contractId);
  if (!parties?.tenant_id) return;

  const statusLabelEn = newStatus === 'resolved' ? 'Resolved' : 'In Progress';
  const statusLabelTh = newStatus === 'resolved' ? 'แก้ไขแล้ว' : 'กำลังดำเนินการ';

  await sendNotification({
    recipientId: parties.tenant_id,
    type: 'maintenance_updated',
    titleEn: `Maintenance Request ${statusLabelEn}`,
    titleTh: `คำขอซ่อมบำรุง${statusLabelTh}`,
    bodyEn: `Your maintenance request has been updated to: ${statusLabelEn}.`,
    bodyTh: `คำขอซ่อมบำรุงของคุณถูกอัปเดตเป็น: ${statusLabelTh}`,
    url: '/tenant/maintenance',
    payload: { target_route: 'maintenance.list' },
  });
}

/**
 * Fired when a tenant is successfully paired to a contract.
 * Notifies both landlord and tenant.
 */
export async function onTenantPaired(contractId: string): Promise<void> {
  const parties = await getContractParties(contractId);
  if (!parties) return;

  // Notify the tenant
  if (parties.tenant_id) {
    await sendNotification({
      recipientId: parties.tenant_id,
      type: 'pairing_confirmed',
      titleEn: 'Contract Paired Successfully',
      titleTh: 'จับคู่สัญญาเรียบร้อยแล้ว',
      bodyEn: 'You have been linked to your rental contract.',
      bodyTh: 'คุณถูกเชื่อมต่อกับสัญญาเช่าของคุณแล้ว',
      url: '/tenant/contract/view',
      payload: { target_route: 'contract.view', fallback_route: 'dashboard' },
    });
  }
}

/**
 * Lease-ended notifications are handled entirely by lib/properties/endTenancy.ts,
 * which notifies both the landlord and the former tenant with structured payloads.
 * Callers that need to send lease-ended notifications should call endTenancy() directly.
 */
// onLeaseEnded — see lib/properties/endTenancy.ts
