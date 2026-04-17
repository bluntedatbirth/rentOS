'use client';

// IMPORTANT: NEXT_PUBLIC_OMISE_PUBLIC_KEY must be set in your environment variables.
// It should have the same value as your OMISE_PUBLIC_KEY (pkey_...).
// OMISE_SECRET_KEY (skey_...) must NEVER be exposed client-side.

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/context';
import { SLOT_UNLOCK_PACKS } from '@/lib/tier';
import '@/lib/omise/types';

type PaymentStatus = 'idle' | 'submitting' | 'success' | 'failed' | 'pending';

export default function CheckoutPage() {
  const { t } = useI18n();
  const searchParams = useSearchParams();

  const packParam = searchParams.get('pack');
  const packIndex = packParam !== null ? parseInt(packParam, 10) : NaN;
  const pack = isNaN(packIndex) ? null : (SLOT_UNLOCK_PACKS[packIndex] ?? null);

  // Omise.js script
  const [omiseReady, setOmiseReady] = useState(false);
  const [omiseError, setOmiseError] = useState<string | null>(null);
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.omise.co/omise.js';
    script.async = true;
    script.onload = () => {
      try {
        const key = process.env.NEXT_PUBLIC_OMISE_PUBLIC_KEY;
        if (key && window.Omise) {
          window.Omise.setPublicKey(key);
        } else if (!key) {
          console.warn('[checkout] NEXT_PUBLIC_OMISE_PUBLIC_KEY not set');
        }
      } catch (err) {
        console.error('[checkout] Omise init error:', err);
      }
      setOmiseReady(true);
    };
    script.onerror = () => {
      console.error('[checkout] Failed to load Omise.js CDN');
      setOmiseError('Payment system failed to load. Please refresh the page.');
      // Still mark ready so the button is clickable — we show the error on submit
      setOmiseReady(true);
    };
    document.head.appendChild(script);
    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  // Form state
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [cvc, setCvc] = useState('');

  // Payment state
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [purchaseId, setPurchaseId] = useState<string | null>(null);
  const [slotsAdded, setSlotsAdded] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Poll for pending payment status
  useEffect(() => {
    if (status !== 'pending' || !purchaseId) return;
    let stopped = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/slots/${purchaseId}`);
        if (!res.ok) return;
        const data = (await res.json()) as { status?: string; slots_added?: number };
        if (stopped) return;
        if (data.status === 'completed') {
          setSlotsAdded(data.slots_added ?? pack?.slots ?? 0);
          setStatus('success');
        } else if (data.status === 'failed') {
          setStatus('failed');
          setErrorMsg(t('slots.failed_desc'));
        }
        // else still pending — keep polling
      } catch {
        // network error — keep polling
      }
    };

    const interval = setInterval(() => {
      void poll();
    }, 3000);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [status, purchaseId, pack, t]);

  const createToken = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      window.Omise.createToken(
        'card',
        {
          name: cardName,
          number: cardNumber.replace(/\s/g, ''),
          expiration_month: expMonth,
          expiration_year: expYear,
          security_code: cvc,
        },
        (statusCode, response) => {
          if (statusCode === 200 && response.id) {
            resolve(response.id);
          } else {
            reject(new Error(response.message ?? 'Token creation failed'));
          }
        }
      );
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[checkout] form submitted', {
      pack: pack?.packIndex,
      omiseReady,
      omiseAvailable: !!window.Omise,
    });
    if (!pack) return;
    setStatus('submitting');
    setErrorMsg('');

    // Check Omise is actually available before attempting token creation
    if (!window.Omise || typeof window.Omise.createToken !== 'function') {
      setStatus('failed');
      setErrorMsg(omiseError ?? 'Payment system not loaded. Please refresh and try again.');
      return;
    }

    try {
      const token = await createToken();

      const res = await fetch('/api/slots/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packIndex: pack.packIndex, token }),
      });

      const data = (await res.json()) as {
        status?: string;
        purchase_id?: string;
        slots_added?: number;
        error?: string;
      };

      if (data.status === 'completed') {
        setSlotsAdded(data.slots_added ?? pack.slots);
        setStatus('success');
      } else if (data.status === 'pending') {
        setPurchaseId(data.purchase_id ?? null);
        setStatus('pending');
      } else {
        setStatus('failed');
        setErrorMsg(t('slots.failed_desc'));
      }
    } catch (err) {
      setStatus('failed');
      setErrorMsg(err instanceof Error ? err.message : t('slots.failed_desc'));
    }
  };

  // ── Invalid pack ───────────────────────────────────────────────────────────────

  if (!pack) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-charcoal-500 dark:text-white/50">{t('auth.error')}</p>
        <Link
          href="/landlord/properties"
          className="mt-4 inline-block text-sm font-medium text-saffron-700 hover:text-saffron-800"
        >
          {t('slots.back_to_dashboard')}
        </Link>
      </div>
    );
  }

  // ── Success ────────────────────────────────────────────────────────────────────

  if (status === 'success') {
    const totalLabel = t('slots.success_desc').replace('{{total}}', String(slotsAdded));
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sage-100 dark:bg-sage-500/15 mx-auto">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-8 w-8 text-sage-600 dark:text-sage-400"
          >
            <path
              fillRule="evenodd"
              d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <h2 className="mb-2 text-xl font-bold text-charcoal-900 dark:text-white">
          {t('slots.success_title')}
        </h2>
        <p className="mb-8 text-sm text-charcoal-500 dark:text-white/50">{totalLabel}</p>
        <div className="flex flex-col gap-3">
          <Link
            href="/landlord/properties/new"
            className="rounded-lg bg-saffron-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-saffron-600"
          >
            {t('slots.add_property')}
          </Link>
          <Link
            href="/landlord/properties"
            className="text-sm text-charcoal-400 hover:text-charcoal-600 dark:text-white/40 dark:hover:text-white/60"
          >
            {t('slots.back_to_dashboard')}
          </Link>
        </div>
      </div>
    );
  }

  // ── Failed ─────────────────────────────────────────────────────────────────────

  if (status === 'failed') {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/15 mx-auto">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-8 w-8 text-red-600 dark:text-red-400"
          >
            <path
              fillRule="evenodd"
              d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <h2 className="mb-2 text-xl font-bold text-charcoal-900 dark:text-white">
          {t('slots.failed_title')}
        </h2>
        <p className="mb-8 text-sm text-charcoal-500 dark:text-white/50">
          {errorMsg || t('slots.failed_desc')}
        </p>
        <button
          type="button"
          onClick={() => setStatus('idle')}
          className="rounded-lg bg-saffron-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-saffron-600"
        >
          {t('slots.try_again')}
        </button>
      </div>
    );
  }

  // ── Pending (PromptPay / async) ────────────────────────────────────────────────

  if (status === 'pending') {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-saffron-100 dark:bg-saffron-500/15 mx-auto">
          <svg className="h-8 w-8 animate-spin text-saffron-500" viewBox="0 0 24 24" fill="none">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>
        <h2 className="mb-2 text-xl font-bold text-charcoal-900 dark:text-white">
          {t('slots.processing')}
        </h2>
        <p className="text-sm text-charcoal-500 dark:text-white/50">{t('slots.pending_desc')}</p>
      </div>
    );
  }

  // ── Checkout form ──────────────────────────────────────────────────────────────

  const isSubmitting = status === 'submitting';

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      {/* Back link */}
      <Link
        href="/landlord/properties"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-charcoal-400 hover:text-charcoal-600 dark:text-white/40 dark:hover:text-white/60"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4"
        >
          <path
            fillRule="evenodd"
            d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
        {t('slots.back_to_dashboard')}
      </Link>

      <h1 className="mb-6 text-xl font-bold text-charcoal-900 dark:text-white">
        {t('slots.checkout_title')}
      </h1>

      {/* Order summary */}
      <div className="mb-6 rounded-2xl border border-warm-200 bg-warm-50 p-5 dark:border-white/10 dark:bg-charcoal-900">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-charcoal-900 dark:text-white">
              {
                [t('slots.pack_1_label'), t('slots.pack_5_label'), t('slots.pack_10_label')][
                  pack.packIndex
                ]
              }
            </p>
            {pack.slots > 1 && (
              <p className="mt-0.5 text-xs text-charcoal-500 dark:text-white/50">
                ฿{(pack.thb / pack.slots).toFixed(2)} {t('slots.per_slot')}
              </p>
            )}
          </div>
          <p className="text-xl font-bold text-charcoal-900 dark:text-white">
            ฿{pack.thb.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Omise CDN error banner */}
      {omiseError && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          {omiseError}
        </div>
      )}

      {/* Card form */}
      <div className="rounded-2xl border border-warm-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-charcoal-800">
        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          noValidate
        >
          <div className="space-y-4">
            {/* Name on card */}
            <div>
              <label
                htmlFor="card-name"
                className="mb-1 block text-sm font-medium text-charcoal-700 dark:text-white/70"
              >
                {t('slots.card_name')}
              </label>
              <input
                id="card-name"
                type="text"
                autoComplete="cc-name"
                required
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                disabled={isSubmitting}
                className="block w-full rounded-lg border border-warm-200 px-3 py-2.5 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500 disabled:opacity-50 dark:border-white/10 dark:bg-charcoal-800 dark:text-white dark:placeholder:text-white/40"
              />
            </div>

            {/* Card number */}
            <div>
              <label
                htmlFor="card-number"
                className="mb-1 block text-sm font-medium text-charcoal-700 dark:text-white/70"
              >
                {t('slots.card_number')}
              </label>
              <input
                id="card-number"
                type="text"
                autoComplete="cc-number"
                inputMode="numeric"
                required
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChange={(e) => {
                  // Format with spaces every 4 digits
                  const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
                  const formatted = raw.replace(/(.{4})/g, '$1 ').trim();
                  setCardNumber(formatted);
                }}
                disabled={isSubmitting}
                className="block w-full rounded-lg border border-warm-200 px-3 py-2.5 font-mono text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500 disabled:opacity-50 dark:border-white/10 dark:bg-charcoal-800 dark:text-white dark:placeholder:text-white/40"
              />
            </div>

            {/* Expiry + CVC */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="card-expiry"
                  className="mb-1 block text-sm font-medium text-charcoal-700 dark:text-white/70"
                >
                  {t('slots.expiry')}
                </label>
                <input
                  id="card-expiry"
                  type="text"
                  autoComplete="cc-exp"
                  inputMode="numeric"
                  required
                  placeholder="MM / YY"
                  value={
                    expMonth && expYear
                      ? `${expMonth} / ${expYear}`
                      : expMonth
                        ? `${expMonth} / `
                        : ''
                  }
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setExpMonth(raw.slice(0, 2));
                    setExpYear(raw.slice(2));
                  }}
                  disabled={isSubmitting}
                  className="block w-full rounded-lg border border-warm-200 px-3 py-2.5 font-mono text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500 disabled:opacity-50 dark:border-white/10 dark:bg-charcoal-800 dark:text-white dark:placeholder:text-white/40"
                />
              </div>
              <div>
                <label
                  htmlFor="card-cvc"
                  className="mb-1 block text-sm font-medium text-charcoal-700 dark:text-white/70"
                >
                  {t('slots.cvc')}
                </label>
                <input
                  id="card-cvc"
                  type="text"
                  autoComplete="cc-csc"
                  inputMode="numeric"
                  required
                  placeholder="123"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  disabled={isSubmitting}
                  className="block w-full rounded-lg border border-warm-200 px-3 py-2.5 font-mono text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500 disabled:opacity-50 dark:border-white/10 dark:bg-charcoal-800 dark:text-white dark:placeholder:text-white/40"
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-saffron-500 px-4 py-3 text-sm font-semibold text-white hover:bg-saffron-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                {t('slots.processing')}
              </>
            ) : (
              t('slots.pay_button').replace('{{amount}}', pack.thb.toLocaleString())
            )}
          </button>

          {/* Trust note */}
          <p className="mt-3 text-center text-xs text-charcoal-400 dark:text-white/40">
            {t('slots.secure_payment')}
          </p>
        </form>
      </div>
    </div>
  );
}
