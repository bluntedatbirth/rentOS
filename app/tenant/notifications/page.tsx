'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

interface Notification {
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  body: string;
  title_en: string | null;
  title_th: string | null;
  body_en: string | null;
  body_th: string | null;
  url: string | null;
  sent_at: string;
  read_at: string | null;
}

/** Fallback routes when a notification has no stored URL */
const TYPE_ROUTES_TENANT: Record<string, string> = {
  payment_due: '/tenant/payments',
  payment_overdue: '/tenant/payments',
  lease_expiry: '/tenant/contract/view',
  penalty_raised: '/tenant/penalties/appeal',
  penalty_appeal: '/tenant/penalties/appeal',
  penalty_resolved: '/tenant/penalties/appeal',
  maintenance_raised: '/tenant/maintenance',
  maintenance_updated: '/tenant/maintenance',
  lease_renewal_offer: '/tenant/contract/view',
  lease_renewal_response: '/tenant/contract/view',
};

const DASHBOARD = '/tenant/dashboard';

const TYPE_ICONS: Record<string, string> = {
  payment_due: '\u{1F4B3}',
  payment_overdue: '\u{1F6A8}',
  lease_expiry: '\u{1F4C5}',
  penalty_raised: '\u{26A0}\uFE0F',
  penalty_appeal: '\u{1F4DD}',
  penalty_resolved: '\u{2705}',
  maintenance_raised: '\u{1F527}',
  maintenance_updated: '\u{1F504}',
  lease_renewal_offer: '\u{1F4E8}',
  lease_renewal_response: '\u{1F4E9}',
};

function timeAgo(dateStr: string, t: (key: string) => string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return t('notifications.just_now');
  if (diffMins < 60) return t('notifications.time_ago_minutes').replace('{}', String(diffMins));
  if (diffHours < 24) return t('notifications.time_ago_hours').replace('{}', String(diffHours));
  return t('notifications.time_ago_days').replace('{}', String(diffDays));
}

/** Resolve the destination URL for a notification, adding role prefix if needed */
function resolveUrl(notification: Notification): string {
  const url = notification.url;
  if (url) {
    if (url.startsWith('/contracts/')) return '/tenant' + url;
    return url;
  }
  return TYPE_ROUTES_TENANT[notification.type] ?? DASHBOARD;
}

export default function TenantNotificationsPage() {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    const res = await fetch('/api/notifications');
    if (res.ok) {
      const data = await res.json();
      setNotifications(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
  }, [user, fetchNotifications]);

  /** Dismiss a single notification (delete it) and remove from UI */
  const dismiss = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await fetch(`/api/notifications/${id}/dismiss`, { method: 'DELETE' });
  };

  /** Dismiss all notifications */
  const dismissAll = async () => {
    setNotifications([]);
    await fetch('/api/notifications/dismiss-all', { method: 'DELETE' });
  };

  /** Handle clicking a notification: dismiss it, then navigate */
  const handleClick = async (notification: Notification) => {
    // Dismiss immediately (optimistic)
    setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
    fetch(`/api/notifications/${notification.id}/dismiss`, { method: 'DELETE' });

    // Navigate to destination, falling back to dashboard if no valid route
    const dest = resolveUrl(notification);
    router.push(dest);
  };

  if (loading) return <LoadingSkeleton count={5} />;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{t('notifications.inbox_title')}</h2>
        {notifications.length > 0 && (
          <button
            type="button"
            onClick={dismissAll}
            className="min-h-[44px] rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            {t('notifications.clear_all')}
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-gray-500">{t('notifications.no_notifications')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`flex items-center gap-0 rounded-lg bg-white shadow-sm transition-colors hover:bg-gray-50 ${
                !notification.read_at ? 'border-l-4 border-blue-500' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => handleClick(notification)}
                className="min-h-[44px] flex-1 p-4 text-left"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-lg" role="img" aria-label={notification.type}>
                    {TYPE_ICONS[notification.type] || '\u{1F514}'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className={`text-sm ${!notification.read_at ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}
                      >
                        {locale === 'en'
                          ? (notification.title_en ?? notification.title)
                          : (notification.title_th ?? notification.title)}
                      </p>
                      {!notification.read_at && (
                        <span className="inline-block h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-gray-500 line-clamp-2">
                      {locale === 'en'
                        ? (notification.body_en ?? notification.body)
                        : (notification.body_th ?? notification.body)}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">{timeAgo(notification.sent_at, t)}</p>
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-4 w-4 shrink-0 text-gray-300"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </button>
              {/* Dismiss button (X) — dismiss without navigating */}
              <button
                type="button"
                onClick={() => dismiss(notification.id)}
                className="mr-2 shrink-0 rounded-lg p-2 text-gray-300 hover:bg-gray-100 hover:text-gray-500"
                title={t('notifications.dismiss')}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4"
                >
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 text-center">
        <Link
          href="/tenant/notifications/settings"
          className="text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          {t('notifications.go_to_settings')}
        </Link>
      </div>
    </div>
  );
}
