'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';
import { resolveNotification } from '@/lib/notifications/resolve';
import { NOTIFICATION_MODE } from '@/lib/notifications/mode';

interface NotificationBellProps {
  /** Role determines which set of fallback routes to use and which /notifications/inbox page the "view all" link points at */
  role: 'landlord' | 'tenant';
}

interface Notification {
  id: string;
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

export function NotificationBell({ role }: NotificationBellProps) {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const fetchCount = useCallback(async () => {
    if (document.visibilityState !== 'visible') return;
    try {
      const res = await fetch('/api/notifications/count');
      if (res.ok) {
        const data = await res.json();
        setCount(data.count ?? 0);
      }
    } catch {
      // Silently fail
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = (await res.json()) as Notification[];
        setNotifications(data);
      }
    } catch {
      // Silently fail
    } finally {
      setLoadingList(false);
    }
  }, []);

  // Poll unread count every 2 minutes + on visibility change
  useEffect(() => {
    if (!user) return;
    fetchCount();
    const interval = setInterval(fetchCount, 120000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchCount();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, fetchCount]);

  // Load the full list lazily on open
  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  // Close on outside click / ESC
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const dismiss = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setCount((c) => Math.max(0, c - 1));
    await fetch(`/api/notifications/${id}/dismiss`, { method: 'DELETE' });
  };

  const dismissAll = async () => {
    setNotifications([]);
    setCount(0);
    await fetch('/api/notifications/dismiss-all', { method: 'DELETE' });
  };

  const handleClick = async (notification: Notification) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
    setCount((c) => Math.max(0, c - 1));
    void fetch(`/api/notifications/${notification.id}/dismiss`, { method: 'DELETE' });

    const notificationMode = NOTIFICATION_MODE[notification.type];
    if (notificationMode && notificationMode !== role) {
      // Cross-mode: switch mode first, then full-page navigate
      await fetch('/api/account/mode', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active_mode: notificationMode }),
      });
      sessionStorage.setItem('rentos_mode_switch', notificationMode);
      const dest = resolveNotification(notification, notificationMode);
      setOpen(false);
      window.location.href = dest;
    } else {
      // Same mode: normal SPA navigation
      const dest = resolveNotification(notification, role);
      setOpen(false);
      router.push(dest);
    }
  };

  const inboxHref =
    role === 'landlord' ? '/landlord/notifications/inbox' : '/tenant/notifications/inbox';

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-warm-200 text-charcoal-600 hover:text-charcoal-900 hover:bg-warm-100"
        aria-label={t('nav.notifications')}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-5 w-5"
        >
          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
        </svg>
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t('notifications.inbox_title')}
          className="absolute right-0 top-full z-50 mt-2 flex max-h-[70vh] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-warm-200 bg-warm-50 shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-warm-200 bg-warm-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-charcoal-900">
              {t('notifications.inbox_title')}
            </h3>
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={dismissAll}
                className="rounded-md px-2 py-1 text-xs font-medium text-charcoal-600 hover:bg-warm-200 hover:text-charcoal-900"
              >
                {t('notifications.clear_all')}
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingList && <p className="px-4 py-8 text-center text-sm text-gray-500">...</p>}

            {!loadingList && notifications.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-gray-500">
                {t('notifications.no_notifications')}
              </p>
            )}

            {!loadingList &&
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-0 border-b border-warm-100 last:border-b-0 transition-colors hover:bg-warm-100 ${
                    !notification.read_at ? 'bg-saffron-50/40' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleClick(notification)}
                    className="min-w-0 flex-1 p-3 text-left"
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className="mt-0.5 text-base shrink-0"
                        role="img"
                        aria-label={notification.type}
                      >
                        {TYPE_ICONS[notification.type] || '\u{1F514}'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p
                            className={`truncate text-sm ${
                              !notification.read_at
                                ? 'font-semibold text-gray-900'
                                : 'font-medium text-gray-700'
                            }`}
                          >
                            {locale === 'en'
                              ? (notification.title_en ?? notification.title)
                              : (notification.title_th ?? notification.title)}
                          </p>
                          {!notification.read_at && (
                            <span className="inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-saffron-500" />
                          )}
                          {NOTIFICATION_MODE[notification.type] &&
                            NOTIFICATION_MODE[notification.type] !== role &&
                            (NOTIFICATION_MODE[notification.type] === 'landlord' ? (
                              <span className="inline-flex items-center rounded px-1 py-0.5 text-[9px] font-medium bg-saffron-100 text-saffron-700 shrink-0">
                                {t('notifications.mode_landlord')}
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded px-1 py-0.5 text-[9px] font-medium bg-teal-100 text-teal-700 shrink-0">
                                {t('notifications.mode_tenant')}
                              </span>
                            ))}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">
                          {locale === 'en'
                            ? (notification.body_en ?? notification.body)
                            : (notification.body_th ?? notification.body)}
                        </p>
                        <p className="mt-1 text-[10px] text-gray-400">
                          {timeAgo(notification.sent_at, t)}
                        </p>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => dismiss(notification.id)}
                    className="mr-1 mt-2 shrink-0 rounded-md p-1.5 text-gray-300 hover:bg-gray-100 hover:text-gray-500"
                    title={t('notifications.dismiss')}
                    aria-label={t('notifications.dismiss')}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-3.5 w-3.5"
                    >
                      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                  </button>
                </div>
              ))}
          </div>

          <div className="border-t border-warm-200 bg-warm-100 px-4 py-2 text-center">
            <Link
              href={inboxHref}
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-saffron-600 hover:text-saffron-700"
            >
              {t('nav.notifications')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
