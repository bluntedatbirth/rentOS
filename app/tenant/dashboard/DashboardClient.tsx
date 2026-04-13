'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n/context';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDisplayDate } from '@/lib/format/date';
import type { ShellProperty } from './page';

interface ContractSummary {
  id: string;
  status: string;
  lease_start: string | null;
  lease_end: string | null;
  monthly_rent: number | null;
  property_id: string;
  properties: { name: string; daily_rate: number | null } | null;
}

interface NextPaymentSummary {
  id: string;
  amount: number;
  due_date: string;
  status: string;
  contract_id: string;
}

interface TenantDashboardClientProps {
  fullName: string | null;
  contracts: ContractSummary[];
  pendingRenewals: ContractSummary[];
  allPayments: NextPaymentSummary[];
  shellProperties: ShellProperty[];
}

export function TenantDashboardClient({
  fullName,
  contracts,
  pendingRenewals,
  allPayments,
  shellProperties: initialShellProperties,
}: TenantDashboardClientProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [shellProperties, setShellProperties] = useState<ShellProperty[]>(initialShellProperties);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  const activeContract = contracts[activeTab] ?? null;

  const contractPayments = allPayments.filter((p) => p.contract_id === activeContract?.id);
  const _nextPayment = contractPayments[0] ?? null; // per-tab payment (reserved for future tab detail)

  // Global next payment = earliest across all contracts
  const globalNextPayment = allPayments[0] ?? null;

  const daysUntilExpiry = activeContract?.lease_end
    ? Math.ceil((new Date(activeContract.lease_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const pendingRenewal =
    pendingRenewals.find((r) => r.property_id === activeContract?.property_id) ?? null;

  const handleDeleteShell = async (id: string) => {
    if (!window.confirm(t('tenant.shell_property_delete_confirm'))) return;
    setDeletingId(id);
    try {
      await fetch(`/api/tenant/properties?propertyId=${id}`, { method: 'DELETE' });
      setShellProperties((prev) => prev.filter((p) => p.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const showExpiryBanner =
    !pendingRenewal && daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 30;

  return (
    <div className="mx-auto max-w-2xl">
      {/* Greeting */}
      <h2 className="text-xl font-bold text-charcoal-900 dark:text-white">
        {t('dashboard.tenant_title')}
      </h2>
      <p className="mb-6 text-sm text-charcoal-500 dark:text-white/50">
        {t('dashboard.welcome')}
        {fullName ? `, ${fullName}` : ''}
      </p>

      {/* Tab bar — only shown when multiple contracts */}
      {contracts.length > 1 && (
        <div className="mb-4 flex gap-1 overflow-x-auto rounded-lg bg-warm-100 dark:bg-white/5 p-1">
          {contracts.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveTab(i)}
              className={`shrink-0 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                i === activeTab
                  ? 'bg-white dark:bg-charcoal-800 text-charcoal-900 dark:text-white shadow-sm dark:shadow-black/20'
                  : 'text-charcoal-500 dark:text-white/50 hover:text-charcoal-700 dark:hover:text-white/70'
              }`}
            >
              {c.properties?.name ?? t('tenant.property_tab').replace('{n}', String(i + 1))}
            </button>
          ))}
        </div>
      )}

      {/* Banner slot — reserves vertical space to prevent CLS whether or not a banner renders */}
      <div className="mb-4 min-h-[72px]">
        {pendingRenewal && (
          <Link href="/tenant/contract/view" className="block">
            <div className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 p-4 transition-shadow hover:shadow-md">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-5 w-5 text-orange-600"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-semibold text-orange-900">
                    {t('tenant.renewal_pending')}
                  </p>
                  <p className="text-xs text-orange-700">{t('tenant.renewal_pending_hint')}</p>
                </div>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-5 w-5 text-orange-400"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </Link>
        )}

        {showExpiryBanner && daysUntilExpiry !== null && (
          <div className="flex items-center justify-between rounded-lg border border-saffron-300 bg-warm-100 px-4 py-3">
            <p className="text-sm font-medium text-charcoal-800 dark:text-white/90">
              {daysUntilExpiry === 0
                ? t('dashboard.lease_expiry_banner_today')
                : daysUntilExpiry === 1
                  ? t('dashboard.lease_expiry_banner_one')
                  : t('dashboard.lease_expiry_banner_other').replace(
                      '{n}',
                      String(daysUntilExpiry)
                    )}
            </p>
            <Link
              href="/tenant/contract/view"
              className="ml-4 shrink-0 rounded-md bg-saffron-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-saffron-600 focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:ring-offset-1"
            >
              {t('dashboard.lease_expiry_action')}
            </Link>
          </div>
        )}
      </div>

      {/* Pair CTA — shown prominently when tenant has no contracts */}
      {contracts.length === 0 && (
        <Link href="/tenant/pair" className="mb-4 block">
          <div className="flex items-center gap-4 rounded-xl border-2 border-saffron-400 bg-saffron-50 px-5 py-4 transition-shadow hover:shadow-md">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-saffron-500 text-white text-lg font-bold">
              +
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-saffron-900">{t('tenant.pair_cta')}</p>
              <p className="mt-0.5 text-xs text-saffron-700">{t('tenant.pair_cta_desc')}</p>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="ml-auto h-5 w-5 shrink-0 text-saffron-400"
            >
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </Link>
      )}

      {/* Contract card */}
      {activeContract ? (
        <Link href="/tenant/contract/view" className="block">
          <Card className="mb-4 transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-charcoal-500 dark:text-white/50">
                  {t('tenant.your_property')}
                </p>
                <p className="text-sm font-semibold text-charcoal-900 dark:text-white">
                  {activeContract.properties?.name ?? '—'}
                </p>
              </div>
              <StatusBadge status={activeContract.status} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-charcoal-500 dark:text-white/50">
                  {t('contract.lease_period')}
                </p>
                <p className="text-sm text-charcoal-900 dark:text-white">
                  {activeContract.lease_start ? formatDisplayDate(activeContract.lease_start) : '—'}{' '}
                  → {activeContract.lease_end ? formatDisplayDate(activeContract.lease_end) : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-charcoal-500 dark:text-white/50">
                  {activeContract.properties?.daily_rate
                    ? t('property.daily_rate')
                    : t('contract.monthly_rent')}
                </p>
                <p className="text-sm font-medium text-charcoal-900 dark:text-white">
                  {activeContract.properties?.daily_rate
                    ? `฿${activeContract.properties.daily_rate.toLocaleString()}${t('property.per_night')}`
                    : activeContract.monthly_rent
                      ? `฿${activeContract.monthly_rent.toLocaleString()}`
                      : '—'}
                </p>
              </div>
            </div>
          </Card>
        </Link>
      ) : (
        <Card className="mb-4">
          <p className="text-sm text-charcoal-500 dark:text-white/50">{t('tenant.no_contract')}</p>
        </Card>
      )}

      {/* Next payment card — shows global nearest payment across all contracts */}
      <Link href="/tenant/payments" className="block">
        <Card className="mb-6 transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-charcoal-500 dark:text-white/50">
                {t('tenant.next_payment')}
              </p>
              {globalNextPayment ? (
                <p className="text-sm font-semibold text-charcoal-900 dark:text-white">
                  {formatDisplayDate(globalNextPayment.due_date)}
                </p>
              ) : (
                <p className="text-sm text-charcoal-500 dark:text-white/50">
                  {t('tenant.no_upcoming_payments')}
                </p>
              )}
            </div>
            {globalNextPayment && (
              <p className="text-base font-semibold text-saffron-700">
                ฿{globalNextPayment.amount.toLocaleString()}
              </p>
            )}
          </div>
        </Card>
      </Link>

      {/* Shell property cards — always visible */}
      {shellProperties.length > 0 && (
        <div className="mb-4 space-y-3">
          {shellProperties.map((prop) => (
            <Card key={prop.id} className="relative">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-charcoal-900 dark:text-white truncate">
                      {prop.name}
                    </p>
                    <span className="shrink-0 rounded-full bg-warm-200 dark:bg-white/10 px-2 py-0.5 text-[11px] font-medium text-charcoal-500 dark:text-white/50">
                      {t('tenant.shell_property_badge')}
                    </span>
                  </div>
                  {(prop.lease_start || prop.lease_end) && (
                    <p className="mt-1.5 text-xs text-charcoal-500 dark:text-white/50">
                      {prop.lease_start ? formatDisplayDate(prop.lease_start) : '—'}
                      {' → '}
                      {prop.lease_end ? formatDisplayDate(prop.lease_end) : '—'}
                    </p>
                  )}
                  {prop.monthly_rent && (
                    <p className="mt-1 text-xs font-medium text-charcoal-700 dark:text-white/70">
                      ฿{prop.monthly_rent.toLocaleString()}{' '}
                      <span className="font-normal text-charcoal-400 dark:text-white/40">
                        / {t('contract.monthly_rent').toLowerCase()}
                      </span>
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => router.push('/tenant/properties/new')}
                    className="min-h-[36px] rounded-lg border border-warm-200 dark:border-white/10 px-3 py-1 text-xs font-medium text-charcoal-700 dark:text-white/70 hover:bg-warm-100 dark:hover:bg-white/10"
                  >
                    {t('tenant.shell_property_edit')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteShell(prop.id)}
                    disabled={deletingId === prop.id}
                    className="min-h-[36px] rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {deletingId === prop.id ? '...' : t('tenant.shell_property_delete')}
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* CTA — always visible for adding properties/subscriptions */}
      <div className="mb-4">
        <Link
          href="/tenant/properties/new"
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-dashed border-warm-300 dark:border-white/15 px-4 py-3 text-sm font-medium text-charcoal-500 dark:text-white/50 hover:border-saffron-400 hover:text-saffron-700 hover:bg-saffron-50/40 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path
              fillRule="evenodd"
              d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
          {t('tenant.shell_property_add_cta')}
        </Link>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/tenant/contract/view"
          className="flex min-h-[44px] items-center justify-center rounded-lg border border-warm-200 dark:border-white/10 px-4 py-2 text-sm font-medium text-charcoal-700 dark:text-white/70 hover:bg-warm-100 dark:hover:bg-white/10"
        >
          {t('contract.view')}
        </Link>
        <Link
          href="/tenant/payments"
          className="flex min-h-[44px] items-center justify-center rounded-lg border border-warm-200 dark:border-white/10 px-4 py-2 text-sm font-medium text-charcoal-700 dark:text-white/70 hover:bg-warm-100 dark:hover:bg-white/10"
        >
          {t('nav.payments')}
        </Link>
      </div>
    </div>
  );
}
