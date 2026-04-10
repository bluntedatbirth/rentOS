'use client';

import { useI18n } from '@/lib/i18n/context';

export default function BillingDashboardPage() {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      <h1 className="text-xl font-bold text-gray-900">{t('billing.dashboard_title')}</h1>

      {/* Beta banner */}
      <section className="rounded-lg border border-green-200 bg-green-50 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-green-900">{t('billing.beta_banner_title')}</h2>
        <p className="mt-2 text-sm text-green-800">{t('billing.beta_banner_body')}</p>
      </section>
    </div>
  );
}
