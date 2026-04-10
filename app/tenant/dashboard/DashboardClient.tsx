'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n/context';
import { Card, CardTitle, CardValue } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface ContractSummary {
  id: string;
  status: string;
  lease_start: string | null;
  lease_end: string | null;
  monthly_rent: number | null;
  property_id: string;
  properties: { name: string } | null;
}

interface MaintenanceSummary {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

interface PenaltySummary {
  id: string;
  status: string;
  confirmed_amount: number | null;
  calculated_amount: number | null;
}

interface TenantDashboardClientProps {
  fullName: string | null;
  contract: ContractSummary | null;
  pendingRenewal: ContractSummary | null;
  maintenance: MaintenanceSummary[];
  penalties: PenaltySummary[];
  daysUntilExpiry: number | null;
}

export function TenantDashboardClient({
  fullName,
  contract,
  pendingRenewal,
  maintenance,
  penalties,
  daysUntilExpiry,
}: TenantDashboardClientProps) {
  const { t } = useI18n();

  const pendingPenalties = penalties.filter(
    (p) => p.status !== 'resolved' && p.status !== 'waived'
  );
  const totalPenaltyAmount = pendingPenalties.reduce(
    (sum, p) => sum + (p.confirmed_amount ?? p.calculated_amount ?? 0),
    0
  );

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="text-xl font-bold text-charcoal-900">{t('dashboard.tenant_title')}</h2>
      <p className="mb-6 text-sm text-charcoal-500">
        {t('dashboard.welcome')}, {fullName ?? ''}
      </p>

      {/* Pending renewal attention card */}
      {pendingRenewal && (
        <Link href="/tenant/contract/view" className="block mb-4">
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

      {/* Lease expiry banner — suppressed when a pending-renewal card is already visible */}
      {daysUntilExpiry !== null &&
        daysUntilExpiry >= 0 &&
        daysUntilExpiry <= 30 &&
        !pendingRenewal && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-saffron-300 bg-warm-100 px-4 py-3">
            <p className="text-sm font-medium text-charcoal-800">
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

      {/* Contract summary */}
      {contract ? (
        <Link href="/tenant/contract/view">
          <Card className="mb-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-charcoal-500">{t('tenant.your_property')}</p>
                <p className="text-sm font-semibold text-charcoal-900">
                  {contract.properties?.name ?? '—'}
                </p>
              </div>
              <StatusBadge status={contract.status} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-charcoal-500">{t('contract.lease_period')}</p>
                <p className="text-sm text-charcoal-900">
                  {contract.lease_start ?? '—'} → {contract.lease_end ?? '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-charcoal-500">{t('contract.monthly_rent')}</p>
                <p className="text-sm font-medium text-charcoal-900">
                  {contract.monthly_rent ? `฿${contract.monthly_rent.toLocaleString()}` : '—'}
                </p>
              </div>
            </div>
          </Card>
        </Link>
      ) : (
        <Card className="mb-6">
          <p className="text-sm text-charcoal-500">{t('tenant.no_contract')}</p>
        </Card>
      )}

      {/* Stats grid */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <Card>
          <CardTitle>{t('tenant.maintenance_open')}</CardTitle>
          <CardValue>{maintenance.filter((m) => m.status !== 'resolved').length}</CardValue>
        </Card>
        <Card>
          <CardTitle>{t('tenant.penalties_pending')}</CardTitle>
          <CardValue>
            {pendingPenalties.length}
            {totalPenaltyAmount > 0 && (
              <span className="ml-1 text-sm text-red-600">
                ฿{totalPenaltyAmount.toLocaleString()}
              </span>
            )}
          </CardValue>
        </Card>
      </div>

      {/* Recent maintenance */}
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-charcoal-900">
            {t('tenant.recent_maintenance')}
          </h3>
          <Link
            href="/tenant/maintenance"
            className="text-sm text-saffron-600 hover:text-saffron-700"
          >
            {t('common.view_all')}
          </Link>
        </div>
        {maintenance.length === 0 ? (
          <p className="text-sm text-charcoal-400">{t('tenant.no_maintenance')}</p>
        ) : (
          <div className="space-y-2">
            {maintenance.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm"
              >
                <span className="text-sm text-charcoal-900">{m.title}</span>
                <StatusBadge status={m.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        <Link
          href="/tenant/maintenance"
          className="min-h-[44px] flex items-center justify-center rounded-lg bg-saffron-500 px-4 py-2 text-sm font-medium text-white hover:bg-saffron-600"
        >
          {t('tenant.submit_request')}
        </Link>
        <Link
          href="/tenant/payments"
          className="min-h-[44px] flex items-center justify-center rounded-lg border border-warm-200 px-4 py-2 text-sm font-medium text-charcoal-700 hover:bg-warm-100"
        >
          {t('nav.payments')}
        </Link>
        <Link
          href="/tenant/contract/view"
          className="min-h-[44px] flex items-center justify-center rounded-lg border border-warm-200 px-4 py-2 text-sm font-medium text-charcoal-700 hover:bg-warm-100"
        >
          {t('contract.view')}
        </Link>
      </div>
    </div>
  );
}
