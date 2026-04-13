'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { resolveNotification } from '@/lib/notifications/resolve';
import { NOTIFICATION_MODE } from '@/lib/notifications/mode';

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

const TYPE_ICONS: Record<string, string> = {
  payment_due: '\u{1F4B3}',
  payment_overdue: '\u{1F6A8}',
  payment_claimed: '\u{1F4B0}',
  lease_expiry: '\u{1F4C5}',
  penalty_raised: '\u{26A0}\uFE0F',
  penalty_appeal: '\u{1F4DD}',
  penalty_resolved: '\u{2705}',
  maintenance_raised: '\u{1F527}',
  maintenance_updated: '\u{1F504}',
  lease_renewal_offer: '\u{1F4E8}',
  lease_renewal_response: '\u{1F4E9}',
  renewal_signing_reminder: '\u{270D}\uFE0F',
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

    const notificationMode = NOTIFICATION_MODE[notification.type];
    const currentRole = 'tenant';
    if (notificationMode && notificationMode !== currentRole) {
      await fetch('/api/account/mode', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active_mode: notificationMode }),
      });
      sessionStorage.setItem('rentos_mode_switch', notificationMode);
      const dest = resolveNotification(notification, notificationMode);
      window.location.href = dest;
    } else {
      const dest = resolveNotification(notification, currentRole);
      router.push(dest);
    }
  };

  if (loading) return <LoadingSkeleton count={5} />;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-charcoal-900 dark:text-white">
          {t('notifications.inbox_title')}
        </h2>
        {notifications.length > 0 && (
          <button
            type="button"
            onClick={dismissAll}
            className="min-h-[44px] rounded-lg border border-warm-200 dark:border-white/10 px-4 py-2 text-sm font-medium text-charcoal-700 dark:text-white/70 hover:bg-warm-100 dark:hover:bg-white/5"
          >
            {t('notifications.clear_all')}
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-lg bg-white dark:bg-charcoal-800 p-8 text-center shadow-sm">
          <p className="text-sm text-charcoal-500 dark:text-white/50">
            {t('notifications.no_notifications')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`flex items-center gap-0 rounded-lg bg-white dark:bg-charcoal-800 shadow-sm transition-colors hover:bg-warm-50 dark:hover:bg-white/5 ${
                !notification.read_at ? 'border-l-4 border-saffron-500' : ''
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
                        className={`text-sm ${!notification.read_at ? 'font-semibold text-charcoal-900 dark:text-white' : 'font-medium text-charcoal-700 dark:text-white/70'}`}
                      >
                        {locale === 'en'
                          ? (notification.title_en ?? notification.title)
                          : (notification.title_th ?? notification.title)}
                      </p>
                      {!notification.read_at && (
                        <span className="inline-block h-2 w-2 flex-shrink-0 rounded-full bg-saffron-500" />
                      )}
                      {NOTIFICATION_MODE[notification.type] &&
                        NOTIFICATION_MODE[notification.type] !== 'tenant' && (
                          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-saffron-100 text-saffron-700 shrink-0">
                            {t('notifications.mode_landlord')}
                          </span>
                        )}
                    </div>
                    <p className="mt-0.5 text-sm text-charcoal-500 dark:text-white/50 line-clamp-2">
                      {locale === 'en'
                        ? (notification.body_en ?? notification.body)
                        : (notification.body_th ?? notification.body)}
                    </p>
                    <p className="mt-1 text-xs text-charcoal-400 dark:text-white/40">
                      {timeAgo(notification.sent_at, t)}
                    </p>
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-4 w-4 shrink-0 text-charcoal-300 dark:text-white/30"
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
                className="mr-2 shrink-0 rounded-lg p-2 text-charcoal-300 dark:text-white/30 hover:bg-warm-100 dark:hover:bg-white/5 hover:text-charcoal-500 dark:hover:text-white/50"
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
          className="text-sm font-medium text-saffron-600 hover:text-saffron-700"
        >
          {t('notifications.go_to_settings')}
        </Link>
      </div>
    </div>
  );
}
