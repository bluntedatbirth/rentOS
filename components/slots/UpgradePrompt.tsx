'use client';

import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n/context';
import { SLOT_UNLOCK_PACKS } from '@/lib/tier';

interface UpgradePromptProps {
  /** Number of slots the user has already used */
  currentSlots: number;
  /** Total slots the user is allowed (free base + purchased) */
  totalSlots: number;
}

export function UpgradePrompt({ currentSlots, totalSlots }: UpgradePromptProps) {
  const { t } = useI18n();
  const router = useRouter();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-saffron-100 dark:bg-saffron-500/15">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-7 w-7 text-saffron-600 dark:text-saffron-400"
          >
            <path
              fillRule="evenodd"
              d="M11.484 2.17a.75.75 0 0 1 1.032 0 11.209 11.209 0 0 0 7.877 3.08.75.75 0 0 1 .722.515 12.74 12.74 0 0 1 .635 3.985c0 5.942-4.064 10.933-9.563 12.348a.749.749 0 0 1-.374 0C6.314 20.683 2.25 15.692 2.25 9.75c0-1.39.223-2.73.635-3.985a.75.75 0 0 1 .722-.516l.143.001c2.996 0 5.718-1.17 7.734-3.08ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75ZM12 15a.75.75 0 0 0 0 1.5h.007a.75.75 0 0 0 0-1.5H12Z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <h2 className="mb-2 text-xl font-bold text-charcoal-900 dark:text-white">
          {t('slots.limit_reached')}
        </h2>
        <p className="text-sm text-charcoal-500 dark:text-white/50">{t('slots.limit_desc')}</p>
        <p className="mt-1 text-xs text-charcoal-400 dark:text-white/40">
          {t('slots.current_usage')
            .replace('{{used}}', String(currentSlots))
            .replace('{{total}}', String(totalSlots))}
        </p>
      </div>

      {/* Pack cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {SLOT_UNLOCK_PACKS.map((pack) => {
          const isBestValue = pack.packIndex === 2;
          const perSlotPrice = (pack.thb / pack.slots).toFixed(2);
          const showPerSlot = pack.slots > 1;

          const label = [
            t('slots.pack_1_label'),
            t('slots.pack_5_label'),
            t('slots.pack_10_label'),
          ][pack.packIndex];

          return (
            <div
              key={pack.packIndex}
              className={`relative flex flex-col rounded-2xl border p-5 shadow-sm transition-shadow hover:shadow-md ${
                isBestValue
                  ? 'border-saffron-400 bg-saffron-50 dark:border-saffron-500/40 dark:bg-saffron-500/10'
                  : 'border-warm-200 bg-white dark:border-white/10 dark:bg-charcoal-800'
              }`}
            >
              {/* Best value badge */}
              {isBestValue && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-saffron-500 px-3 py-0.5 text-xs font-semibold text-white">
                  {t('slots.best_value')}
                </span>
              )}

              <div className="mb-4 flex-1">
                <p className="mb-1 font-semibold text-charcoal-900 dark:text-white">{label}</p>
                <p className="text-2xl font-bold text-charcoal-900 dark:text-white">
                  ฿{pack.thb.toLocaleString()}
                </p>
                {showPerSlot && (
                  <p className="mt-0.5 text-xs text-charcoal-500 dark:text-white/50">
                    ฿{perSlotPrice} {t('slots.per_slot')}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => router.push(`/landlord/slots/checkout?pack=${pack.packIndex}`)}
                className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                  isBestValue
                    ? 'bg-saffron-500 text-white hover:bg-saffron-600'
                    : 'border border-saffron-500 text-saffron-700 hover:bg-saffron-50 dark:text-saffron-400 dark:hover:bg-saffron-500/10'
                }`}
              >
                {t('slots.buy')}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
