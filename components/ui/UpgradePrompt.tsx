'use client';

import { useI18n } from '@/lib/i18n/context';

interface UpgradePromptProps {
  feature?: string;
  onUpgrade?: () => void;
  onDismiss?: () => void;
  showSlotUnlock?: boolean;
}

export function UpgradePrompt({
  feature,
  onUpgrade,
  onDismiss,
  showSlotUnlock = false,
}: UpgradePromptProps) {
  const { t } = useI18n();

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      window.location.href = '/landlord/billing/upgrade';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-warm-50 border border-warm-200 shadow-xl">
        {/* Header */}
        <div className="rounded-t-2xl bg-gradient-to-r from-sage-500 to-sage-600 px-6 py-5 text-center">
          <span className="inline-flex items-center justify-center rounded-full bg-white/30 px-3 py-1 text-sm font-bold tracking-wider text-white">
            PRO
          </span>
          <h2 className="mt-2 text-xl font-bold text-white">{t('pro.upgrade_prompt.title')}</h2>
          {feature && <p className="mt-1 text-sm text-sage-100">{feature}</p>}
        </div>

        {/* Comparison */}
        <div className="px-6 py-5">
          <div className="grid grid-cols-2 gap-3">
            {/* Free column */}
            <div className="rounded-xl border border-warm-200 p-4">
              <p className="mb-3 text-center text-sm font-semibold text-charcoal-500">
                {t('pro.upgrade_prompt.free_plan')}
              </p>
              <ul className="space-y-2 text-xs text-charcoal-700">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-charcoal-400">•</span>
                  {t('pro.upgrade_prompt.free_properties')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-red-400">✕</span>
                  {t('pro.upgrade_prompt.free_no_contracts')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-red-400">✕</span>
                  {t('pro.upgrade_prompt.free_no_reports')}
                </li>
              </ul>
            </div>

            {/* Pro column */}
            <div className="rounded-xl border-2 border-sage-500 bg-sage-50 p-4">
              <p className="mb-3 text-center text-sm font-semibold text-sage-700">
                {t('pro.upgrade_prompt.pro_plan')}
              </p>
              <ul className="space-y-2 text-xs text-sage-800">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-green-500">✓</span>
                  {t('pro.upgrade_prompt.pro_contracts')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-green-500">✓</span>
                  {t('pro.upgrade_prompt.pro_reports')}
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onDismiss}
            className="flex-1 rounded-xl border border-warm-200 py-3 text-sm font-medium text-charcoal-600 transition hover:bg-warm-100"
          >
            {t('pro.upgrade_prompt.maybe_later')}
          </button>
          {showSlotUnlock ? (
            <div className="flex flex-1 flex-col gap-2">
              <a
                href="/landlord/billing/slots"
                className="block rounded-xl bg-saffron-500 py-3 text-center text-sm font-bold text-charcoal-900 transition hover:bg-saffron-600"
              >
                {t('upgrade.unlock_slots_cta')}
              </a>
              <button
                onClick={handleUpgrade}
                className="block rounded-xl border border-sage-500 py-3 text-sm font-bold text-sage-700 transition hover:bg-sage-50"
              >
                {t('pro.upgrade_prompt.upgrade_now')}
              </button>
            </div>
          ) : (
            <button
              onClick={handleUpgrade}
              className="flex-1 rounded-xl border border-sage-500 py-3 text-sm font-bold text-sage-700 transition hover:bg-sage-50"
            >
              {t('pro.upgrade_prompt.upgrade_now')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
