'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/supabase/useAuth';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/context';

interface BillingExtras {
  tier_expires_at: string | null;
  founding_member: boolean | null;
}

const PRO_BULLET_KEYS = [
  'billing.hub_pro_bullet_1',
  'billing.hub_pro_bullet_2',
  'billing.hub_pro_bullet_3',
  'billing.hub_pro_bullet_4',
] as const;

export default function BillingDashboardPage() {
  const { t, formatDate } = useI18n();
  const { user, profile, loading } = useAuth();
  const [extras, setExtras] = useState<BillingExtras | null>(null);

  const isSimulated = process.env.NEXT_PUBLIC_PAYMENTS_SIMULATED === 'true';
  const tier = profile?.tier ?? 'free';
  const isPro = tier === 'pro';
  const purchasedSlots = profile?.purchased_slots ?? 0;
  const totalSlots = 2 + purchasedSlots;

  // Fetch tier_expires_at + founding_member directly — useAuth's profile shape
  // doesn't include them. Single round-trip, only when we have a logged-in user.
  useEffect(() => {
    if (!user?.id) return;
    const supabase = createClient();
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('tier_expires_at, founding_member')
        .eq('id', user.id)
        .single();
      if (cancelled) return;
      setExtras({
        tier_expires_at: data?.tier_expires_at ?? null,
        founding_member: data?.founding_member ?? null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const isFoundingMember = isPro && extras?.founding_member === true;
  const tierExpiresAt = extras?.tier_expires_at ?? null;

  // Pro plan card uses saffron accent only when tier === 'pro'
  const planCardClass = isPro
    ? 'rounded-lg border border-saffron-300 bg-saffron-50 p-6 shadow-sm dark:border-saffron-500/20 dark:bg-saffron-500/10 dark:shadow-black/20'
    : 'rounded-lg border border-warm-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-charcoal-800 dark:shadow-black/20';

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 pb-12">
      <h1 className="text-xl font-bold text-charcoal-900 dark:text-white">
        {t('billing.dashboard_title')}
      </h1>

      {loading ? (
        // Skeleton: three card placeholders so the page never renders empty
        <>
          <div className="h-32 animate-pulse rounded-lg border border-warm-200 bg-warm-50 dark:border-white/10 dark:bg-charcoal-900" />
          <div className="h-32 animate-pulse rounded-lg border border-warm-200 bg-warm-50 dark:border-white/10 dark:bg-charcoal-900" />
          <div className="h-32 animate-pulse rounded-lg border border-warm-200 bg-warm-50 dark:border-white/10 dark:bg-charcoal-900" />
        </>
      ) : (
        <>
          {/* ── Current plan card ─────────────────────────────────────────── */}
          <section className={planCardClass}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-charcoal-500 dark:text-white/50">
                  {t('billing.hub_current_plan_title')}
                </h2>
                <p className="mt-1 text-2xl font-bold text-charcoal-900 dark:text-white">
                  {isPro ? t('billing.hub_tier_pro') : t('billing.hub_tier_free')}
                </p>
                {isPro && tierExpiresAt && (
                  <p className="mt-1 text-sm text-charcoal-600 dark:text-white/60">
                    {t('billing.hub_active_until').replace('{date}', formatDate(tierExpiresAt))}
                  </p>
                )}
              </div>
              {isFoundingMember && (
                <span className="inline-flex shrink-0 items-center self-start rounded-full border border-saffron-300 bg-saffron-100 px-3 py-1 text-xs font-semibold text-saffron-800 dark:border-saffron-500/20 dark:bg-saffron-500/15 dark:text-saffron-300">
                  {t('billing.hub_founding_pill')}
                </span>
              )}
            </div>
          </section>

          {/* ── Slots card ───────────────────────────────────────────────── */}
          <section className="rounded-lg border border-warm-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-charcoal-800 dark:shadow-black/20">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-charcoal-900 dark:text-white">
                  {t('billing.hub_slots_title')}
                </h2>
                <p className="mt-1 text-sm text-charcoal-600 dark:text-white/60">
                  {t('billing.hub_slots_summary').replace('{total}', String(totalSlots))}
                </p>
              </div>
              {isSimulated && (
                <span className="inline-flex shrink-0 items-center self-start rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800 dark:border-sky-500/20 dark:bg-sky-500/15 dark:text-sky-300">
                  {t('billing.hub_sim_pill')}
                </span>
              )}
            </div>
            <Link
              href="/landlord/billing/slots"
              className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-saffron-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-saffron-600 sm:w-auto"
            >
              {t('billing.hub_slots_cta')}
            </Link>
          </section>

          {/* ── Pro upgrade card ─────────────────────────────────────────── */}
          <section className="rounded-lg border border-warm-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-charcoal-800 dark:shadow-black/20">
            <h2 className="text-base font-semibold text-charcoal-900 dark:text-white">
              {t('billing.hub_pro_title')}
            </h2>
            <p className="mt-1 text-sm text-charcoal-600 dark:text-white/60">
              {isPro ? t('billing.hub_pro_subtitle_pro') : t('billing.hub_pro_subtitle_free')}
            </p>
            <ul className="mt-4 space-y-2">
              {PRO_BULLET_KEYS.map((key) => (
                <li
                  key={key}
                  className="flex items-start gap-2 text-sm text-charcoal-700 dark:text-white/70"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="mt-0.5 h-4 w-4 shrink-0 text-sage-500"
                    aria-hidden="true"
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
            <Link
              href="/landlord/billing/upgrade"
              className="mt-5 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-sage-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sage-600 sm:w-auto"
            >
              {isPro ? t('billing.hub_pro_cta_pro') : t('billing.hub_pro_cta_free')}
            </Link>
          </section>
        </>
      )}

      {/* ── Beta banner (kept) ───────────────────────────────────────────── */}
      <section className="rounded-lg border border-green-200 bg-green-50 p-6 shadow-sm dark:border-green-500/20 dark:bg-green-500/15 dark:shadow-black/20">
        <h2 className="text-base font-semibold text-green-900 dark:text-green-400">
          {t('billing.beta_banner_title')}
        </h2>
        <p className="mt-2 text-sm text-green-800 dark:text-green-400">
          {t('billing.beta_banner_body')}
        </p>
      </section>
    </div>
  );
}
