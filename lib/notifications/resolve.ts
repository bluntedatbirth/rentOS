import { type NotificationPayload } from './payload';
import { resolveRoute } from './routes';

type Role = 'tenant' | 'landlord';

const ROLE_DASHBOARD: Record<Role, string> = {
  tenant: '/tenant/dashboard',
  landlord: '/landlord/properties',
};

/**
 * Resolve the destination URL for a notification at click time.
 *
 * Resolution order:
 * 1. `payload.target_route` → `resolveRoute` (honours feature flags)
 * 2. `payload.fallback_route` → `resolveRoute` (when step 1 returns null)
 * 3. `notification.url`      (raw URL stored on the notification row)
 * 4. Role dashboard           (guaranteed non-null final fallback)
 *
 * The `notification.url` safety check (must start with `/`, must not start
 * with `//`) mirrors the existing guard in NotificationBell and the tenant
 * notifications page so behaviour is consistent across surfaces.
 */
export function resolveNotification(
  notification: { payload?: NotificationPayload | null; url?: string | null },
  role: Role
): string {
  const { payload } = notification;

  if (payload) {
    // Step 1 — primary route key
    const primary = resolveRoute(payload.target_route, role, payload.target_id);
    if (primary !== null) return primary;

    // Step 2 — fallback route key (used when primary is feature-gated off)
    if (payload.fallback_route) {
      const fallback = resolveRoute(payload.fallback_route, role, payload.target_id);
      if (fallback !== null) return fallback;
    }
  }

  // Step 3 — raw URL stored on the notification row
  const url = notification.url;
  if (url && typeof url === 'string' && url.startsWith('/') && !url.startsWith('//')) {
    return url;
  }

  // Step 4 — role dashboard (guaranteed fallback)
  return ROLE_DASHBOARD[role];
}
