/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// TODO: DELETE during scale-back cleanup (see SIMPLIFICATION_PROGRESS.md). This route is dead code from the cut feature set.
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requirePro } from '@/lib/tier';
import { sendNotification } from '@/lib/notifications/send';

const bulkNotificationSchema = z.object({
  recipient_ids: z.array(z.string().uuid()).min(1).max(200),
  title_en: z.string().min(1).max(200),
  title_th: z.string().min(1).max(200),
  body_en: z.string().min(1).max(2000),
  body_th: z.string().min(1).max(2000),
  url: z.string().optional(),
});

export async function POST(request: Request) {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  // Check pro tier
  const adminClient = createServiceRoleClient();
  const { data: profile } = await adminClient
    .from('profiles')
    .select('tier, role, tier_expires_at')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'landlord') {
    return unauthorized();
  }

  const tierCheck = requirePro(profile.tier, 'bulk_actions', profile.tier_expires_at);
  if (!tierCheck.allowed) {
    return NextResponse.json(tierCheck, { status: 403 });
  }

  const body: unknown = await request.json();
  const parsed = bulkNotificationSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const { recipient_ids, title_en, title_th, body_en, body_th, url } = parsed.data;

  // Verify all recipients are tenants in landlord's contracts to prevent spam
  const { data: contracts, error: contractsError } = await adminClient
    .from('contracts')
    .select('tenant_id')
    .eq('landlord_id', user.id)
    .in('tenant_id', recipient_ids);

  if (contractsError) {
    return serverError(contractsError.message);
  }

  const allowedTenantIds = new Set(
    (contracts ?? []).map((c) => c.tenant_id).filter(Boolean) as string[]
  );

  const verifiedIds = recipient_ids.filter((id) => allowedTenantIds.has(id));

  if (verifiedIds.length === 0) {
    return badRequest('No matching tenants found in your contracts');
  }

  let sent = 0;
  const errors: string[] = [];

  for (const recipientId of verifiedIds) {
    try {
      await sendNotification({
        recipientId,
        type: 'custom',
        titleEn: title_en,
        titleTh: title_th,
        bodyEn: body_en,
        bodyTh: body_th,
        url,
      });
      sent++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${recipientId}: ${msg}`);
    }
  }

  return NextResponse.json({ sent, errors: errors.length > 0 ? errors : undefined });
}
