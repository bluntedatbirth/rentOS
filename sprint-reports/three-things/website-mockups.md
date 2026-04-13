# Landing Page Visual Mockups — Three Things Scope

> **Status**: Static TSX mockups only. Placeholder copy throughout. Real EN+TH copy will be dropped in from `website-copy.md`.  
> **Design tokens verified from**: `tailwind.config.ts`, `DashboardClient.tsx`, `login/page.tsx`, `LanguageToggle.tsx`

---

## Key Token Reference (verified)

| Token          | Hex     | Use                       |
| -------------- | ------- | ------------------------- |
| `warm-50`      | #fefcf7 | Page background           |
| `warm-100`     | #fdf7ec | Card backgrounds, banners |
| `warm-200`     | #faf0d7 | Borders                   |
| `charcoal-900` | #1a1a1a | Primary headings          |
| `charcoal-700` | #3d3d3d | Body text                 |
| `charcoal-500` | #6b6b6b | Subdued text              |
| `saffron-500`  | #f0a500 | Primary CTA background    |
| `saffron-600`  | #d48800 | CTA hover                 |
| `saffron-300`  | #ffd03d | Borders on warm banners   |
| `sage-500`     | #5a7a5a | Feature icons, accents    |
| `sage-200`     | #bfdbbf | Sage backgrounds          |

**Button idiom** (from `login/page.tsx:150`):  
`rounded-lg bg-saffron-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-saffron-600 focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:ring-offset-2`

**Ghost/secondary idiom** (from `login/page.tsx:194`):  
`rounded-lg border border-warm-200 bg-warm-100 px-3 py-2.5 text-sm font-medium text-charcoal-600 hover:border-saffron-400 hover:text-saffron-600`

---

## 1. Hero Mockup Variants

---

### Variant 1 — Minimal Utility

**Above-the-fold description (mobile):**  
A Thai landlord on a phone sees a warm-white screen, one large centered headline in bold charcoal, a single saffron "Get started free" button directly below it, and a simple line-art illustration of a house and document. Nothing competes for attention — the CTA is unmissable, the free-for-landlords message is embedded in the subhead two lines below the headline.

**Trade-offs:**

- **Pick when**: validation audience skews time-pressed or older; clarity beats cleverness; you want the lowest-risk first impression.
- **Avoid when**: differentiation from generic SaaS matters and you want to show the product immediately.
- **Risk**: can read as unfinished or empty; depends heavily on strong headline copy.

```tsx
// Variant 1 — Minimal Utility Hero
// Static mockup — placeholder copy only

import Link from 'next/link';

// Inline SVG: simple line-art house + document (saffron stroke)
function HouseDocIllustration() {
  return (
    <svg
      viewBox="0 0 200 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="mx-auto h-28 w-auto"
      aria-hidden="true"
    >
      {/* House */}
      <polyline
        points="20,70 20,110 80,110 80,70"
        stroke="#f0a500"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <polyline
        points="10,70 50,30 90,70"
        stroke="#f0a500"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Door */}
      <rect x="38" y="85" width="24" height="25" rx="2" stroke="#5a7a5a" strokeWidth="2" />
      {/* Document */}
      <rect x="110" y="40" width="70" height="70" rx="4" stroke="#f0a500" strokeWidth="2.5" />
      <line x1="122" y1="60" x2="168" y2="60" stroke="#d1d1d1" strokeWidth="2" />
      <line x1="122" y1="72" x2="168" y2="72" stroke="#d1d1d1" strokeWidth="2" />
      <line x1="122" y1="84" x2="150" y2="84" stroke="#d1d1d1" strokeWidth="2" />
      {/* Connector line */}
      <line
        x1="90"
        y1="85"
        x2="110"
        y2="75"
        stroke="#bfdbbf"
        strokeWidth="1.5"
        strokeDasharray="4 3"
      />
    </svg>
  );
}

export function HeroVariant1() {
  return (
    <section className="flex min-h-screen flex-col items-center justify-center bg-warm-50 px-6 py-16 text-center">
      {/* Nav strip */}
      <nav className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4">
        <span className="text-lg font-bold text-charcoal-900">rentOS</span>
        <div className="flex items-center gap-3">
          {/* Language toggle placeholder — mirrors LanguageToggle component */}
          <button className="inline-flex items-center gap-1.5 rounded-full border border-warm-200 bg-transparent px-3 py-1.5 text-sm font-medium text-charcoal-700 hover:bg-warm-100">
            TH ▾
          </button>
          <Link
            href="/login"
            className="rounded-lg border border-warm-200 bg-warm-100 px-3 py-1.5 text-sm font-medium text-charcoal-600 hover:border-saffron-400 hover:text-saffron-600"
          >
            Sign in
          </Link>
        </div>
      </nav>

      {/* Illustration */}
      <HouseDocIllustration />

      {/* Headline */}
      <h1 className="mt-8 max-w-xs text-3xl font-bold leading-tight text-charcoal-900 sm:max-w-md sm:text-4xl">
        HERO HEADLINE GOES HERE
      </h1>

      {/* Subhead — free-for-landlords emphasis */}
      <p className="mt-4 max-w-sm text-base text-charcoal-500">
        FREE FOR LANDLORDS — SUBHEAD COPY HERE
      </p>

      {/* Primary CTA */}
      <Link
        href="/signup"
        className="mt-8 min-h-[48px] rounded-lg bg-saffron-500 px-8 py-3 text-base font-semibold text-white hover:bg-saffron-600 focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:ring-offset-2"
      >
        GET STARTED FREE
      </Link>

      {/* Micro trust line */}
      <p className="mt-3 text-xs text-charcoal-400">NO CREDIT CARD. NO LIMIT ON PROPERTIES.</p>
    </section>
  );
}
```

---

### Variant 2 — Split Screen

**Above-the-fold description (mobile):**  
On mobile the split collapses to a single column: headline + subhead + CTA stacked at top, then a phone-width screenshot placeholder of the simplified 3-card dashboard below the fold. On desktop the two columns are 50/50. Thai landlords see the product immediately rather than just a promise.

**Trade-offs:**

- **Pick when**: you want to show the actual product and reduce the "what is this?" hesitation from cold visitors.
- **Pick when**: the dashboard screenshot (see `tech-dashboard-mockups.md`) is production-quality.
- **Avoid when**: the screenshot slot has placeholder art — it will look unfinished and undermine trust.

```tsx
// Variant 2 — Split Screen Hero
// Static mockup — placeholder copy only

import Link from 'next/link';

// Dashboard screenshot placeholder (replace with real <Image> from /public/screenshots/)
function DashboardScreenshot() {
  return (
    <div className="relative mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-warm-200 bg-warm-100 shadow-lg">
      {/* Simulated top bar */}
      <div className="flex items-center justify-between border-b border-warm-200 bg-warm-50 px-4 py-3">
        <span className="text-xs font-semibold text-charcoal-700">rentOS</span>
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-warm-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-warm-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-saffron-300" />
        </div>
      </div>
      {/* Simulated 3 stat cards */}
      <div className="grid grid-cols-2 gap-2 p-4">
        {['Properties', 'Payments', 'Contracts', 'Vacancies'].map((label) => (
          <div key={label} className="rounded-lg border border-warm-200 bg-warm-50 p-3 shadow-sm">
            <p className="mb-1 text-xs text-charcoal-400">{label}</p>
            <p className="text-xl font-bold text-saffron-600">—</p>
          </div>
        ))}
      </div>
      {/* Watermark label */}
      <p className="pb-3 text-center text-xs text-charcoal-400">[DASHBOARD SCREENSHOT SLOT]</p>
    </div>
  );
}

export function HeroVariant2() {
  return (
    <div className="min-h-screen bg-warm-50">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4">
        <span className="text-lg font-bold text-charcoal-900">rentOS</span>
        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-1.5 rounded-full border border-warm-200 bg-transparent px-3 py-1.5 text-sm font-medium text-charcoal-700 hover:bg-warm-100">
            TH ▾
          </button>
          <Link
            href="/login"
            className="rounded-lg border border-warm-200 bg-warm-100 px-3 py-1.5 text-sm font-medium text-charcoal-600 hover:border-saffron-400 hover:text-saffron-600"
          >
            Sign in
          </Link>
        </div>
      </nav>

      {/* Split hero */}
      <section className="mx-auto flex max-w-5xl flex-col items-center gap-12 px-6 py-12 lg:flex-row lg:gap-16">
        {/* Left: copy + CTA */}
        <div className="flex-1 text-center lg:text-left">
          <p className="mb-3 inline-block rounded-full bg-saffron-100 px-3 py-1 text-xs font-semibold text-saffron-700">
            FREE FOR LANDLORDS
          </p>
          <h1 className="text-3xl font-bold leading-tight text-charcoal-900 sm:text-4xl lg:text-5xl">
            HERO HEADLINE GOES HERE
          </h1>
          <p className="mt-4 text-base leading-relaxed text-charcoal-500 lg:text-lg">
            SUBHEAD COPY — 1–2 sentences. Properties. Payments. Contracts.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
            <Link
              href="/signup"
              className="min-h-[48px] rounded-lg bg-saffron-500 px-8 py-3 text-base font-semibold text-white hover:bg-saffron-600 focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:ring-offset-2"
            >
              GET STARTED FREE
            </Link>
            <Link
              href="#features"
              className="min-h-[48px] rounded-lg border border-warm-200 bg-warm-100 px-6 py-3 text-base font-medium text-charcoal-600 hover:border-saffron-400 hover:text-saffron-600"
            >
              SEE HOW IT WORKS
            </Link>
          </div>

          <p className="mt-3 text-xs text-charcoal-400">NO CREDIT CARD. NO LIMIT ON PROPERTIES.</p>
        </div>

        {/* Right: dashboard screenshot */}
        <div className="flex-1">
          <DashboardScreenshot />
        </div>
      </section>
    </div>
  );
}
```

---

### Variant 3 — Thai-First / Culturally Warm

**Above-the-fold description (mobile):**  
A Thai landlord sees their language headline first, large and prominent in charcoal-900 — the English subhead is smaller, secondary. A saffron line-art illustration of a traditional Thai gate/archway anchors the visual warmth without being tourist-cliché. The CTA and "Free for landlords" label appear within a single thumb-reach.

**Trade-offs:**

- **Pick when**: primary validation audience is Thai-speaking landlords; Thai-first signals respect and local intent.
- **Pick when**: you want to differentiate hard from generic SaaS landing pages.
- **Avoid when**: the headline placeholder Thai is left unreviewed — bad Thai copy is worse than English-only.

```tsx
// Variant 3 — Thai-First / Culturally Warm Hero
// Static mockup — placeholder copy only
// IMPORTANT: <TH_HEADLINE> and <TH_SUBHEAD> must be reviewed by a native Thai speaker before shipping

import Link from 'next/link';

// Saffron line-art: simplified Thai gate/archway motif
function ThaiGateIllustration() {
  return (
    <svg
      viewBox="0 0 220 130"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="mx-auto h-32 w-auto"
      aria-hidden="true"
    >
      {/* Left pillar */}
      <rect x="30" y="50" width="18" height="75" rx="2" stroke="#f0a500" strokeWidth="2.5" />
      {/* Right pillar */}
      <rect x="172" y="50" width="18" height="75" rx="2" stroke="#f0a500" strokeWidth="2.5" />
      {/* Arch top */}
      <path d="M30 50 Q110 -10 190 50" stroke="#f0a500" strokeWidth="2.5" fill="none" />
      {/* Decorative finial center */}
      <circle cx="110" cy="18" r="7" stroke="#f0a500" strokeWidth="2" />
      <line x1="110" y1="11" x2="110" y2="5" stroke="#f0a500" strokeWidth="2" />
      {/* Left small finial */}
      <circle cx="68" cy="35" r="4" stroke="#f0a500" strokeWidth="1.5" />
      {/* Right small finial */}
      <circle cx="152" cy="35" r="4" stroke="#f0a500" strokeWidth="1.5" />
      {/* Path/ground */}
      <line x1="48" y1="125" x2="172" y2="125" stroke="#bfdbbf" strokeWidth="2" />
      {/* Left garden dot */}
      <circle cx="20" cy="118" r="8" fill="#e0eee0" stroke="#5a7a5a" strokeWidth="1.5" />
      {/* Right garden dot */}
      <circle cx="200" cy="118" r="8" fill="#e0eee0" stroke="#5a7a5a" strokeWidth="1.5" />
    </svg>
  );
}

export function HeroVariant3() {
  return (
    <div className="min-h-screen bg-warm-50">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4">
        <span className="text-lg font-bold text-charcoal-900">rentOS</span>
        <div className="flex items-center gap-3">
          {/* Language toggle — TH shown as active (first in cycle) */}
          <button className="inline-flex items-center gap-1.5 rounded-full border border-saffron-300 bg-saffron-50 px-3 py-1.5 text-sm font-medium text-saffron-700">
            TH ▾
          </button>
          <Link
            href="/login"
            className="rounded-lg border border-warm-200 bg-warm-100 px-3 py-1.5 text-sm font-medium text-charcoal-600 hover:border-saffron-400 hover:text-saffron-600"
          >
            เข้าสู่ระบบ
          </Link>
        </div>
      </nav>

      <section className="flex flex-col items-center px-6 pb-16 pt-8 text-center">
        {/* Thai headline — large, primary */}
        <h1 className="max-w-xs text-4xl font-bold leading-tight text-charcoal-900 sm:max-w-md sm:text-5xl">
          {/* Replace with real Thai copy from web-copy-lead */}
          {'<TH_HEADLINE>'}
          {/* Placeholder example: ติดตามค่าเช่า จัดการสัญญา */}
        </h1>

        {/* English subhead — smaller, secondary */}
        <p className="mt-3 text-lg font-medium text-charcoal-500">
          ENGLISH SUBHEAD — Track rent. Manage contracts.
        </p>

        {/* Free badge */}
        <span className="mt-4 inline-block rounded-full bg-saffron-100 px-4 py-1.5 text-sm font-semibold text-saffron-700">
          FREE FOR LANDLORDS
        </span>

        {/* Illustration */}
        <div className="my-8">
          <ThaiGateIllustration />
        </div>

        {/* Primary CTA */}
        <Link
          href="/signup"
          className="min-h-[52px] rounded-lg bg-saffron-500 px-10 py-3.5 text-base font-semibold text-white hover:bg-saffron-600 focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:ring-offset-2"
        >
          {'<TH_CTA>'}
          {/* Placeholder: สมัครฟรี */}
        </Link>
        <p className="mt-2 text-xs text-charcoal-400">
          {'<TH_MICRO_TRUST>'}
          {/* Placeholder: ไม่ต้องใช้บัตรเครดิต */}
        </p>

        {/* Sage warm-tone divider */}
        <div className="mt-10 flex items-center gap-3 text-xs text-charcoal-400">
          <span className="h-px w-16 bg-warm-300" />
          <span>PROPERTIES · PAYMENTS · CONTRACTS</span>
          <span className="h-px w-16 bg-warm-300" />
        </div>
      </section>
    </div>
  );
}
```

---

## 2. Below-the-Fold Section Order

All three variants share the same section order. Visual rhythm notes differ by variant where marked.

### All Variants

| #   | Section                          | Visual rhythm note                                                                                                                                                                               |
| --- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Hero**                         | (see variants above)                                                                                                                                                                             |
| 2   | **Feature: Properties**          | Full-width warm-100 band on mobile, alternating image-left/text-right on desktop; sage-500 icon; 2-sentence body; screenshot or icon-art of the property list screen.                            |
| 3   | **Feature: Payments**            | Mirrors Properties layout but image flipped; amber/saffron accent on the stat — "log a payment in 10 seconds"; screenshot or icon-art of the payment ledger.                                     |
| 4   | **Feature: Contracts**           | Same alternating rhythm; sage-500 icon; accent on "OCR reads your lease so you don't have to"; screenshot or icon-art of contract upload flow.                                                   |
| 5   | **Pricing — Free for landlords** | Centered, warm-100 background, single card with saffron border; "Free forever for landlords" in large charcoal-900 text with saffron-500 checkmarks; secondary text mentions future Pro.         |
| 6   | **Trust signals**                | 3 horizontally scrollable chips on mobile (no stock photos); e.g. "Built for Thai landlords", "Thai + English interface", "Your data on Supabase" — charcoal-500 text, sage-200 chip background. |
| 7   | **Footer**                       | 2-column on desktop: left = logo + tagline; right = links (Login, Sign up, Contact); language switcher mirrors app's `LanguageToggle` component; warm-200 top border; no heavy dark background.  |

**Variant-specific rhythm notes:**

- **Variant 1** (Minimal): Feature blocks use icon-art only — no screenshots. Keeps the minimal, whitespace-heavy feel consistent.
- **Variant 2** (Split): Feature blocks use real in-app screenshots (reference `tech-dashboard-mockups.md`). If screenshots aren't production-ready, fall back to Variant 1 rhythm.
- **Variant 3** (Thai-first): Feature block headlines lead in Thai, English sub-label below — mirrors the hero's language hierarchy throughout the page.

---

## 3. Design Parity Audit

**Existing landing page found:** `app/page.tsx` (415 lines). It uses hardcoded inline `style={{}}` props and a `dangerouslySetInnerHTML` injected CSS block rather than Tailwind utility classes.

| Check                                                                           | Result       | Note                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Colors** — `saffron-500`, `charcoal-900`, `warm-50`, `sage-500`               | FAIL         | Landing uses raw hex values (`#f0a500`, `#2c2c2c`, `#fefcf7`, `#5a7a5a`) throughout inline `style={{}}` props. No Tailwind token class names (e.g. `bg-saffron-500`, `text-charcoal-900`) appear in the file. App components (`Card.tsx`, `LanguageToggle.tsx`) use token classes. **Fix:** Rewrite landing in Tailwind utility classes matching `tailwind.config.ts` tokens — the three-things landing rewrite is the right moment. |
| **Typography** — DM Sans everywhere                                             | PASS         | Root div inline style sets `fontFamily: "'DM Sans', 'Helvetica Neue', system-ui, sans-serif"`. No Inter/Roboto/system-sans found as alternates.                                                                                                                                                                                                                                                                                      |
| **Button style** — saffron-500 bg / saffron-600 hover / white text / rounded-lg | PARTIAL FAIL | Landing injects a `.saffron-btn` class with `background: #f0a500` (correct) and `:hover { background: #d49200 }`. Config's `saffron-600` is `#d48800` — minor 8-hex delta. No `border-radius` set on `.saffron-btn`, meaning buttons have no rounded corners. App's `login/page.tsx` uses `rounded-lg`. **Fix:** Set hover to `#d48800` and add `border-radius: 8px` (or switch to `rounded-lg` when rebuilding with Tailwind).      |
| **Spacing/rhythm** — `p-4` or `p-6` card padding                                | FAIL         | Landing uses inline `padding: '28px 32px'` on quote cards and `padding: 40px` on audience panels. App's `Card.tsx` uses `p-4` (16px) uniformly. **Fix:** Standardize feature and quote card padding to `p-4` or `p-6` using Tailwind in the rebuilt landing.                                                                                                                                                                         |
| **Illustration/photography**                                                    | PASS         | No photography in landing. Uses emoji icons and a small SVG logo mark. Warm in spirit, no corporate stock images.                                                                                                                                                                                                                                                                                                                    |
| **CTA hierarchy** — primary saffron-500, secondary ghost/outline                | PARTIAL FAIL | Primary `.saffron-btn` is correct in intent. Secondary `.outline-btn` uses `border: 2px solid #2c2c2c` with full charcoal hover — functionally correct but not wired to token classes. **Fix:** Use `border-charcoal-900` token class and `hover:bg-charcoal-900 hover:text-warm-50` in rebuilt version.                                                                                                                             |
| **Language switcher**                                                           | PASS         | Landing imports and renders the `LanguageToggle` component from `@/components/ui/LanguageToggle`. Component reuse is correct. The surrounding nav container uses inline styles, not Tailwind, but the component itself is the right one.                                                                                                                                                                                             |
| **Dark mode**                                                                   | N/A          | Neither landing nor app components audited show dark mode support. No `dark:` Tailwind variants found. Parity exists — both absent. No action needed.                                                                                                                                                                                                                                                                                |

**FAIL count: 4** (2 outright FAILs on Colors and Spacing/rhythm; 2 partial FAILs on Button style and CTA hierarchy).

---

## 4. Recommendation

**Recommended variant: Variant 3 — Thai-First / Culturally Warm.**

For a validation round of 5 Thai landlords, leading with Thai copy signals that this product was built _for them_, not translated for them — that distinction is immediately felt on a phone and aligns with the "People First" brand principle. The saffron gate illustration provides warmth without relying on stock photography or stereotypes, and the "Free for landlords" badge sits within a single thumb scroll of the headline. The biggest trade-off is copy dependency: the Thai headline placeholder `<TH_HEADLINE>` must be reviewed by a native Thai speaker before any landlord sees the page — shipping with machine-translated or placeholder Thai would damage trust more than any design choice could repair it. If the copy review cannot happen before the validation session, fall back to Variant 1, which is safe, clear, and lets strong English copy carry the first impression.

**Biggest design risk:** Variant 3's Thai headline is a placeholder (`<TH_HEADLINE>`) — if real, reviewed Thai copy is not available before the landlord validation session, the Thai-first layout actively backfires.
