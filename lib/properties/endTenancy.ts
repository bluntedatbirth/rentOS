import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { generatePairCode } from '@/lib/pairing/code';
import { sendNotification } from '@/lib/notifications/send';

export interface EndTenancyResult {
  success: boolean;
  newPairCode: string;
  formerTenantId: string | null;
}

/**
 * Shared helper: ends a tenancy for the given property.
 * Idempotent — if the property has no current tenant, returns early with success.
 *
 * Called by:
 *  - Manual "End Tenancy" API route (landlord-initiated)
 *  - Daily cron job (auto-expiry)
 *
 * @param supabase  Admin client with service_role access
 * @param propertyId  The property to unpair
 * @param options.skipNotifications  Skip sending in-app notifications (e.g. bulk cron runs)
 */
export async function endTenancy(
  supabase: SupabaseClient<Database>,
  propertyId: string,
  options?: { skipNotifications?: boolean }
): Promise<EndTenancyResult> {
  // 1. Fetch the property row
  const { data: propertyRaw, error: fetchError } = await supabase
    .from('properties')
    .select('id, current_tenant_id, landlord_id, name, previous_tenant_count')
    .eq('id', propertyId)
    .single();

  if (fetchError || !propertyRaw) {
    throw new Error(`[endTenancy] Property not found: ${fetchError?.message ?? 'unknown'}`);
  }

  const property = propertyRaw as unknown as {
    id: string;
    current_tenant_id: string | null;
    landlord_id: string;
    name: string;
    previous_tenant_count: number | null;
  };

  // 2. Idempotency guard — already unpaired
  if (!property.current_tenant_id) {
    // Return a stable empty-string for newPairCode so callers know it wasn't rotated
    return { success: true, newPairCode: '', formerTenantId: null };
  }

  const formerTenantId = property.current_tenant_id;
  const previousCount = property.previous_tenant_count ?? 0;

  // 3. Generate a fresh pair code
  const newPairCode = generatePairCode();

  // 4. Atomic property update
  const gracePeriodEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const { error: updateError } = await supabase
    .from('properties')
    .update({
      current_tenant_id: null,
      lease_start: null,
      lease_end: null,
      last_tenant_id: formerTenantId,
      previous_tenant_count: previousCount + 1,
      pair_code: newPairCode,
      pair_code_rotated_at: new Date().toISOString(),
      grace_period_ends_at: gracePeriodEndsAt,
    } as Record<string, unknown>)
    .eq('id', propertyId);

  if (updateError) {
    throw new Error(`[endTenancy] Failed to update property: ${updateError.message}`);
  }

  // 5. Notifications (non-blocking — failures are logged, not thrown)
  if (!options?.skipNotifications) {
    const propertyName = property.name;

    // Notify landlord
    try {
      await sendNotification({
        recipientId: property.landlord_id,
        type: 'lease_ended',
        titleEn: 'Lease ended',
        titleTh: 'สัญญาเช่าสิ้นสุดแล้ว',
        bodyEn: `Lease ended for ${propertyName}.`,
        bodyTh: `สัญญาเช่าของ ${propertyName} สิ้นสุดแล้ว`,
        url: '/landlord/properties',
        payload: {
          target_route: 'properties.detail',
          target_id: propertyId,
        },
      });
    } catch (err) {
      console.error('[endTenancy] Landlord notification failed (non-blocking):', err);
    }

    // Notify former tenant
    try {
      await sendNotification({
        recipientId: formerTenantId,
        type: 'lease_ended',
        titleEn: 'Your lease has ended',
        titleTh: 'สัญญาเช่าของคุณสิ้นสุดแล้ว',
        bodyEn: `Your lease at ${propertyName} has ended. You have 2 weeks to view your rental history.`,
        bodyTh: `สัญญาเช่าของคุณที่ ${propertyName} สิ้นสุดแล้ว คุณมีเวลา 2 สัปดาห์เพื่อดูประวัติการเช่าของคุณ`,
        url: '/tenant/dashboard',
        payload: {
          target_route: 'dashboard',
          fallback_route: 'dashboard',
        },
      });
    } catch (err) {
      console.error('[endTenancy] Tenant notification failed (non-blocking):', err);
    }
  }

  return { success: true, newPairCode, formerTenantId };
}
