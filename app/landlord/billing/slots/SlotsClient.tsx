'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n/context';
import { useToast } from '@/components/ui/ToastProvider';
import { SLOT_UNLOCK_PACKS } from '@/lib/tier';
import { PostSlotProUpsellModal } from '@/components/billing/PostSlotProUpsellModal';

const PACK_NAME_KEYS = [
  'billing.slots_pack_1_name',
  'billing.slots_pack_5_name',
  'billing.slots_pack_10_name',
] as const;

interface SlotsClientProps {
  initialPurchasedSlots: number;
  isPro: boolean;
}

export default function SlotsClient({ initialPurchasedSlots, isPro }: SlotsClientProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const [purchasedSlots, setPurchasedSlots] = useState(initialPurchasedSlots);
  const [buyingIndex, setBuyingIndex] = useState<number | null>(null);
  const [upsellOpen, setUpsellOpen] = useState(false);
  const [lastPurchasedSlots, setLastPurchasedSlots] = useState(0);

  const isSimulated = process.env.NEXT_PUBLIC_PAYMENTS_SIMULATED === 'true';

  const handleBuy = async (packIndex: 0 | 1 | 2) => {
    setBuyingIndex(packIndex);
    try {
      // Step 1: Create a pending purchase and get the mock checkout URL
      const checkoutRes = await fetch('/api/billing/slots/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packIndex }),
      });

      if (!checkoutRes.ok) {
        const errBody = (await checkoutRes.json().catch(() => ({}))) as { message?: string };
        toast.error(errBody.message ?? t('billing.checkout_error'));
        return;
      }

      const { slotPurchaseId } = (await checkoutRes.json()) as {
        slotPurchaseId: string;
        mockCheckoutUrl: string;
      };

      // Step 2: Immediately simulate Omise success via callback
      const callbackRes = await fetch('/api/billing/slots/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotPurchaseId }),
      });

      if (!callbackRes.ok) {
        const errBody = (await callbackRes.json().catch(() => ({}))) as { message?: string };
        toast.error(errBody.message ?? t('billing.checkout_error'));
        return;
      }

      const { newPurchasedSlots } = (await callbackRes.json()) as {
        ok: boolean;
        newPurchasedSlots: number;
      };

      setPurchasedSlots(newPurchasedSlots);
      const pack = SLOT_UNLOCK_PACKS[packIndex];
      toast.success(
        isSimulated
          ? t('billing.sim_toast_success').replace('{n}', String(pack.slots))
          : t('billing.slots_unlock_success')
      );
      router.refresh();
      setLastPurchasedSlots(pack.slots);
      setUpsellOpen(true);
    } catch {
      toast.error(t('billing.checkout_error'));
    } finally {
      setBuyingIndex(null);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-12">
      {/* Simulation mode banner — visible only when NEXT_PUBLIC_PAYMENTS_SIMULATED=true */}
      {isSimulated && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sky-900">
          <div className="font-semibold">{t('billing.sim_banner_title')}</div>
          <div className="mt-1 text-sm">{t('billing.sim_banner_body')}</div>
        </div>
      )}

      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-charcoal-900 dark:text-white">
          {t('billing.slots_title')}
        </h1>
        <p className="mt-2 text-sm text-charcoal-500 dark:text-white/50">
          {t('billing.slots_subtitle')}
        </p>
      </div>

      {/* Owned slots display */}
      <div className="rounded-xl border border-warm-200 dark:border-white/10 bg-warm-50 dark:bg-charcoal-900 px-5 py-3 text-center text-sm text-charcoal-600 dark:text-white/60">
        {t('billing.slots_owned').replace('{count}', String(purchasedSlots))}
      </div>

      {/* Pack cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {SLOT_UNLOCK_PACKS.map((pack) => {
          const nameKey = PACK_NAME_KEYS[pack.packIndex];
          const isLoading = buyingIndex === pack.packIndex;
          return (
            <div
              key={pack.packIndex}
              className="relative flex flex-col items-center rounded-2xl border-2 border-warm-200 dark:border-white/10 bg-warm-50 dark:bg-charcoal-800 p-6 shadow-sm"
            >
              {/* SIM badge — visible only when NEXT_PUBLIC_PAYMENTS_SIMULATED=true */}
              {isSimulated && (
                <span className="absolute right-2 top-2 rounded-full bg-amber-100 dark:bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-400">
                  SIM
                </span>
              )}
              <p className="text-base font-semibold text-charcoal-900 dark:text-white">
                {t(nameKey)}
              </p>
              <p className="mt-2 text-2xl font-extrabold text-charcoal-900 dark:text-white">
                {t('billing.slots_pack_price').replace('{price}', String(pack.thb))}
              </p>
              <p className="mt-1 text-xs text-charcoal-400 dark:text-white/40">
                {t('billing.slots_subtitle')}
              </p>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleBuy(pack.packIndex as 0 | 1 | 2)}
                className="mt-5 min-h-[44px] w-full rounded-xl bg-saffron-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-saffron-600 disabled:opacity-60"
              >
                {isLoading
                  ? '...'
                  : isSimulated
                    ? t('billing.slots_unlock_cta_simulated').replace('{n}', String(pack.slots))
                    : t('billing.slots_unlock_cta')}
              </button>
            </div>
          );
        })}
      </div>

      <PostSlotProUpsellModal
        open={upsellOpen}
        onClose={() => setUpsellOpen(false)}
        slotsJustPurchased={lastPurchasedSlots}
        isPro={isPro}
      />
    </div>
  );
}
