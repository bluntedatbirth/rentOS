'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n/context';
import type { StatCards, ActivityItem, UpcomingPaymentItem } from './page';
import { DevToolsPanel } from '@/components/dev/DevToolsPanel';

// ── Icon helpers ──────────────────────────────────────────────────────────────

function PaymentIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-5 w-5"
    >
      <path
        fillRule="evenodd"
        d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 1a1 1 0 100 2 1 1 0 000-2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function MaintenanceIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-5 w-5"
    >
      <path
        fillRule="evenodd"
        d="M14.5 10a4.5 4.5 0 004.284-5.882c-.105-.324-.51-.391-.752-.15L15.34 6.66a.454.454 0 01-.493.101 3.046 3.046 0 01-1.608-1.607.454.454 0 01.1-.493l2.693-2.692c.24-.241.174-.647-.15-.752a4.5 4.5 0 00-5.873 4.575c.055.873-.128 1.808-.8 2.368l-7.23 6.024a2.724 2.724 0 103.837 3.837l6.024-7.23c.56-.672 1.495-.855 2.368-.8.096.007.193.01.291.01zM5 16a1 1 0 11-2 0 1 1 0 012 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ContractIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-5 w-5"
    >
      <path
        fillRule="evenodd"
        d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ActivityIcon({
  type,
  color,
  bg,
}: {
  type: 'payment' | 'maintenance' | 'contract';
  color: string;
  bg: string;
}) {
  return (
    <span
      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${bg} ${color}`}
    >
      {type === 'payment' && <PaymentIcon />}
      {type === 'maintenance' && <MaintenanceIcon />}
      {type === 'contract' && <ContractIcon />}
    </span>
  );
}

const ICON_STYLES: Record<'payment' | 'maintenance' | 'contract', { color: string; bg: string }> = {
  payment: { color: 'text-green-600', bg: 'bg-green-100' },
  maintenance: { color: 'text-amber-600', bg: 'bg-amber-100' },
  contract: { color: 'text-saffron-600', bg: 'bg-saffron-100' },
};

// ── Relative-time helper ──────────────────────────────────────────────────────

function relativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
}

// ── Short date helper (e.g. "Apr 11") ────────────────────────────────────────

function shortDate(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Currency formatter ────────────────────────────────────────────────────────

function formatBaht(amount: number): string {
  return `฿${amount.toLocaleString('en-US')}`;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface DashboardClientProps {
  fullName: string | null;
  stats: StatCards;
  activity: ActivityItem[];
  upcomingPayments: UpcomingPaymentItem[];
  renewalsNearingExpiry?: number;
  showDevTools?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DashboardClient({
  fullName,
  stats,
  activity,
  upcomingPayments,
  renewalsNearingExpiry = 0,
  showDevTools = false,
}: DashboardClientProps) {
  const { t } = useI18n();

  // FEAT-1: revenue card shows "collected / expected" when expected > 0
  const revenueValue =
    stats.expectedRevenue > 0
      ? `${formatBaht(stats.monthlyRevenue)} / ${formatBaht(stats.expectedRevenue)}`
      : formatBaht(stats.monthlyRevenue);

  const statCards = [
    {
      label: t('dashboard.v2_monthly_revenue'),
      value: revenueValue,
      sub: t('dashboard.v2_n_properties').replace('{n}', String(stats.propertyCount)),
      color: 'text-saffron-600',
      href: '/landlord/analytics',
    },
    {
      label: t('dashboard.v2_payments_due'),
      value: String(stats.paymentsDueCount),
      sub: t('dashboard.v2_next_7_days'),
      color: 'text-amber-500',
      href: '/landlord/payments',
    },
    {
      label: t('dashboard.v2_open_maintenance'),
      value: String(stats.openMaintenanceCount),
      sub: t('dashboard.v2_requests'),
      color: 'text-red-600',
      href: '/landlord/maintenance',
    },
    {
      label: t('dashboard.v2_vacancies'),
      value: String(stats.vacancyCount),
      sub: t('dashboard.v2_of_n_units').replace('{n}', String(stats.totalPropertyCount)),
      color: 'text-gray-900',
      href: '/landlord/properties',
    },
  ];

  return (
    <div className="min-h-screen bg-warm-50 px-4 py-6">
      <div className="mx-auto max-w-3xl">
        {/* Page heading */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-charcoal-900">{t('dashboard.landlord_title')}</h1>
          <p className="text-sm text-charcoal-500">
            {t('dashboard.welcome')}, {fullName ?? ''}
          </p>
        </div>

        {/* FEAT-2: Renewals banner — shown only when N > 0 */}
        {renewalsNearingExpiry > 0 && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-saffron-300 bg-warm-100 px-4 py-3">
            <p className="text-sm font-medium text-charcoal-800">
              {renewalsNearingExpiry === 1
                ? t('dashboard.renewals_banner_one')
                : t('dashboard.renewals_banner_other').replace(
                    '{n}',
                    String(renewalsNearingExpiry)
                  )}
            </p>
            <Link
              href="/landlord/contracts?filter=expiring"
              className="ml-4 shrink-0 rounded-md bg-saffron-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-saffron-600 focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:ring-offset-1"
            >
              {t('dashboard.review_renewals')}
            </Link>
          </div>
        )}

        {/* Stat cards — 2×2 mobile, 4-across desktop. Each card is a link to its
            matching details page (revenue→analytics, due→payments, etc.). */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {statCards.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              className="block rounded-lg border border-warm-200 bg-warm-50 p-4 shadow-sm transition-shadow hover:shadow-md hover:border-saffron-300 focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:ring-offset-1"
            >
              <p className="mb-1 text-xs text-charcoal-500">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="mt-0.5 text-xs text-charcoal-500">{s.sub}</p>
            </Link>
          ))}
        </div>

        {/* Two-column: Recent Activity + Upcoming Payments */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Recent Activity */}
          <div className="rounded-lg bg-warm-50 border border-warm-200 shadow-sm transition-shadow hover:shadow-md">
            <div className="border-b border-warm-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-charcoal-900">
                {t('dashboard.v2_recent_activity')}
              </h2>
            </div>
            <ul className="divide-y divide-warm-100 px-2 py-1">
              {activity.length === 0 ? (
                <li className="py-4 text-center text-sm text-charcoal-500">
                  {t('dashboard.v2_no_recent_activity')}
                </li>
              ) : (
                activity.map((item) => {
                  const style = ICON_STYLES[item.type];
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        className="-mx-2 flex items-start gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-warm-100 focus:bg-warm-100 focus:outline-none focus:ring-2 focus:ring-saffron-500"
                      >
                        <ActivityIcon type={item.type} color={style.color} bg={style.bg} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm leading-snug text-charcoal-700">{item.text}</p>
                          <p className="mt-0.5 text-xs text-charcoal-500">
                            {relativeTime(item.timestamp)}
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })
              )}
            </ul>
          </div>

          {/* Upcoming Payments */}
          <div className="rounded-lg bg-warm-50 border border-warm-200 shadow-sm transition-shadow hover:shadow-md">
            <div className="border-b border-warm-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-charcoal-900">
                {t('dashboard.v2_upcoming_payments')}
              </h2>
            </div>
            <ul className="divide-y divide-warm-100 px-2 py-1">
              {upcomingPayments.length === 0 ? (
                <li className="py-4 text-center text-sm text-charcoal-500">
                  {t('dashboard.v2_no_upcoming_payments')}
                </li>
              ) : (
                upcomingPayments.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={p.href}
                      className="-mx-2 flex items-center justify-between gap-2 rounded-md px-2 py-2.5 transition-colors hover:bg-warm-100 focus:bg-warm-100 focus:outline-none focus:ring-2 focus:ring-saffron-500"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-charcoal-800">
                          {p.tenantName}
                        </p>
                        <p className="truncate text-xs text-charcoal-500">{p.propertyName}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-sm font-semibold text-charcoal-900">
                          {formatBaht(p.amount)}
                        </span>
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          {shortDate(p.dueDate)}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
      {showDevTools && <DevToolsPanel />}
    </div>
  );
}
