import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendPushNotification } from './fcm';
import type { NotificationPayload } from './payload';

/** Notification types matching the DB CHECK constraint */
export type NotificationType =
  | 'payment_due'
  | 'payment_overdue'
  | 'payment_claimed'
  | 'lease_expiry'
  | 'penalty_raised'
  | 'penalty_appeal'
  | 'penalty_resolved'
  | 'maintenance_raised'
  | 'maintenance_updated'
  | 'tier_expiry_warning'
  | 'tier_downgraded'
  | 'lease_renewal_offer'
  | 'lease_renewal_response'
  | 'renewal_signing_reminder'
  | 'pairing_confirmed'
  | 'lease_ended'
  | 'custom';

export interface SendNotificationParams {
  recipientId: string;
  type: NotificationType;
  titleEn: string;
  titleTh: string;
  bodyEn: string;
  bodyTh: string;
  /** Optional URL for push notification click-through */
  url?: string;
  /** Structured routing payload for deep-link navigation */
  payload?: NotificationPayload;
}

/**
 * Send an in-app notification (and optionally a push notification) to a user.
 *
 * 1. Looks up recipient language and notification preferences
 * 2. Checks if this notification type is enabled (defaults to true)
 * 3. Inserts into the notifications table with the localized text
 * 4. If recipient has an fcm_token, attempts to send a push notification
 */
export async function sendNotification(params: SendNotificationParams): Promise<void> {
  const { recipientId, type, titleEn, titleTh, bodyEn, bodyTh, url } = params;
  const supabase = createServiceRoleClient();

  // 1. Look up recipient profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('language, fcm_token, notification_preferences')
    .eq('id', recipientId)
    .single();

  if (profileError || !profile) {
    console.error('[Notifications] Could not find profile for recipient:', recipientId);
    return;
  }

  // 2. Check notification preferences
  const prefs = (profile.notification_preferences ?? {}) as Record<string, boolean>;
  const isEnabled = prefs[type] !== false; // default to true if not explicitly disabled

  if (!isEnabled) {
    return;
  }

  // 3. Pick localized text for push notification
  const lang = profile.language ?? 'th';
  const title = lang === 'en' ? titleEn : titleTh;
  const body = lang === 'en' ? bodyEn : bodyTh;

  // 4. Insert in-app notification — store both languages so the UI can display
  //    in the user's current locale, not just the send-time language
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const insertPayload: Record<string, any> = {
    recipient_id: recipientId,
    type,
    title,
    body,
    title_en: titleEn,
    title_th: titleTh,
    body_en: bodyEn,
    body_th: bodyTh,
  };
  if (url) insertPayload.url = url;
  insertPayload.payload = params.payload ?? null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let { error: insertError } = await supabase.from('notifications').insert(insertPayload as any);

  // If insert fails (e.g. url column not yet migrated), retry without optional columns
  if (insertError) {
    console.error(
      '[Notifications] Insert failed, retrying without optional columns:',
      insertError.message
    );
    delete insertPayload.url;
    delete insertPayload.payload;
    delete insertPayload.title_en;
    delete insertPayload.title_th;
    delete insertPayload.body_en;
    delete insertPayload.body_th;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const retry = await supabase.from('notifications').insert(insertPayload as any);
    insertError = retry.error;
    if (insertError) {
      console.error('[Notifications] Retry also failed:', insertError.message);
    }
  }

  // 5. Send push notification if token exists
  if (profile.fcm_token) {
    try {
      await sendPushNotification(profile.fcm_token, title, body, url ? { url } : undefined);
    } catch (err) {
      console.error('[Notifications] FCM push failed (non-blocking):', err);
    }
  }
}
