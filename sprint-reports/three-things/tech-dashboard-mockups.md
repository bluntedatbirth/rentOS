# Landlord Dashboard Mockups — Three Things Scope

Three static mockup variants for the simplified landlord dashboard showing exactly three cards:

1. Active Properties
2. Unpaid Rent
3. Contracts Expiring Soon

All variants use the "People First" design language: warm white / charcoal / saffron / sage, DM Sans.
All mockups use **hardcoded placeholder data only** — no Supabase fetches, no server components.

---

## Mockup A — Classic Vertical Stack

**Preview:** Three full-width cards stacked vertically with generous vertical spacing. Every card is immediately legible above the fold on a 375px phone screen. The greeting sits at the top with the language toggle flush right. Each card has a label, a large number, a secondary detail line, and a right-aligned action link. Nothing competes for attention — the eye scans top to bottom in a single pass. Thai landlords who open the app in a taxi get the full picture without scrolling.

**Trade-offs:**

- Pick this when: you want zero visual risk for the validation — predictable, accessible, works perfectly on every screen size from 320px up.
- Skip this when: you want the ฿ amount to feel urgent — equal card weights make all three items feel equivalent.
- Skip this when: you have a tablet or desktop audience who expects a denser layout.

```tsx
'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n/context';

export function DashboardMockupA() {
  const { t, locale, setLocale } = useI18n();

  const LOCALES = ['th', 'en', 'zh-CN'] as const;
  const nextLocale =
    LOCALES[(LOCALES.indexOf(locale as (typeof LOCALES)[number]) + 1) % LOCALES.length];

  const cards = [
    {
      label: t('dashboard.active_properties'),
      value: '12',
      sub: 'Ekkamai Flat #199 · Thonglor Studio #402 · +10 more',
      color: 'text-charcoal-900',
      actionLabel: 'View all',
      href: '/landlord/properties',
      accent: 'border-warm-200',
    },
    {
      label: 'Unpaid Rent',
      value: '3 tenants',
      sub: '฿47,500 outstanding',
      color: 'text-saffron-600',
      actionLabel: 'Review',
      href: '/landlord/payments',
      accent: 'border-warm-200',
    },
    {
      label: 'Contracts Expiring Soon',
      value: '2',
      sub: 'Within the next 30 days',
      color: 'text-sage-500',
      actionLabel: 'Review',
      href: '/landlord/contracts?filter=expiring',
      accent: 'border-warm-200',
    },
  ];

  return (
    <div className="min-h-screen bg-warm-50 px-4 py-6 font-sans">
      <div className="mx-auto max-w-md">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-charcoal-900">{t('dashboard.landlord_title')}</h1>
            <p className="text-sm text-charcoal-500">{t('dashboard.welcome')}, Khun Somchai</p>
          </div>
          <button
            onClick={() => setLocale(nextLocale)}
            className="rounded-md border border-warm-200 bg-warm-50 px-3 py-1.5 text-xs font-medium text-charcoal-600 hover:bg-warm-100"
          >
            {locale === 'th' ? 'ภาษาไทย' : locale === 'en' ? 'EN' : '中文'}
          </button>
        </div>

        {/* Three vertical cards */}
        <div className="flex flex-col gap-4">
          {cards.map((card) => (
            <div
              key={card.label}
              className={`rounded-xl border ${card.accent} bg-white px-5 py-4 shadow-sm`}
            >
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-charcoal-500">
                {card.label}
              </p>
              <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
              <p className="mt-1 text-sm text-charcoal-500">{card.sub}</p>
              <div className="mt-3 text-right">
                <Link
                  href={card.href}
                  className="text-sm font-semibold text-saffron-600 hover:text-saffron-700"
                >
                  {card.actionLabel} →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## Mockup B — 2×2 Grid with Unpaid Rent Emphasis

**Preview:** On mobile (< 768px) the three cards stack vertically just like Mockup A — the grid collapses gracefully. On tablet/desktop the layout becomes a 2-column grid: the "Unpaid Rent" card spans the full width of the left column (col-span-1 but visually dominant via a saffron accent border and larger ฿ figure), while "Active Properties" and "Contracts Expiring" stack in the right column. The ฿47,500 figure is rendered at `text-5xl`, the border pulses with a subtle CSS animation, and the card background uses `bg-saffron-50`. A landlord glancing at their phone sees the money number first, then the two supporting cards.

**Trade-offs:**

- Pick this when: you want urgency around unpaid rent without fully demoting the other cards — good balance of hierarchy and information density on larger screens.
- Skip this when: the validation landlords are purely on phones — the emphasis effect is strongest at tablet width, somewhat lost at 375px where the cards still stack.
- Skip this when: the saffron pulse animation feels too aggressive for a "calm" brand tone.

```tsx
'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n/context';

export function DashboardMockupB() {
  const { t, locale, setLocale } = useI18n();

  const LOCALES = ['th', 'en', 'zh-CN'] as const;
  const nextLocale =
    LOCALES[(LOCALES.indexOf(locale as (typeof LOCALES)[number]) + 1) % LOCALES.length];

  return (
    <div className="min-h-screen bg-warm-50 px-4 py-6 font-sans">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-charcoal-900">{t('dashboard.landlord_title')}</h1>
            <p className="text-sm text-charcoal-500">{t('dashboard.welcome')}, Khun Somchai</p>
          </div>
          <button
            onClick={() => setLocale(nextLocale)}
            className="rounded-md border border-warm-200 bg-warm-50 px-3 py-1.5 text-xs font-medium text-charcoal-600 hover:bg-warm-100"
          >
            {locale === 'th' ? 'ภาษาไทย' : locale === 'en' ? 'EN' : '中文'}
          </button>
        </div>

        {/* Grid: on mobile all stack; on md+ 2-column */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Unpaid Rent — emphasized, spans full left column on md+ */}
          <Link
            href="/landlord/payments"
            className="block animate-[pulse_3s_ease-in-out_infinite] rounded-xl border-2 border-saffron-400 bg-saffron-50 px-5 py-5 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-saffron-500 md:row-span-2"
          >
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-saffron-700">
              Unpaid Rent
            </p>
            <p className="text-5xl font-bold text-saffron-600">3</p>
            <p className="mt-1 text-sm font-semibold text-saffron-700">tenants</p>
            <p className="mt-3 text-2xl font-bold text-charcoal-900">฿47,500</p>
            <p className="mt-1 text-sm text-charcoal-500">outstanding balance</p>
            <div className="mt-4">
              <span className="inline-block rounded-md bg-saffron-500 px-4 py-2 text-sm font-semibold text-white hover:bg-saffron-600">
                Review →
              </span>
            </div>
          </Link>

          {/* Active Properties */}
          <Link
            href="/landlord/properties"
            className="block rounded-xl border border-warm-200 bg-white px-5 py-4 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-saffron-500"
          >
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-charcoal-500">
              {t('dashboard.active_properties')}
            </p>
            <p className="text-3xl font-bold text-charcoal-900">12</p>
            <p className="mt-1 text-sm text-charcoal-500">
              Ekkamai Flat #199 · Thonglor Studio #402 · +10
            </p>
            <p className="mt-3 text-sm font-semibold text-saffron-600">View all →</p>
          </Link>

          {/* Contracts Expiring Soon */}
          <Link
            href="/landlord/contracts?filter=expiring"
            className="block rounded-xl border border-sage-200 bg-sage-50 px-5 py-4 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-saffron-500"
          >
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-sage-600">
              Contracts Expiring Soon
            </p>
            <p className="text-3xl font-bold text-sage-500">2</p>
            <p className="mt-1 text-sm text-charcoal-500">Within 30 days</p>
            <p className="mt-3 text-sm font-semibold text-saffron-600">Review →</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
```

---

## Mockup C — Asymmetric Hero

**Preview:** A single large hero card dominates the top two-thirds of the viewport: "Unpaid Rent" with the ฿47,500 total rendered at `text-6xl` in saffron, and a count of 3 tenants below it with property names listed. Two compact secondary cards sit below the hero in a side-by-side row (50/50 split). On a 375px phone, the hero card alone fills the visible screen — a Thai landlord sees the most important number before their thumb moves. The secondary cards are visible just below the fold, nudging a single scroll. The hierarchy is unambiguous: money first, everything else supporting.

**Trade-offs:**

- Pick this when: the validation goal is to confirm landlords immediately understand unpaid rent status — this is the clearest signal-to-noise ratio for that one number.
- Pick this when: you want a distinctive, opinionated design that stands out in a landlord interview and sparks a reaction.
- Skip this when: a landlord has zero unpaid rent — the hero card with "0 tenants / ฿0" feels disproportionately large and alarming for nothing.

```tsx
'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n/context';

export function DashboardMockupC() {
  const { t, locale, setLocale } = useI18n();

  const LOCALES = ['th', 'en', 'zh-CN'] as const;
  const nextLocale =
    LOCALES[(LOCALES.indexOf(locale as (typeof LOCALES)[number]) + 1) % LOCALES.length];

  return (
    <div className="min-h-screen bg-warm-50 px-4 py-6 font-sans">
      <div className="mx-auto max-w-md">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-charcoal-900">{t('dashboard.landlord_title')}</h1>
            <p className="text-sm text-charcoal-500">{t('dashboard.welcome')}, Khun Somchai</p>
          </div>
          <button
            onClick={() => setLocale(nextLocale)}
            className="rounded-md border border-warm-200 bg-warm-50 px-3 py-1.5 text-xs font-medium text-charcoal-600 hover:bg-warm-100"
          >
            {locale === 'th' ? 'ภาษาไทย' : locale === 'en' ? 'EN' : '中文'}
          </button>
        </div>

        {/* Hero card — Unpaid Rent */}
        <Link
          href="/landlord/payments"
          className="mb-4 block rounded-2xl border border-saffron-300 bg-white px-6 py-8 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-saffron-500"
        >
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-charcoal-500">
            Unpaid Rent
          </p>
          <p className="text-6xl font-bold leading-none text-saffron-600">฿47,500</p>
          <p className="mt-2 text-lg font-semibold text-charcoal-700">3 tenants</p>
          <div className="mt-3 space-y-1">
            <p className="text-sm text-charcoal-500">· Ekkamai Flat #199 — ฿22,000</p>
            <p className="text-sm text-charcoal-500">· Thonglor Studio #402 — ฿15,500</p>
            <p className="text-sm text-charcoal-400">· +1 more</p>
          </div>
          <div className="mt-5">
            <span className="inline-block rounded-lg bg-saffron-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-saffron-600">
              Review now →
            </span>
          </div>
        </Link>

        {/* Two secondary cards side by side */}
        <div className="grid grid-cols-2 gap-3">
          {/* Active Properties */}
          <Link
            href="/landlord/properties"
            className="block rounded-xl border border-warm-200 bg-white px-4 py-4 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-saffron-500"
          >
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-charcoal-500">
              {t('dashboard.active_properties')}
            </p>
            <p className="text-3xl font-bold text-charcoal-900">12</p>
            <p className="mt-1 text-xs text-charcoal-500">properties</p>
            <p className="mt-3 text-xs font-semibold text-saffron-600">View all →</p>
          </Link>

          {/* Contracts Expiring */}
          <Link
            href="/landlord/contracts?filter=expiring"
            className="block rounded-xl border border-sage-200 bg-sage-50 px-4 py-4 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-saffron-500"
          >
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-sage-600">
              Expiring Soon
            </p>
            <p className="text-3xl font-bold text-sage-500">2</p>
            <p className="mt-1 text-xs text-charcoal-500">within 30 days</p>
            <p className="mt-3 text-xs font-semibold text-saffron-600">Review →</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
```

---

## Bonus: Tenant Dashboard — Single Variant

Matches the Mockup C design language. Three cards for tenants, with the "Days Until Expiry" card conditionally hidden when > 60 days remain.

**Preview:** A clean vertical stack on mobile. The "My Contract" card shows the property name and lease period at a glance. The "Next Payment" card renders the ฿ amount prominently in saffron with a "Mark as paid" button. If the lease expires within 60 days, a third card appears — a countdown in large sage numerals with an urgent edge.

```tsx
'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n/context';

// Sample hardcoded data
const SAMPLE_DAYS_UNTIL_EXPIRY = 28; // set > 60 to hide the expiry card

export function TenantDashboardMockup() {
  const { t } = useI18n();

  const showExpiryCard = SAMPLE_DAYS_UNTIL_EXPIRY <= 60;

  return (
    <div className="min-h-screen bg-warm-50 px-4 py-6 font-sans">
      <div className="mx-auto max-w-md">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-charcoal-900">{t('dashboard.tenant_title')}</h1>
          <p className="text-sm text-charcoal-500">{t('dashboard.welcome')}, Khun Malee</p>
        </div>

        <div className="flex flex-col gap-4">
          {/* Card 1: My Contract */}
          <Link
            href="/tenant/contract/view"
            className="block rounded-xl border border-warm-200 bg-white px-5 py-4 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-saffron-500"
          >
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-charcoal-500">
              {t('tenant.your_property')}
            </p>
            <p className="text-lg font-bold text-charcoal-900">Ekkamai Flat #199</p>
            <div className="mt-2 flex items-center gap-4 text-sm text-charcoal-500">
              <span>2025-05-01</span>
              <span className="text-charcoal-300">→</span>
              <span>2026-04-30</span>
            </div>
            <p className="mt-3 text-sm font-semibold text-saffron-600">View contract →</p>
          </Link>

          {/* Card 2: Next Payment */}
          <div className="rounded-xl border border-warm-200 bg-white px-5 py-4 shadow-sm">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-charcoal-500">
              Next Payment
            </p>
            <p className="text-4xl font-bold text-saffron-600">฿22,000</p>
            <p className="mt-1 text-sm text-charcoal-500">Due on May 1, 2026</p>
            <div className="mt-4">
              <button className="rounded-lg bg-saffron-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-saffron-600 focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:ring-offset-1">
                Mark as paid
              </button>
            </div>
          </div>

          {/* Card 3: Days Until Expiry — shown only when <= 60 days */}
          {showExpiryCard && (
            <Link
              href="/tenant/contract/view"
              className="block rounded-xl border border-sage-300 bg-sage-50 px-5 py-4 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-saffron-500"
            >
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-sage-600">
                Days Until Lease Expires
              </p>
              <p className="text-5xl font-bold text-sage-500">{SAMPLE_DAYS_UNTIL_EXPIRY}</p>
              <p className="mt-1 text-sm text-charcoal-500">days remaining</p>
              <p className="mt-3 text-sm font-semibold text-saffron-600">
                {t('dashboard.lease_expiry_action')} →
              </p>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## Recommendation

**Mockup C — Asymmetric Hero** is the strongest choice for the validation goal. Thai landlords between tenant meetings on a phone care about one number above all others: how much money is owed to them right now. Mockup C puts ฿47,500 at `text-6xl` in saffron — it fills the screen and requires no parsing. The two secondary cards are visible with a single small scroll, so no information is hidden; it simply establishes clear priority. The asymmetric layout also generates a stronger reaction in user interviews than the safe vertical stack, which helps distinguish "I understood it immediately" from "I just found it acceptable." For a 5-landlord validation session, you want strong signal, not diplomatic non-answers.
