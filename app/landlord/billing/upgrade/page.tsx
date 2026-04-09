'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';

const FREE_FEATURES = [
  'billing.free_feature_1',
  'billing.free_feature_2',
  'billing.free_feature_3',
  'billing.free_feature_4',
  'billing.free_feature_5',
] as const;

const PRO_FEATURES = [
  'billing.pro_feature_6',
  'billing.pro_feature_1',
  'billing.pro_feature_2',
  'billing.pro_feature_3',
  'billing.pro_feature_4',
  'billing.pro_feature_5',
] as const;

export default function UpgradePage() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const tier = profile?.tier ?? 'free';

  const handleUpgrade = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: billing }),
      });
      if (!res.ok) throw new Error('checkout_failed');
      const data = (await res.json()) as { url?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        router.push('/landlord/billing');
      }
    } catch {
      setError(t('billing.checkout_error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          {t('billing.upgrade_title')}
        </h1>
        <p className="mt-2 text-sm text-gray-500">{t('billing.upgrade_subtitle')}</p>
      </div>

      {/* Monthly / Yearly toggle */}
      <div className="flex justify-center">
        <div className="inline-flex items-center rounded-full border border-gray-200 bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setBilling('monthly')}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
              billing === 'monthly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('billing.monthly')}
          </button>
          <button
            type="button"
            onClick={() => setBilling('yearly')}
            className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-colors ${
              billing === 'yearly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('billing.yearly')}
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
              {t('billing.save_badge')}
            </span>
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {/* Free card */}
        <div
          className={`relative rounded-2xl border-2 bg-white p-6 shadow-sm ${
            tier === 'free' ? 'border-gray-400' : 'border-gray-200'
          }`}
        >
          {tier === 'free' && (
            <span className="absolute -top-3 left-5 rounded-full bg-gray-700 px-3 py-1 text-xs font-semibold text-white">
              {t('billing.current_plan_badge')}
            </span>
          )}
          <h2 className="text-xl font-bold text-gray-900">{t('billing.free_plan')}</h2>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-gray-900">{t('billing.free_price')}</span>
            <span className="text-sm text-gray-500">{t('billing.free_price_sub')}</span>
          </div>

          <ul className="mt-5 space-y-2.5">
            {FREE_FEATURES.map((key) => (
              <li key={key} className="flex items-start gap-2 text-sm text-gray-700">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="mt-0.5 h-4 w-4 shrink-0 text-gray-400"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                    clipRule="evenodd"
                  />
                </svg>
                {t(key)}
              </li>
            ))}
          </ul>

          <div className="mt-6">
            {tier === 'free' ? (
              <div className="min-h-[44px] rounded-lg border border-gray-300 px-4 py-2.5 text-center text-sm font-medium text-gray-500">
                {t('billing.current_plan')}
              </div>
            ) : (
              <Link
                href="/landlord/billing"
                className="flex min-h-[44px] items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t('billing.change_plan')}
              </Link>
            )}
          </div>
        </div>

        {/* Pro card */}
        <div
          className={`relative rounded-2xl border-2 bg-white p-6 shadow-sm ${
            tier === 'pro' ? 'border-blue-500' : 'border-blue-400'
          }`}
        >
          {tier === 'pro' && (
            <span className="absolute -top-3 left-5 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
              {t('billing.current_plan_badge')}
            </span>
          )}

          {/* Recommended ribbon */}
          <div className="absolute right-0 top-0 overflow-hidden rounded-tr-2xl">
            <div className="bg-blue-600 px-4 py-1 text-xs font-semibold text-white">
              {billing === 'yearly' ? t('billing.save_badge') : t('billing.popular')}
            </div>
          </div>

          <h2 className="text-xl font-bold text-gray-900">{t('billing.pro_plan')}</h2>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-blue-700">
              {billing === 'monthly' ? t('billing.monthly_price') : t('billing.yearly_price')}
            </span>
            <span className="text-sm text-gray-500">
              {billing === 'monthly'
                ? t('billing.monthly_price_sub')
                : t('billing.yearly_price_sub')}
            </span>
          </div>
          {billing === 'yearly' && (
            <p className="mt-1 text-xs text-green-600">{t('billing.yearly_per_month')}</p>
          )}

          <ul className="mt-5 space-y-2.5">
            {PRO_FEATURES.map((key) => (
              <li key={key} className="flex items-start gap-2 text-sm text-gray-700">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="mt-0.5 h-4 w-4 shrink-0 text-blue-500"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                    clipRule="evenodd"
                  />
                </svg>
                {t(key)}
              </li>
            ))}
          </ul>

          <div className="mt-6">
            {tier === 'pro' ? (
              <div className="min-h-[44px] rounded-lg border border-blue-300 px-4 py-2.5 text-center text-sm font-medium text-blue-600">
                {t('billing.current_plan')}
              </div>
            ) : (
              <button
                type="button"
                onClick={handleUpgrade}
                disabled={loading}
                className="min-h-[44px] w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? t('common.loading') : t('billing.upgrade_now')}
              </button>
            )}
          </div>
        </div>
      </div>

      {error && <p className="text-center text-sm text-red-600">{error}</p>}

      <p className="text-center text-xs text-gray-400">{t('billing.payment_providers')}</p>
    </div>
  );
}
