'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';
import { useToast } from '@/components/ui/ToastProvider';
import { getPropertyLimit } from '@/lib/tier';

export default function NewPropertyPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [leaseStart, setLeaseStart] = useState('');
  const [leaseDuration, setLeaseDuration] = useState<'1' | '3' | '6' | '12' | '24' | 'custom'>(
    '12'
  );
  const [leaseEnd, setLeaseEnd] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [dailyRate, setDailyRate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ leaseEnd?: string; monthlyRent?: string }>({});

  // Auto-compute lease end from start + duration (UTC to avoid timezone shifts)
  function computeLeaseEnd(start: string, months: number): string {
    const y = parseInt(start.slice(0, 4), 10);
    const m = parseInt(start.slice(5, 7), 10);
    const day = parseInt(start.slice(8, 10), 10);
    const d = new Date(Date.UTC(y, m - 1 + months, day - 1));
    return d.toISOString().split('T')[0]!;
  }

  function handleLeaseStartChange(value: string) {
    setLeaseStart(value);
    if (errors.leaseEnd) setErrors((prev) => ({ ...prev, leaseEnd: undefined }));
    if (value && leaseDuration !== 'custom') {
      setLeaseEnd(computeLeaseEnd(value, Number(leaseDuration)));
    }
  }

  const selectedMonths = leaseDuration === 'custom' ? null : Number(leaseDuration);
  const isShortTerm = selectedMonths !== null && selectedMonths < 3;

  function handleDurationChange(dur: '1' | '3' | '6' | '12' | '24' | 'custom') {
    setLeaseDuration(dur);
    if (dur !== 'custom' && leaseStart) {
      setLeaseEnd(computeLeaseEnd(leaseStart, Number(dur)));
    }
    if (dur === 'custom') {
      setLeaseEnd(''); // clear so user picks manually
    }
  }

  // Slot-limit check
  const profileTier = profile?.tier ?? 'free';
  const profilePurchasedSlots = profile?.purchased_slots ?? 0;
  const slotLimit = getPropertyLimit(profileTier, profilePurchasedSlots);
  // We need the count of existing properties to know if we're at the limit.
  // The API enforces this server-side; we only show a client-side gate if profile
  // exposes a `property_count` field. If not available, we always show the form
  // and let the API return 403 if the limit is exceeded.
  const propertyCount: number =
    (profile as Record<string, unknown> & { property_count?: number })?.property_count ?? 0;
  const atSlotLimit = slotLimit !== Infinity && propertyCount >= slotLimit;

  function validate(): boolean {
    const nextErrors: { leaseEnd?: string; monthlyRent?: string } = {};

    if (leaseStart && leaseEnd && leaseEnd <= leaseStart) {
      nextErrors.leaseEnd = t('property.lease_end_error');
    }

    const rent = monthlyRent.trim();
    if (rent !== '') {
      const parsed = Number(rent);
      if (isNaN(parsed) || parsed <= 0) {
        nextErrors.monthlyRent = t('property.rent_error');
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
      };
      if (address.trim()) body.address = address.trim();
      if (unitNumber.trim()) body.unit_number = unitNumber.trim();
      if (leaseStart) body.lease_start = leaseStart;
      if (leaseEnd) body.lease_end = leaseEnd;
      if (isShortTerm && dailyRate) body.daily_rate = Number(dailyRate);
      if (!isShortTerm && monthlyRent.trim()) body.monthly_rent = Number(monthlyRent.trim());

      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = (await res.json()) as { id: string };
        router.push(`/landlord/properties/${data.id}`);
      } else {
        let errorMessage = t('auth.error');
        try {
          const json = (await res.json()) as { error?: string; message?: string };
          if (json.error === 'property_limit_reached') {
            errorMessage = t('properties.slots_full_toast');
          } else if (json.message) {
            errorMessage = json.message;
          }
        } catch {
          // non-JSON response — fall back to generic error
        }
        toast.error(errorMessage);
      }
    } catch {
      toast.error(t('auth.error'));
    } finally {
      setSubmitting(false);
    }
  }

  // Slot-limit gate — shown instead of form when limit is known to be hit client-side
  if (atSlotLimit) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <div className="rounded-2xl border border-warm-200 bg-warm-50 p-8 text-center shadow-sm dark:border-white/10 dark:bg-charcoal-900 dark:shadow-black/20">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/15">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-7 w-7 text-amber-500 dark:text-amber-400"
            >
              <path
                fillRule="evenodd"
                d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 1.998-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h2 className="mb-2 text-lg font-bold text-charcoal-900 dark:text-white">
            {t('property.slots_full_title')}
          </h2>
          <p className="mb-6 text-sm text-charcoal-500 dark:text-white/50">
            {t('property.slots_full_body')}
          </p>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-charcoal-600 dark:text-white/60">
              Contact us to add more slots.
            </p>
            <Link
              href="/landlord/properties"
              className="text-sm text-charcoal-400 hover:text-charcoal-600 dark:text-white/40 dark:hover:text-white/60"
            >
              {t('common.cancel')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      {/* Page header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/landlord/properties"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-warm-200 bg-white text-charcoal-400 hover:bg-warm-100 dark:border-white/10 dark:bg-charcoal-800 dark:text-white/40 dark:hover:bg-white/10"
          aria-label={t('common.back')}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-5 w-5"
          >
            <path
              fillRule="evenodd"
              d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </Link>
        <h1 className="text-xl font-bold text-charcoal-900 dark:text-white">
          {t('property.new_title')}
        </h1>
      </div>

      {/* Form card */}
      <div className="rounded-2xl border border-warm-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-charcoal-800 dark:shadow-black/20">
        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-4">
            {/* Name — required */}
            <div>
              <label
                htmlFor="prop-name"
                className="mb-1 block text-sm font-medium text-charcoal-700 dark:text-white/70"
              >
                {t('property.name')}
                <span className="ml-1 text-red-500">*</span>
              </label>
              <input
                id="prop-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('property.name_placeholder')}
                className="block w-full rounded-lg border border-warm-200 px-3 py-2.5 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500 dark:border-white/10 dark:bg-charcoal-800 dark:text-white dark:placeholder:text-white/40"
              />
            </div>

            {/* Address — optional */}
            <div>
              <label
                htmlFor="prop-address"
                className="mb-1 block text-sm font-medium text-charcoal-700 dark:text-white/70"
              >
                {t('property.address')}
              </label>
              <input
                id="prop-address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t('property.address_placeholder')}
                className="block w-full rounded-lg border border-warm-200 px-3 py-2.5 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500 dark:border-white/10 dark:bg-charcoal-800 dark:text-white dark:placeholder:text-white/40"
              />
            </div>

            {/* Unit Number — optional */}
            <div>
              <label
                htmlFor="prop-unit"
                className="mb-1 block text-sm font-medium text-charcoal-700 dark:text-white/70"
              >
                {t('property.unit')}
              </label>
              <input
                id="prop-unit"
                type="text"
                value={unitNumber}
                onChange={(e) => setUnitNumber(e.target.value)}
                placeholder={t('property.unit_placeholder')}
                className="block w-full rounded-lg border border-warm-200 px-3 py-2.5 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500 dark:border-white/10 dark:bg-charcoal-800 dark:text-white dark:placeholder:text-white/40"
              />
            </div>

            {/* Lease Start */}
            <div>
              <label
                htmlFor="prop-lease-start"
                className="mb-1 block text-sm font-medium text-charcoal-700 dark:text-white/70"
              >
                {t('property.lease_start')}
              </label>
              <input
                id="prop-lease-start"
                type="date"
                value={leaseStart}
                onChange={(e) => handleLeaseStartChange(e.target.value)}
                className="block w-full rounded-lg border border-warm-200 px-3 py-2.5 text-sm text-charcoal-900 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500 dark:border-white/10 dark:bg-charcoal-800 dark:text-white"
              />
            </div>

            {/* Lease Duration selector */}
            {leaseStart && (
              <div>
                <label className="mb-1 block text-sm font-medium text-charcoal-700 dark:text-white/70">
                  {t('property.lease_duration')}
                </label>
                <div className="flex gap-2">
                  {[
                    { value: '1' as const, label: t('property.duration_1mo') },
                    { value: '3' as const, label: t('property.duration_3mo') },
                    { value: '6' as const, label: t('property.duration_6mo') },
                    { value: '12' as const, label: t('property.duration_1yr') },
                    { value: '24' as const, label: t('property.duration_2yr') },
                    { value: 'custom' as const, label: t('property.duration_custom') },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleDurationChange(opt.value)}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        leaseDuration === opt.value
                          ? 'border-saffron-500 bg-saffron-50 text-saffron-700 dark:bg-saffron-500/10 dark:text-saffron-400'
                          : 'border-warm-200 text-charcoal-600 hover:bg-warm-50 dark:border-white/10 dark:text-white/60 dark:hover:bg-white/5'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Lease End — auto-filled or manual for custom */}
            {leaseStart && (
              <div>
                <label
                  htmlFor="prop-lease-end"
                  className="mb-1 block text-sm font-medium text-charcoal-700 dark:text-white/70"
                >
                  {t('property.lease_end')}
                </label>
                <input
                  id="prop-lease-end"
                  type="date"
                  value={leaseEnd}
                  readOnly={leaseDuration !== 'custom'}
                  onChange={(e) => {
                    setLeaseEnd(e.target.value);
                    if (errors.leaseEnd) setErrors((prev) => ({ ...prev, leaseEnd: undefined }));
                  }}
                  className={`block w-full rounded-lg border px-3 py-2.5 text-sm text-charcoal-900 focus:outline-none focus:ring-1 dark:text-white ${
                    leaseDuration !== 'custom'
                      ? 'bg-warm-50 text-charcoal-500 dark:bg-charcoal-900 dark:text-white/50'
                      : 'dark:bg-charcoal-800'
                  } ${
                    errors.leaseEnd
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                      : 'border-warm-200 focus:border-saffron-500 focus:ring-saffron-500 dark:border-white/10'
                  }`}
                />
                {errors.leaseEnd && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.leaseEnd}</p>
                )}
              </div>
            )}

            {/* Daily Rate (short-term) or Monthly Rent — optional, with ฿ prefix */}
            {isShortTerm ? (
              <div>
                <label
                  htmlFor="prop-daily-rate"
                  className="mb-1 block text-sm font-medium text-charcoal-700 dark:text-white/70"
                >
                  {t('property.daily_rate')}
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-charcoal-400 dark:text-white/40">
                    ฿
                  </span>
                  <input
                    id="prop-daily-rate"
                    type="number"
                    min="1"
                    step="any"
                    value={dailyRate}
                    onChange={(e) => setDailyRate(e.target.value)}
                    placeholder={t('property.daily_rate_placeholder')}
                    className="block w-full rounded-lg border border-warm-200 pl-7 pr-3 py-2.5 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none dark:border-white/10 dark:bg-charcoal-800 dark:text-white dark:placeholder:text-white/40"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label
                  htmlFor="prop-rent"
                  className="mb-1 block text-sm font-medium text-charcoal-700 dark:text-white/70"
                >
                  {t('property.monthly_rent')}
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-charcoal-400 dark:text-white/40">
                    ฿
                  </span>
                  <input
                    id="prop-rent"
                    type="number"
                    min="1"
                    step="any"
                    value={monthlyRent}
                    onChange={(e) => {
                      setMonthlyRent(e.target.value);
                      if (errors.monthlyRent)
                        setErrors((prev) => ({ ...prev, monthlyRent: undefined }));
                    }}
                    placeholder={t('property.monthly_rent_placeholder')}
                    className={`block w-full rounded-lg border pl-7 pr-3 py-2.5 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:ring-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none dark:bg-charcoal-800 dark:text-white dark:placeholder:text-white/40 ${
                      errors.monthlyRent
                        ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                        : 'border-warm-200 focus:border-saffron-500 focus:ring-saffron-500 dark:border-white/10'
                    }`}
                  />
                </div>
                {errors.monthlyRent && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {errors.monthlyRent}
                  </p>
                )}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="min-h-[44px] w-full rounded-lg bg-saffron-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-saffron-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  {t('property.creating')}
                </span>
              ) : (
                t('property.add')
              )}
            </button>
          </div>
        </form>

        {/* Divider + upload contract link */}
        <div className="relative mt-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-warm-200 dark:border-white/10" />
          </div>
          <div className="relative flex justify-center">
            <Link
              href="/landlord/contracts/upload"
              className="bg-white px-4 text-sm text-saffron-600 hover:text-saffron-800 dark:bg-charcoal-800"
            >
              {t('property.or_upload_contract')} &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
