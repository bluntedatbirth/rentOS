# Tenant Dashboard Mockups — Tenant Polish Sprint

Three static mockup variants for the simplified tenant dashboard. All three:

- Use the **"People First"** design language: warm white / charcoal / saffron / sage, DM Sans
- **Omit** penalties stat card, maintenance section, quick-action buttons for gated features
- Render all lease dates via `formatDisplayDate()` → DD/MM/YYYY
- Reserve vertical space for the pending-renewal + lease-expiry banners to prevent CLS
- Use only inline SVG — no `lucide-react`, no new deps

The tenant dashboard's job is to answer two questions in one glance:

1. **Is my lease in order?** → contract card + status + lease period
2. **Do I owe anything?** → next payment / recent payment status

Everything else is secondary. Per PO 2026-04-11: _"the direction we're heading right now is simplification and reduction"_.

---

## Mockup A — Single-Column Scroll (Calmest)

**Preview:** A single vertical stack. Greeting → optional renewal/expiry banner → contract card → "Next payment" card → two quick-action tiles. Every card is full-width. Each card breathes — 16px margins, generous padding. On a 375px phone, the contract card is fully visible above the fold; the payment card sits just below. No 2-column stat grids anywhere. This variant assumes the tenant rarely returns to the dashboard — it's designed for the "I opened this to check one thing" visit.

**Trade-offs:**

- Pick this when: you want the gentlest, most skimmable layout. Zero visual risk. Works perfectly from 320px up.
- Skip this when: you want more info density on tablet/desktop — the wide-screen version feels too sparse.
- Skip this when: you want a "snapshot feel" — this variant reads like a list, not a dashboard.

**Structure:**

```
┌─────────────────────────────────────┐
│  Hi, {name}                         │
│  Here's your rental at a glance     │
├─────────────────────────────────────┤
│  [renewal banner, if pending]       │  ← reserved space
│  [expiry banner, if ≤30 days]       │  ← reserved space
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐  │
│  │ 🏠 Sukhumvit Residences    ●  │  │ ← contract card
│  │ Lease period                  │  │
│  │ 01/01/2026 → 31/12/2026       │  │
│  │ Monthly rent      ฿25,000     │  │
│  │                   View lease →│  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 💳 Next payment               │  │ ← payments card
│  │ Due 01/05/2026       ฿25,000  │  │
│  │ 20 days away                  │  │
│  │                View payments →│  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌─────────────┐  ┌─────────────┐  │
│  │ View lease  │  │ My payments │  │ ← quick actions
│  └─────────────┘  └─────────────┘  │
└─────────────────────────────────────┘
```

**JSX sketch:**

```tsx
<div className="mx-auto max-w-2xl">
  <h2 className="text-xl font-bold text-charcoal-900">
    {t('dashboard.hi_name').replace('{name}', fullName ?? '')}
  </h2>
  <p className="mb-6 text-sm text-charcoal-500">{t('dashboard.tenant_subtitle')}</p>

  {/* Banner slot — reserves vertical space even when empty */}
  <div className="min-h-[72px] mb-4">
    {pendingRenewal && <RenewalBanner />}
    {!pendingRenewal && daysUntilExpiry !== null && daysUntilExpiry <= 30 && <ExpiryBanner />}
  </div>

  {/* Contract card */}
  <Link href="/tenant/contract/view" className="block mb-4">
    <Card className="hover:shadow-md transition-shadow">
      {/* header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sage-100">
            <HomeIcon />
          </span>
          <p className="text-sm font-semibold text-charcoal-900">
            {contract?.properties?.name ?? '—'}
          </p>
        </div>
        <StatusBadge status={contract?.status ?? 'none'} />
      </div>
      {/* detail rows */}
      <dl className="mt-4 space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-charcoal-500">{t('contract.lease_period')}</dt>
          <dd className="font-medium text-charcoal-900">
            {contract?.lease_start ? formatDisplayDate(contract.lease_start) : '—'} →{' '}
            {contract?.lease_end ? formatDisplayDate(contract.lease_end) : '—'}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-charcoal-500">{t('contract.monthly_rent')}</dt>
          <dd className="font-medium text-charcoal-900">
            {contract?.monthly_rent ? `฿${contract.monthly_rent.toLocaleString()}` : '—'}
          </dd>
        </div>
      </dl>
    </Card>
  </Link>

  {/* Next payment card */}
  <Link href="/tenant/payments" className="block mb-4">
    <Card className="hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-charcoal-900">{t('tenant.next_payment')}</p>
        <span className="text-sm font-semibold text-saffron-700">
          ฿{nextPayment?.amount?.toLocaleString() ?? '—'}
        </span>
      </div>
      <p className="mt-2 text-xs text-charcoal-500">
        {nextPayment?.due_date ? formatDisplayDate(nextPayment.due_date) : '—'}
      </p>
    </Card>
  </Link>

  {/* Quick actions */}
  <div className="grid grid-cols-2 gap-3">
    <Link href="/tenant/contract/view" className="...">
      {t('contract.view')}
    </Link>
    <Link href="/tenant/payments" className="...">
      {t('nav.payments')}
    </Link>
  </div>
</div>
```

---

## Mockup B — Hero Contract + Compact Payment Strip (Current Evolution)

**Preview:** Closest to the current dashboard but stripped. Hero contract card at the top (full-width, 140px tall, shows property name, status, lease period DD/MM/YYYY, monthly rent). Below it, a single-row "payment strip" showing next-payment amount + due date. Below that, three quick-action tiles (View Lease, Payments, Documents). No stat grid (penalties/maintenance cards gone). This variant keeps the mental model users already have — the contract card is the center of gravity — but removes everything that clutters the decision.

**Trade-offs:**

- Pick this when: you want a safe evolution of the existing layout — returning users won't be disoriented, it's the same shape with less noise.
- Skip this when: you want a bigger visual reset — this looks like "the old dashboard with things removed" rather than a fresh treatment.
- Skip this when: you want to surface payment info with equal weight to the contract — the payment strip is visibly secondary.

**Structure:**

```
┌─────────────────────────────────────┐
│  Your rental                        │
│  Hello, {name}                      │
├─────────────────────────────────────┤
│  [banner slot — min-h reserved]     │
├─────────────────────────────────────┤
│  ╔═══════════════════════════════╗  │
│  ║ 🏠  Sukhumvit Residences    ● ║  │
│  ║     Active                    ║  │  ← hero contract
│  ║                               ║  │
│  ║  Lease period                 ║  │
│  ║  01/01/2026 → 31/12/2026      ║  │
│  ║                               ║  │
│  ║  Monthly rent     ฿25,000/mo  ║  │
│  ╚═══════════════════════════════╝  │
│                                     │
│  ┌───────────────────────────────┐  │  ← compact payment strip
│  │ Next payment  01/05/2026  ฿25k│  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌──────┐  ┌──────┐  ┌──────┐      │
│  │Lease │  │Pay's │  │Docs  │      │  ← 3 quick actions
│  └──────┘  └──────┘  └──────┘      │
└─────────────────────────────────────┘
```

**JSX sketch:**

```tsx
<div className="mx-auto max-w-2xl">
  <h2 className="text-xl font-bold text-charcoal-900">{t('dashboard.your_rental')}</h2>
  <p className="mb-6 text-sm text-charcoal-500">
    {t('dashboard.hello')}, {fullName ?? ''}
  </p>

  <div className="min-h-[72px] mb-4">{/* banner slot */}</div>

  {/* Hero contract card */}
  {contract ? (
    <Link href="/tenant/contract/view" className="block">
      <div className="mb-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-warm-200 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-sage-50">
              <HomeIcon className="h-6 w-6 text-sage-700" />
            </span>
            <div>
              <p className="text-base font-semibold text-charcoal-900">
                {contract.properties?.name ?? '—'}
              </p>
              <StatusBadge status={contract.status} className="mt-1" />
            </div>
          </div>
        </div>
        <div className="mt-5 border-t border-warm-100 pt-4">
          <p className="text-xs text-charcoal-500">{t('contract.lease_period')}</p>
          <p className="text-sm font-medium text-charcoal-900">
            {contract.lease_start ? formatDisplayDate(contract.lease_start) : '—'} →{' '}
            {contract.lease_end ? formatDisplayDate(contract.lease_end) : '—'}
          </p>
        </div>
        <div className="mt-3">
          <p className="text-xs text-charcoal-500">{t('contract.monthly_rent')}</p>
          <p className="text-sm font-semibold text-charcoal-900">
            {contract.monthly_rent ? `฿${contract.monthly_rent.toLocaleString()}/mo` : '—'}
          </p>
        </div>
      </div>
    </Link>
  ) : (
    <Card className="mb-4">
      <p className="text-sm text-charcoal-500">{t('tenant.no_contract')}</p>
    </Card>
  )}

  {/* Compact payment strip */}
  <Link
    href="/tenant/payments"
    className="mb-6 flex items-center justify-between rounded-lg bg-warm-100 px-4 py-3 hover:bg-warm-200 transition-colors"
  >
    <span className="text-sm font-medium text-charcoal-700">{t('tenant.next_payment')}</span>
    <span className="text-sm text-charcoal-500">
      {nextPayment?.due_date ? formatDisplayDate(nextPayment.due_date) : '—'}
    </span>
    <span className="text-sm font-semibold text-saffron-700">
      ฿{nextPayment?.amount?.toLocaleString() ?? '—'}
    </span>
  </Link>

  {/* 3 quick actions */}
  <div className="grid grid-cols-3 gap-3">
    <QuickAction href="/tenant/contract/view" label={t('contract.view')} />
    <QuickAction href="/tenant/payments" label={t('nav.payments')} />
    <QuickAction href="/tenant/documents" label={t('nav.documents')} />
  </div>
</div>
```

---

## Mockup C — Greeting Hero + Dual-Panel (Warmest)

**Preview:** Large warm greeting takes the full top band ("Hello, Somchai 👋 — here's how your rental is doing"). Below it, two equal-weight panels side-by-side on tablet/desktop, stacked on mobile: left = **Your lease** (property + status + lease period DD/MM/YYYY + monthly rent), right = **Your payments** (next payment due date + amount + "X days away" helper). Bottom row has a single prominent "View all payments" link. This variant feels the most human — the greeting is a full band, not a single line. The two-panel layout creates a "here's the two things you care about" mental split. Quick actions are minimized to one link.

**Trade-offs:**

- Pick this when: you want the warmest, most human-first feel — the greeting is a statement, not a label. Two-panel creates a clear "lease vs. payments" split.
- Skip this when: on narrow phones (≤360px), the two-panel layout collapses to stacked anyway — you lose the visual signature without the tablet gains.
- Skip this when: you want more actions on the dashboard — this is deliberately low on CTAs to keep the eye on content, not buttons.

**Structure:**

```
┌─────────────────────────────────────┐
│                                     │
│  Hello, Somchai 👋                  │
│  Here's how your rental is doing    │
│                                     │
├─────────────────────────────────────┤
│  [banner slot — min-h reserved]     │
├──────────────────┬──────────────────┤
│ Your lease       │ Your payments    │
│ ────────────     │ ────────────     │
│ 🏠 Sukhumvit R.  │ 💳 Next payment  │
│ Active           │ 01/05/2026       │
│                  │                  │
│ Lease period     │ ฿25,000          │
│ 01/01/26 →       │ 20 days away     │
│ 31/12/26         │                  │
│                  │                  │
│ ฿25,000/mo       │                  │
│                  │                  │
│ View lease →     │ View payments →  │
└──────────────────┴──────────────────┘
┌─────────────────────────────────────┐
│        View all payment history →   │
└─────────────────────────────────────┘
```

**JSX sketch:**

```tsx
<div className="mx-auto max-w-4xl">
  {/* Warm greeting band */}
  <div className="mb-6">
    <h2 className="text-2xl font-bold text-charcoal-900">
      {t('dashboard.hello_name').replace('{name}', fullName ?? '')} 👋
    </h2>
    <p className="mt-1 text-sm text-charcoal-500">{t('dashboard.tenant_warm_subtitle')}</p>
  </div>

  <div className="min-h-[72px] mb-4">{/* banner slot */}</div>

  {/* Dual panels */}
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
    {/* Lease panel */}
    <Link href="/tenant/contract/view" className="block">
      <Card className="h-full hover:shadow-md transition-shadow">
        <p className="text-xs uppercase tracking-wide text-charcoal-400">
          {t('tenant.your_lease')}
        </p>
        <div className="mt-3 flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sage-100">
            <HomeIcon />
          </span>
          <div>
            <p className="text-base font-semibold text-charcoal-900">
              {contract?.properties?.name ?? '—'}
            </p>
            {contract && <StatusBadge status={contract.status} className="mt-1" />}
          </div>
        </div>
        <div className="mt-4 space-y-2 text-sm">
          <div>
            <p className="text-xs text-charcoal-500">{t('contract.lease_period')}</p>
            <p className="font-medium text-charcoal-900">
              {contract?.lease_start ? formatDisplayDate(contract.lease_start) : '—'} →{' '}
              {contract?.lease_end ? formatDisplayDate(contract.lease_end) : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-charcoal-500">{t('contract.monthly_rent')}</p>
            <p className="font-medium text-charcoal-900">
              {contract?.monthly_rent ? `฿${contract.monthly_rent.toLocaleString()}/mo` : '—'}
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm font-medium text-saffron-600">{t('contract.view')} →</p>
      </Card>
    </Link>

    {/* Payments panel */}
    <Link href="/tenant/payments" className="block">
      <Card className="h-full hover:shadow-md transition-shadow">
        <p className="text-xs uppercase tracking-wide text-charcoal-400">
          {t('tenant.your_payments')}
        </p>
        <div className="mt-3 flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-saffron-100">
            <CreditCardIcon />
          </span>
          <div>
            <p className="text-base font-semibold text-charcoal-900">{t('tenant.next_payment')}</p>
            <p className="mt-1 text-xs text-charcoal-500">
              {nextPayment?.due_date ? formatDisplayDate(nextPayment.due_date) : '—'}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <p className="text-2xl font-bold text-saffron-700">
            ฿{nextPayment?.amount?.toLocaleString() ?? '—'}
          </p>
          {nextPayment?.days_until !== undefined && (
            <p className="mt-1 text-xs text-charcoal-500">
              {t('tenant.days_away').replace('{n}', String(nextPayment.days_until))}
            </p>
          )}
        </div>
        <p className="mt-4 text-sm font-medium text-saffron-600">{t('nav.payments')} →</p>
      </Card>
    </Link>
  </div>

  {/* Single bottom link */}
  <div className="mt-6 text-center">
    <Link
      href="/tenant/payments"
      className="text-sm font-medium text-saffron-600 hover:text-saffron-700"
    >
      {t('tenant.view_payment_history')} →
    </Link>
  </div>
</div>
```

---

## PO decision required

Reply with one of: **A**, **B**, or **C**. Wire phase cannot start until a variant is picked.

**Reminders for wire phase (all variants):**

- Import `formatDisplayDate` from `@/lib/format/date`
- Import `FEATURE_MAINTENANCE`, `FEATURE_PENALTIES` from `@/lib/features` (both false) — gate any related UI
- `page.tsx` server fetch must stop fetching penalties/maintenance when their flags are off (remove the unconditional penalties query at L79-82)
- Reserve the banner slot (`min-h-[72px]`) so CLS is zero regardless of whether a banner renders
- Keep the existing `RenewalNotice` + lease-expiry banner logic; just host it inside the banner slot
- Add new i18n keys to `en.json` / `th.json` / `zh.json` for any new copy the chosen variant introduces
- Keep "I've paid this" claim flow reachable via the contract card or payments link — don't remove it

## Lighthouse baseline

To be captured by Team B (wire phase) before and after. Goal: no regression; ideally a small improvement since two large sections (penalties card, maintenance list) are removed from the render.
