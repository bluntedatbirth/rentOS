'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';

const COMPARISON_ROWS = [
  {
    key: 'billing.compare_properties',
    free: 'billing.compare_free_3',
    pro: 'billing.compare_pro_unlimited',
  },
  { key: 'billing.compare_contract_upload', free: true, pro: true },
  { key: 'billing.compare_contract_generation', free: false, pro: true },
  { key: 'billing.compare_ai_analysis', free: false, pro: true },
  { key: 'billing.compare_templates', free: false, pro: true },
  { key: 'billing.compare_payment_tracking', free: true, pro: true },
  {
    key: 'billing.compare_penalties',
    free: 'billing.compare_manual',
    pro: 'billing.compare_auto_rules',
  },
  {
    key: 'billing.compare_notifications',
    free: 'billing.compare_basic',
    pro: 'billing.compare_custom_rules',
  },
  { key: 'billing.compare_analytics', free: false, pro: true },
  {
    key: 'billing.compare_documents',
    free: 'billing.compare_contracts_only',
    pro: 'billing.compare_full_vault',
  },
  {
    key: 'billing.compare_maintenance',
    free: 'billing.compare_basic',
    pro: 'billing.compare_sla_costs',
  },
  { key: 'billing.compare_bulk_actions', free: false, pro: true },
] as const;

export default function BillingDashboardPage() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  const tier = profile?.tier ?? 'free';

  const handleCancel = async () => {
    if (!window.confirm(t('billing.cancel_confirm'))) return;
    setCancelling(true);
    await fetch('/api/billing/cancel', { method: 'POST' });
    setCancelled(true);
    setCancelling(false);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      <h1 className="text-xl font-bold text-gray-900">{t('billing.dashboard_title')}</h1>

      {/* Current plan */}
      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          {t('billing.plan_section')}
        </h2>

        <div className="mt-3 flex items-center gap-3">
          {tier === 'pro' ? (
            <span className="inline-flex items-center rounded-full bg-blue-100 px-4 py-1 text-sm font-bold text-blue-700">
              {t('billing.pro_plan')}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-4 py-1 text-sm font-bold text-gray-600">
              {t('billing.free_plan')}
            </span>
          )}
        </div>

        {tier === 'pro' && (
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">{t('billing.next_billing')}</dt>
              <dd className="font-medium text-gray-900">—</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">{t('billing.billing_cycle')}</dt>
              <dd className="font-medium text-gray-900">—</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">{t('billing.payment_method')}</dt>
              <dd className="font-medium text-gray-900">{t('billing.payment_method_none')}</dd>
            </div>
          </dl>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/landlord/billing/upgrade"
            className="inline-flex min-h-[44px] items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {tier === 'pro' ? t('billing.change_plan') : t('billing.upgrade_now')}
          </Link>
          {tier === 'pro' && !cancelled && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelling}
              className="inline-flex min-h-[44px] items-center rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              {cancelling ? t('common.loading') : t('billing.cancel_plan')}
            </button>
          )}
          {cancelled && (
            <p className="self-center text-sm text-green-600">{t('billing.cancelled')}</p>
          )}
        </div>
      </section>

      {/* Pro vs Free comparison */}
      <section className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            {t('billing.compare_title')}
          </h2>
        </div>

        {/* Header row */}
        <div className="grid grid-cols-[1fr_100px_100px] gap-0 border-b border-gray-100 bg-gray-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <span>{t('billing.compare_feature')}</span>
          <span className="text-center">{t('billing.free_plan')}</span>
          <span className="text-center text-blue-600">{t('billing.pro_plan')}</span>
        </div>

        {/* Comparison rows */}
        <div className="divide-y divide-gray-50">
          {COMPARISON_ROWS.map((row) => (
            <div key={row.key} className="grid grid-cols-[1fr_100px_100px] gap-0 px-5 py-3 text-sm">
              <span className="text-gray-700">{t(row.key)}</span>
              <span className="flex justify-center">
                {row.free === true ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-5 w-5 text-green-500"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : row.free === false ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-5 w-5 text-gray-300"
                  >
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                ) : (
                  <span className="text-xs text-gray-500">{t(row.free as string)}</span>
                )}
              </span>
              <span className="flex justify-center">
                {row.pro === true ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-5 w-5 text-blue-500"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <span className="text-xs text-blue-600 font-medium">{t(row.pro as string)}</span>
                )}
              </span>
            </div>
          ))}
        </div>

        {/* CTA at bottom */}
        {tier !== 'pro' && (
          <div className="border-t border-gray-100 bg-blue-50 px-5 py-4 text-center">
            <Link
              href="/landlord/billing/upgrade"
              className="inline-flex min-h-[44px] items-center rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {t('billing.upgrade_now')}
            </Link>
          </div>
        )}
      </section>

      {/* Payment history */}
      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          {t('billing.history_title')}
        </h2>
        <p className="mt-4 text-sm text-gray-400">{t('billing.history_empty')}</p>
      </section>
    </div>
  );
}
