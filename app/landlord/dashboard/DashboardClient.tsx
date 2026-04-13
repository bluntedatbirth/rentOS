'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n/context';
import { DevToolsPanel } from '@/components/dev/DevToolsPanel';

// ── Types (kept here since dashboard/page.tsx now only redirects) ─────────────

export interface DashboardACards {
  activePropertyCount: number;
  activePropertyNames: string[];
  unpaidRentCount: number;
  unpaidRentTotal: number;
  contractsExpiring30Days: number;
}

// ── Currency formatter ────────────────────────────────────────────────────────

function formatBaht(amount: number): string {
  return `฿${amount.toLocaleString('en-US')}`;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface DashboardClientProps {
  fullName: string | null;
  dashboardA: DashboardACards;
  renewalsNearingExpiry?: number;
  showDevTools?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DashboardClient({
  fullName,
  dashboardA,
  renewalsNearingExpiry = 0,
  showDevTools = false,
}: DashboardClientProps) {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-warm-50 dark:bg-charcoal-900 px-4 py-6">
      <div className="mx-auto max-w-3xl">
        {/* Page heading */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-charcoal-900 dark:text-white">
            {t('dashboard.landlord_title')}
          </h1>
          <p className="text-sm text-charcoal-500 dark:text-white/50">
            {t('dashboard.welcome')}, {fullName ?? ''}
          </p>
        </div>

        {/* Renewals banner — shown only when N > 0 (preserved from previous layout) */}
        {renewalsNearingExpiry > 0 && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-saffron-300 bg-warm-100 dark:bg-white/5 px-4 py-3">
            <p className="text-sm font-medium text-charcoal-800 dark:text-white/90">
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

        {/* Dashboard A — three equal cards
            Mobile: flex-col stack; Desktop: 3-col grid */}
        <div className="mb-6 flex flex-col gap-6 md:grid md:grid-cols-3 md:gap-6">
          {/* Card 1: Active Properties */}
          <div className="rounded-2xl border border-warm-200 dark:border-white/10 bg-white dark:bg-charcoal-800 p-6 shadow-sm">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-charcoal-500 dark:text-white/50">
              {t('dashboard.card_active_properties')}
            </p>
            <p className="text-3xl font-bold text-charcoal-900 dark:text-white">
              {dashboardA.activePropertyCount}
            </p>
            <p className="mt-1 text-sm text-charcoal-500 dark:text-white/50">
              {t('dashboard.card_active_properties_sub')}
            </p>
            {dashboardA.activePropertyNames.length > 0 && (
              <ul className="mt-3 space-y-0.5">
                {dashboardA.activePropertyNames.map((name) => (
                  <li key={name} className="truncate text-xs text-charcoal-500 dark:text-white/50">
                    {name}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 text-right">
              <Link
                href="/landlord/properties"
                className="text-sm font-semibold text-saffron-600 hover:text-saffron-700"
              >
                View all →
              </Link>
            </div>
          </div>

          {/* Card 2: Unpaid Rent */}
          <div className="rounded-2xl border border-warm-200 dark:border-white/10 bg-white dark:bg-charcoal-800 p-6 shadow-sm">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-charcoal-500 dark:text-white/50">
              {t('dashboard.card_unpaid_rent')}
            </p>
            <p className="text-3xl font-bold text-saffron-600">{dashboardA.unpaidRentCount}</p>
            <p className="mt-1 text-sm text-charcoal-500 dark:text-white/50">
              {t('dashboard.card_unpaid_rent_sub').replace(
                '{count}',
                String(dashboardA.unpaidRentCount)
              )}
            </p>
            {dashboardA.unpaidRentTotal > 0 && (
              <p className="mt-1 text-sm font-medium text-charcoal-700 dark:text-white/70">
                {formatBaht(dashboardA.unpaidRentTotal)} outstanding
              </p>
            )}
            <div className="mt-3 text-right">
              <Link
                href="/landlord/payments"
                className="text-sm font-semibold text-saffron-600 hover:text-saffron-700"
              >
                {t('dashboard.card_unpaid_rent_action')} →
              </Link>
            </div>
          </div>

          {/* Card 3: Contracts Expiring */}
          <div className="rounded-2xl border border-warm-200 dark:border-white/10 bg-white dark:bg-charcoal-800 p-6 shadow-sm">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-charcoal-500 dark:text-white/50">
              {t('dashboard.card_contracts_expiring')}
            </p>
            <p className="text-3xl font-bold text-sage-500">{dashboardA.contractsExpiring30Days}</p>
            <p className="mt-1 text-sm text-charcoal-500 dark:text-white/50">
              {t('dashboard.card_contracts_expiring_sub')}
            </p>
            <div className="mt-3 text-right">
              <Link
                href="/landlord/contracts"
                className="text-sm font-semibold text-saffron-600 hover:text-saffron-700"
              >
                {t('dashboard.card_contracts_expiring_action')} →
              </Link>
            </div>
          </div>
        </div>
      </div>
      {showDevTools && <DevToolsPanel />}
    </div>
  );
}
