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
  });
}

/**
 * Fired when a tenant appeals a penalty.
 * Notifies the landlord.
 */
export async function onPenaltyAppealed(penaltyId: string, contractId: string): Promise<void> {
  const parties = await getContractParties(contractId);
  if (!parties?.landlord_id) return;

  await sendNotification({
    recipientId: parties.landlord_id,
    type: 'penalty_appeal',
    titleEn: 'Penalty Appealed',
    titleTh: 'มีการอุทธรณ์ค่าปรับ',
    bodyEn: 'A tenant has appealed a penalty. Please review.',
    bodyTh: 'ผู้เช่าได้อุทธรณ์ค่าปรับ กรุณาตรวจสอบ',
    url: '/landlord/penalties',
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
      type: 'maintenance_raised', // closest existing type for general contract events
      titleEn: 'Contract Paired Successfully',
      titleTh: 'จับคู่สัญญาเรียบร้อยแล้ว',
      bodyEn: 'You have been linked to your rental contract.',
      bodyTh: 'คุณถูกเชื่อมต่อกับสัญญาเช่าของคุณแล้ว',
      url: '/tenant/contracts',
    });
  }

  // Notify the landlord
  if (parties.landlord_id) {
    await sendNotification({
      recipientId: parties.landlord_id,
      type: 'maintenance_raised', // closest existing type for general contract events
      titleEn: 'Tenant Paired to Contract',
      titleTh: 'ผู้เช่าจับคู่สัญญาแล้ว',
      bodyEn: 'A tenant has been paired to one of your contracts.',
      bodyTh: 'ผู้เช่าถูกจับคู่กับสัญญาเช่าหนึ่งของคุณ',
      url: '/landlord/contracts',
    });
  }
}
