'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/context';

interface PostSlotProUpsellModalProps {
  open: boolean;
  onClose: () => void;
  slotsJustPurchased: number;
  isPro: boolean;
}

export function PostSlotProUpsellModal({
  open,
  onClose,
  slotsJustPurchased,
  isPro,
}: PostSlotProUpsellModalProps) {
  const { t } = useI18n();

  // Close on ESC key
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (isPro || !open) return null;

  const title = t('billing.upsell_modal_title').replace('{n}', String(slotsJustPurchased));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      aria-hidden="true"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upsell-modal-title"
        className="w-full max-w-md rounded-2xl bg-warm-50 border border-warm-200 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Saffron gradient header */}
        <div className="rounded-t-2xl bg-gradient-to-r from-saffron-400 to-saffron-600 px-6 py-5 text-center">
          <span className="inline-flex items-center justify-center rounded-full bg-white/30 px-3 py-1 text-sm font-bold tracking-wider text-white">
            PRO
          </span>
          <h2 id="upsell-modal-title" className="mt-2 text-xl font-bold text-white">
            {title}
          </h2>
        </div>

        {/* Value proposition bullets */}
        <div className="px-6 py-5">
          <ul className="space-y-3">
            {(
              [
                t('billing.upsell_modal_bullet_1'),
                t('billing.upsell_modal_bullet_2'),
                t('billing.upsell_modal_bullet_3'),
              ] as string[]
            ).map((bullet, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 text-saffron-600 font-bold">✓</span>
                <span className="text-sm text-charcoal-700">{bullet}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 px-6 pb-6 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-warm-200 py-3 text-sm font-medium text-charcoal-600 transition hover:bg-warm-100 min-h-[44px]"
          >
            {t('billing.upsell_modal_dismiss')}
          </button>
          <Link
            href="/landlord/billing/upgrade"
            className="flex-1 rounded-xl bg-saffron-500 py-3 text-center text-sm font-bold text-white transition hover:bg-saffron-600 min-h-[44px] flex items-center justify-center"
            onClick={onClose}
          >
            {t('billing.upsell_modal_cta')}
          </Link>
        </div>
      </div>
    </div>
  );
}
