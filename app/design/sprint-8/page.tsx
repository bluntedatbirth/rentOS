'use client';

/**
 * Sprint 8 — Landing Page Mockup Preview
 * ----------------------------------------
 * Three full-page variants stacked for PO review.
 * Static — no data fetching, no i18n hooks, no API calls.
 *
 * Variant A — "Free Hero"   (minimal/editorial)
 * Variant B — "Split Hero"  (dual-audience landlord/tenant)
 * Variant C — "Numbers Hero" (action-oriented)
 *
 * NO PRICING in any variant.
 */

import { useState } from 'react';
import Link from 'next/link';

// ─── Inline SVG Icons ────────────────────────────────────────────────────────

function IconHome({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}

function IconUpload({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function IconFileText({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function IconCalendar({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconGlobe({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function IconShield({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconArrowRight({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconChevronDown({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function IconClock({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconUsers({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconMapPin({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconZap({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

// ─── Shared Nav (static, no hooks) ───────────────────────────────────────────

function MockNav({ variantLabel }: { variantLabel: string }) {
  return (
    <header className="sticky top-0 z-50 bg-warm-50/90 dark:bg-charcoal-900/90 backdrop-blur-xl border-b border-charcoal-800/[0.06] dark:border-white/10">
      <div className="max-w-[1120px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-saffron-500/10 flex items-center justify-center">
            <IconHome className="w-4 h-4 text-saffron-500" />
          </div>
          <span className="font-[var(--font-manrope)] text-xl font-bold text-charcoal-800 dark:text-white tracking-tight">
            RentOS
          </span>
          <span className="ml-2 hidden sm:inline-flex items-center rounded-full bg-saffron-500/10 px-2 py-0.5 text-[10px] font-semibold text-saffron-600 dark:text-saffron-400 uppercase tracking-wider">
            {variantLabel} Preview
          </span>
        </div>
        <nav className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-charcoal-600 dark:text-white/70 hover:text-charcoal-900 dark:hover:text-white transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center gap-1.5 rounded-xl bg-saffron-500 hover:bg-saffron-600 text-white text-sm font-semibold px-4 py-2 transition-colors shadow-sm"
          >
            Get started
            <IconArrowRight className="w-3.5 h-3.5" />
          </Link>
        </nav>
      </div>
    </header>
  );
}

// ─── Shared Footer ────────────────────────────────────────────────────────────

function MockFooter() {
  return (
    <footer className="border-t border-charcoal-800/[0.06] dark:border-white/10 bg-warm-50 dark:bg-charcoal-900 px-6 py-10">
      <div className="max-w-[1120px] mx-auto space-y-6">
        <p className="text-[11px] text-charcoal-400 dark:text-white/40 leading-relaxed max-w-[896px] mx-auto text-center">
          RentOS is a property management tool, not a financial institution. Rental agreements made
          through this platform are between landlord and tenant. Your data is stored securely and
          never sold.{' '}
          <Link
            href="/legal#privacy"
            className="underline hover:text-saffron-500 transition-colors"
          >
            Privacy Policy
          </Link>{' '}
          ·{' '}
          <Link href="/legal#terms" className="underline hover:text-saffron-500 transition-colors">
            Terms of Service
          </Link>
        </p>
        <div className="flex flex-wrap justify-between items-center gap-4">
          <span className="text-xs text-charcoal-300 dark:text-white/40">
            Built in Thailand, for Thailand
          </span>
          <div className="flex gap-6 flex-wrap">
            <a
              href="#faq"
              className="text-xs text-charcoal-300 dark:text-white/50 hover:text-saffron-500 transition-colors"
            >
              FAQ
            </a>
            <Link
              href="/login"
              className="text-xs text-charcoal-300 dark:text-white/50 hover:text-saffron-500 transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="text-xs text-charcoal-300 dark:text-white/50 hover:text-saffron-500 transition-colors"
            >
              Sign up free
            </Link>
            <a
              href="mailto:hello@rentos.homes"
              className="text-xs text-charcoal-300 dark:text-white/50 hover:text-saffron-500 transition-colors"
            >
              hello@rentos.homes
            </a>
          </div>
          <span className="text-xs text-charcoal-200 dark:text-white/30">© 2025 RentOS</span>
        </div>
      </div>
    </footer>
  );
}

// ─── FAQ Accordion (self-contained, no imports) ───────────────────────────────

interface FAQItem {
  q: string;
  a: string;
}

function FAQSection({ items }: { items: FAQItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <button
          key={i}
          type="button"
          onClick={() => setOpen(open === i ? null : i)}
          aria-expanded={open === i}
          className={`w-full text-left rounded-2xl px-5 py-4 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 focus-visible:ring-offset-2 ${
            open === i
              ? 'bg-warm-100 dark:bg-white/[0.06] border border-saffron-500/40 shadow-md border-l-4 border-l-saffron-500'
              : 'bg-warm-100/60 dark:bg-white/[0.04] border border-charcoal-800/10 dark:border-white/10 shadow-sm hover:border-charcoal-800/20 dark:hover:border-white/20'
          }`}
        >
          <div className="flex justify-between items-center gap-4">
            <span className="text-[15px] font-medium text-charcoal-800 dark:text-white leading-snug">
              {item.q}
            </span>
            <IconChevronDown
              className={`h-4 w-4 text-charcoal-500 dark:text-white/50 shrink-0 transition-transform duration-200 ${open === i ? 'rotate-180' : ''}`}
            />
          </div>
          {open === i && (
            <p className="text-sm text-charcoal-600 dark:text-white/60 mt-3 leading-relaxed">
              {item.a}
            </p>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Variant label chip (sticky) ─────────────────────────────────────────────

function VariantLabel({ label, color }: { label: string; color: string }) {
  const colors: Record<string, string> = {
    saffron: 'bg-saffron-500 text-white',
    sage: 'bg-sage-500 text-white',
    charcoal: 'bg-charcoal-800 text-white dark:bg-charcoal-200 dark:text-charcoal-900',
  };
  return (
    <div className="sticky top-[61px] z-40 pointer-events-none">
      <div className="max-w-[1120px] mx-auto px-6 pt-3">
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold tracking-wide shadow-md pointer-events-auto ${colors[color] ?? colors.charcoal}`}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VARIANT A — "Free Hero" (Minimal / Editorial)
// ═══════════════════════════════════════════════════════════════════════════════

const VARIANT_A_FAQ: FAQItem[] = [
  {
    q: 'Is RentOS really free?',
    a: 'Yes — create an account and start managing your properties at no cost. No credit card required.',
  },
  {
    q: 'What languages does RentOS support?',
    a: 'Thai and English throughout the entire app — leases, notifications, and the interface itself.',
  },
  {
    q: 'How does contract reading work?',
    a: 'Upload any PDF lease and RentOS extracts the key clauses — dates, rent amount, deposit, notice periods — so you and your tenant both know exactly what was signed.',
  },
  {
    q: 'Who is RentOS built for?',
    a: 'Both sides of the lease. Landlords manage properties, upload contracts, and track payments. Tenants view their lease in their language and see upcoming due dates.',
  },
];

function VariantA() {
  const problemChips = [
    'Lease buried in a WhatsApp scroll',
    'Tenants unsure what they signed',
    'Missed payment, no record',
    'Contracts only in Thai',
    'No idea when lease ends',
    'Paperwork lost in email',
  ];

  return (
    <section
      id="variant-a"
      className="bg-warm-50 dark:bg-charcoal-900 min-h-screen font-[var(--font-plus-jakarta)]"
    >
      <MockNav variantLabel="Variant A" />
      <VariantLabel label="A — Free Hero (Minimal/Editorial)" color="saffron" />

      {/* ── Hero ── */}
      <div className="pt-20 pb-24 px-6 text-center max-w-3xl mx-auto">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-saffron-500/10 dark:bg-saffron-500/20 px-3 py-1 text-xs font-semibold text-saffron-600 dark:text-saffron-400 mb-6 uppercase tracking-wider">
          Free for landlords
        </span>
        <h1 className="font-[var(--font-manrope)] text-5xl md:text-7xl font-light leading-[1.05] text-charcoal-900 dark:text-white tracking-[-0.03em] mb-6">
          Manage your rentals — <span className="font-bold text-saffron-500">free.</span>
        </h1>
        <p className="text-charcoal-600 dark:text-white/70 text-lg md:text-xl leading-relaxed max-w-xl mx-auto mb-10">
          Upload contracts, track payments, and connect with tenants — in Thai and English — without
          spreadsheets or group chats.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-2xl bg-saffron-500 hover:bg-saffron-600 text-white font-semibold px-7 py-3.5 text-base shadow-lg shadow-saffron-500/20 hover:shadow-saffron-500/30 transition-all"
          >
            Get started — it&apos;s free
            <IconArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-2xl border-2 border-charcoal-800/20 dark:border-white/20 text-charcoal-700 dark:text-white/80 font-semibold px-7 py-3.5 text-base hover:border-charcoal-800/40 dark:hover:border-white/40 transition-all"
          >
            Log in
          </Link>
        </div>
      </div>

      {/* ── Pain chips ── */}
      <div className="px-6 pb-16 max-w-[900px] mx-auto text-center">
        <p className="text-xs font-semibold tracking-[0.1em] uppercase text-saffron-500 mb-6 font-[var(--font-manrope)]">
          Sound familiar?
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          {problemChips.map((chip) => (
            <span
              key={chip}
              className="bg-saffron-500/[0.08] dark:bg-saffron-500/[0.12] border border-saffron-500/20 dark:border-saffron-500/25 rounded-xl px-4 py-2 text-sm font-medium text-charcoal-800 dark:text-warm-200 shadow-sm"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>

      {/* ── Features ── */}
      <div id="features" className="py-20 px-6 max-w-[1100px] mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold tracking-[0.1em] uppercase text-saffron-500 mb-3 font-[var(--font-manrope)]">
            What you get
          </p>
          <h2 className="font-[var(--font-manrope)] text-3xl md:text-4xl font-bold text-charcoal-800 dark:text-white tracking-[-0.02em] mb-3">
            Everything a landlord needs
          </h2>
          <p className="text-charcoal-600 dark:text-white/60 text-lg max-w-[520px] mx-auto">
            Built for the way rentals actually work in Thailand.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: <IconUpload className="w-5 h-5 text-saffron-500" />,
              bg: 'bg-saffron-500/10',
              title: 'Upload contracts',
              desc: 'Drop a PDF lease and the key clauses appear in seconds — dates, rent, deposit, notice periods.',
            },
            {
              icon: <IconCalendar className="w-5 h-5 text-sage-500" />,
              bg: 'bg-sage-500/10',
              title: 'Track payments',
              desc: "Log rent received, mark what's outstanding, and see your full payment history at a glance.",
            },
            {
              icon: <IconUsers className="w-5 h-5 text-saffron-500" />,
              bg: 'bg-saffron-500/10',
              title: 'Pair tenants',
              desc: 'Invite tenants to view their own lease in their language — no more answering the same questions.',
            },
          ].map((card) => (
            <div
              key={card.title}
              className="bg-white/60 dark:bg-white/[0.05] border border-charcoal-800/10 dark:border-white/10 rounded-2xl shadow-sm p-7"
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${card.bg}`}
              >
                {card.icon}
              </div>
              <h3 className="font-[var(--font-manrope)] text-base font-bold text-charcoal-800 dark:text-white mb-2">
                {card.title}
              </h3>
              <p className="text-sm text-charcoal-600 dark:text-white/60 leading-relaxed">
                {card.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── FAQ ── */}
      <div id="faq" className="py-20 px-6 bg-warm-50 dark:bg-charcoal-900">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-[var(--font-manrope)] text-3xl md:text-4xl font-bold text-charcoal-800 dark:text-white mb-2 tracking-tight">
              Questions
            </h2>
            <p className="text-base text-charcoal-600 dark:text-white/50">
              If it&apos;s not here, write to hello@rentos.homes
            </p>
          </div>
          <FAQSection items={VARIANT_A_FAQ} />
        </div>
      </div>

      {/* ── CTA Band ── */}
      <div className="bg-charcoal-900 py-20 px-6">
        <div className="max-w-[500px] mx-auto text-center space-y-6">
          <h2 className="font-[var(--font-manrope)] text-3xl md:text-4xl font-bold text-white tracking-[-0.02em]">
            Ready to bring order to your rentals?
          </h2>
          <p className="text-white/70 text-lg">
            It takes two minutes to upload your first property and contract.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-2xl bg-saffron-500 hover:bg-saffron-600 text-white font-semibold px-8 py-4 text-base shadow-lg shadow-saffron-500/20 transition-all"
          >
            Start for free
            <IconArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <MockFooter />
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VARIANT B — "Split Hero" (Dual-Audience)
// ═══════════════════════════════════════════════════════════════════════════════

const VARIANT_B_FAQ: FAQItem[] = [
  {
    q: 'Do both landlords and tenants need an account?',
    a: 'Landlords create the account and invite tenants by email. Tenants get a free account to view their lease and payment history.',
  },
  {
    q: 'What happens after I upload a contract?',
    a: 'RentOS reads the PDF and surfaces the key terms — who signed, the rent amount, lease dates, and deposit details — presented clearly for both sides.',
  },
  {
    q: 'Is my data private?',
    a: 'Yes. Your documents are stored encrypted in a Thailand-region server. We never share or sell your data.',
  },
  {
    q: 'What languages are supported?',
    a: 'Thai and English throughout — contracts, notifications, and the entire interface.',
  },
];

function VariantB() {
  return (
    <section
      id="variant-b"
      className="bg-warm-50 dark:bg-charcoal-900 min-h-screen font-[var(--font-plus-jakarta)]"
    >
      <MockNav variantLabel="Variant B" />
      <VariantLabel label="B — Split Hero (Dual-Audience)" color="sage" />

      {/* ── Split Hero ── */}
      <div className="px-6 pt-16 pb-10 max-w-[1120px] mx-auto">
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-saffron-500/10 dark:bg-saffron-500/20 px-3 py-1 text-xs font-semibold text-saffron-600 dark:text-saffron-400 mb-4 uppercase tracking-wider">
            Free for landlords · Free for tenants
          </span>
          <h1 className="font-[var(--font-manrope)] text-4xl md:text-6xl font-bold text-charcoal-900 dark:text-white tracking-[-0.03em] leading-tight">
            One lease. Both sides. <span className="text-saffron-500">Finally.</span>
          </h1>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-8">
          {/* Landlord panel */}
          <div className="rounded-3xl bg-charcoal-900 dark:bg-charcoal-800 p-8 md:p-10 flex flex-col gap-6">
            <div>
              <p className="text-xs font-semibold tracking-[0.1em] uppercase text-saffron-400 mb-3 font-[var(--font-manrope)]">
                For landlords
              </p>
              <h2 className="font-[var(--font-manrope)] text-2xl md:text-3xl font-bold text-white leading-tight mb-3">
                Upload contracts, track payments, manage properties
              </h2>
              <p className="text-white/70 text-base leading-relaxed">
                Add your properties, upload the signed lease, and know at a glance what&apos;s paid
                and what&apos;s coming up — no spreadsheets required.
              </p>
            </div>
            <ul className="space-y-3">
              {[
                'Upload any PDF lease — key clauses appear instantly',
                'Track rent payments property by property',
                'Invite tenants to view their own lease',
                'Thai & English throughout',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-white/80">
                  <span className="w-5 h-5 rounded-full bg-saffron-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <IconCheck className="w-3 h-3 text-saffron-400" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/signup?role=landlord"
              className="inline-flex items-center gap-2 rounded-2xl bg-saffron-500 hover:bg-saffron-600 text-white font-semibold px-6 py-3 text-sm shadow-lg shadow-saffron-500/20 transition-all self-start"
            >
              Start free as a landlord
              <IconArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Tenant panel */}
          <div className="rounded-3xl bg-sage-50 dark:bg-sage-900/30 border border-sage-200 dark:border-sage-700/30 p-8 md:p-10 flex flex-col gap-6">
            <div>
              <p className="text-xs font-semibold tracking-[0.1em] uppercase text-sage-600 dark:text-sage-400 mb-3 font-[var(--font-manrope)]">
                For tenants
              </p>
              <h2 className="font-[var(--font-manrope)] text-2xl md:text-3xl font-bold text-charcoal-800 dark:text-white leading-tight mb-3">
                See your lease in your language, know when rent is due
              </h2>
              <p className="text-charcoal-600 dark:text-white/70 text-base leading-relaxed">
                No more asking your landlord what the contract says. See every clause in Thai or
                English, and know exactly what you owe and when.
              </p>
            </div>
            <ul className="space-y-3">
              {[
                'Your lease, translated into plain language',
                'Payment due dates at a glance',
                'Full payment history in one place',
                'Switch between Thai and English any time',
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-sm text-charcoal-700 dark:text-white/80"
                >
                  <span className="w-5 h-5 rounded-full bg-sage-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <IconCheck className="w-3 h-3 text-sage-600 dark:text-sage-400" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/signup?role=tenant"
              className="inline-flex items-center gap-2 rounded-2xl bg-sage-500 hover:bg-sage-600 text-white font-semibold px-6 py-3 text-sm shadow-sm transition-all self-start"
            >
              Join as a tenant
              <IconArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── How it works ── */}
      <div className="py-20 px-6">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold tracking-[0.1em] uppercase text-saffron-500 mb-3 font-[var(--font-manrope)]">
              How it works
            </p>
            <h2 className="font-[var(--font-manrope)] text-3xl md:text-4xl font-bold text-charcoal-800 dark:text-white tracking-[-0.02em]">
              Three steps. Done.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: <IconUpload className="w-6 h-6 text-saffron-500" />,
                title: 'Upload the lease',
                desc: 'Add your property and drop the signed PDF. Works with any Thai rental contract.',
              },
              {
                step: '02',
                icon: <IconFileText className="w-6 h-6 text-sage-500" />,
                title: 'Clauses appear',
                desc: 'Key terms are extracted and presented clearly — in Thai and English — for both parties.',
              },
              {
                step: '03',
                icon: <IconUsers className="w-6 h-6 text-saffron-500" />,
                title: 'Both sides understand',
                desc: 'Invite your tenant. They see their lease in their language. No more confusion.',
              },
            ].map((step) => (
              <div key={step.step} className="relative text-center">
                <div className="font-[var(--font-manrope)] text-6xl font-black text-charcoal-800/[0.06] dark:text-white/[0.06] mb-4 leading-none select-none">
                  {step.step}
                </div>
                <div className="w-14 h-14 rounded-2xl bg-warm-100 dark:bg-white/[0.06] border border-charcoal-800/10 dark:border-white/10 flex items-center justify-center mx-auto mb-4 -mt-10">
                  {step.icon}
                </div>
                <h3 className="font-[var(--font-manrope)] text-lg font-bold text-charcoal-800 dark:text-white mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-charcoal-600 dark:text-white/60 leading-relaxed max-w-xs mx-auto">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Feature cards ── */}
      <div id="features" className="py-16 px-6 bg-warm-100/50 dark:bg-white/[0.02]">
        <div className="max-w-[1100px] mx-auto">
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: <IconGlobe className="w-5 h-5 text-saffron-500" />,
                bg: 'bg-saffron-500/10',
                title: 'Truly bilingual',
                desc: 'Thai and English in every corner of the app — not an afterthought, but the foundation.',
              },
              {
                icon: <IconShield className="w-5 h-5 text-sage-500" />,
                bg: 'bg-sage-500/10',
                title: 'Your documents, private',
                desc: 'Contracts are stored encrypted. Only you and the tenants you invite can see them.',
              },
              {
                icon: <IconCalendar className="w-5 h-5 text-saffron-500" />,
                bg: 'bg-saffron-500/10',
                title: 'Payment clarity',
                desc: "Log every payment, see what's due, and maintain a clean record for both parties.",
              },
              {
                icon: <IconMapPin className="w-5 h-5 text-sage-500" />,
                bg: 'bg-sage-500/10',
                title: 'Built for Thailand',
                desc: 'Designed for Thai rental contracts and the people who sign them — not adapted from somewhere else.',
              },
            ].map((card) => (
              <div
                key={card.title}
                className="bg-white/70 dark:bg-white/[0.05] border border-charcoal-800/10 dark:border-white/10 rounded-2xl shadow-sm p-7"
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${card.bg}`}
                >
                  {card.icon}
                </div>
                <h3 className="font-[var(--font-manrope)] text-base font-bold text-charcoal-800 dark:text-white mb-2">
                  {card.title}
                </h3>
                <p className="text-sm text-charcoal-600 dark:text-white/60 leading-relaxed">
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Trust signals ── */}
      <div className="py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex flex-wrap gap-6 justify-center">
            {[
              {
                icon: <IconMapPin className="w-5 h-5" />,
                label: 'Built in Thailand, for Thailand',
              },
              { icon: <IconShield className="w-5 h-5" />, label: 'Your data stays private' },
              { icon: <IconGlobe className="w-5 h-5" />, label: 'Thai & English' },
              { icon: <IconCheck className="w-5 h-5" />, label: 'No credit card needed' },
            ].map((t) => (
              <div
                key={t.label}
                className="flex items-center gap-2 text-sm text-charcoal-600 dark:text-white/60"
              >
                <span className="text-saffron-500">{t.icon}</span>
                {t.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FAQ ── */}
      <div id="faq" className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-[var(--font-manrope)] text-3xl md:text-4xl font-bold text-charcoal-800 dark:text-white mb-2 tracking-tight">
              Common questions
            </h2>
            <p className="text-base text-charcoal-600 dark:text-white/50">
              Still unsure? Write to hello@rentos.homes
            </p>
          </div>
          <FAQSection items={VARIANT_B_FAQ} />
        </div>
      </div>

      {/* ── CTA Band ── */}
      <div className="bg-charcoal-900 py-20 px-6">
        <div className="max-w-[500px] mx-auto text-center space-y-6">
          <h2 className="font-[var(--font-manrope)] text-3xl md:text-4xl font-bold text-white tracking-[-0.02em]">
            Landlord or tenant — get started free
          </h2>
          <p className="text-white/70 text-lg">
            Sign up in two minutes. No payment details. No commitment.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-2xl bg-saffron-500 hover:bg-saffron-600 text-white font-semibold px-8 py-4 text-base shadow-lg shadow-saffron-500/20 transition-all"
          >
            Create free account
            <IconArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <MockFooter />
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VARIANT C — "Numbers Hero" (Action-Oriented)
// ═══════════════════════════════════════════════════════════════════════════════

const VARIANT_C_FAQ: FAQItem[] = [
  {
    q: 'How quickly does contract reading work?',
    a: "Most contracts are processed in under 60 seconds. You'll see the key clauses extracted and presented clearly on screen.",
  },
  {
    q: 'What file formats are supported?',
    a: 'PDF is the primary format — most signed Thai leases are scanned PDFs. Image-based PDFs also work.',
  },
  {
    q: 'Can my tenant use the app too?',
    a: 'Yes. After you upload the contract, invite your tenant by email. They get their own free account to view the lease in their preferred language.',
  },
  {
    q: 'Is this only for Thai landlords?',
    a: 'RentOS works for anyone renting property in Thailand — Thai nationals and expats alike. The app runs in Thai and English.',
  },
];

function VariantC() {
  return (
    <section
      id="variant-c"
      className="bg-warm-50 dark:bg-charcoal-900 min-h-screen font-[var(--font-plus-jakarta)]"
    >
      <MockNav variantLabel="Variant C" />
      <VariantLabel label="C — Numbers Hero (Action-Oriented)" color="charcoal" />

      {/* ── Hero ── */}
      <div className="pt-20 pb-24 px-6 max-w-[1120px] mx-auto">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-saffron-500/10 dark:bg-saffron-500/20 px-3 py-1 text-xs font-semibold text-saffron-600 dark:text-saffron-400 mb-8 uppercase tracking-wider">
            Free for landlords
          </span>
          <h1 className="font-[var(--font-manrope)] text-5xl md:text-7xl font-bold text-charcoal-900 dark:text-white tracking-[-0.03em] leading-[1.02] mb-6">
            Upload a contract. <br className="hidden sm:block" />
            <span className="text-saffron-500">Every clause in 60 seconds.</span>
          </h1>
          <p className="text-charcoal-600 dark:text-white/70 text-lg md:text-xl leading-relaxed max-w-2xl mb-10">
            No more confusing leases. No more lost paperwork. RentOS reads the PDF for you and shows
            both landlord and tenant exactly what was signed — in Thai and English.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-2xl bg-saffron-500 hover:bg-saffron-600 text-white font-bold px-8 py-4 text-base shadow-lg shadow-saffron-500/20 hover:shadow-saffron-500/30 transition-all"
            >
              Upload your first contract — free
              <IconArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-2xl border-2 border-charcoal-800/20 dark:border-white/20 text-charcoal-700 dark:text-white/80 font-semibold px-7 py-3.5 text-base hover:border-charcoal-800/40 dark:hover:border-white/40 transition-all"
            >
              Log in
            </Link>
          </div>
        </div>

        {/* Stat strip */}
        <div className="mt-16 flex flex-wrap gap-10 border-t border-charcoal-800/10 dark:border-white/10 pt-10">
          {[
            { number: '60s', label: 'Average contract read time' },
            { number: '2', label: 'Languages — Thai & English' },
            { number: '0', label: 'Credit cards needed to start' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="font-[var(--font-manrope)] text-4xl font-black text-saffron-500 mb-1">
                {stat.number}
              </div>
              <div className="text-sm text-charcoal-500 dark:text-white/50">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── What RentOS does ── */}
      <div id="features" className="py-20 px-6 bg-charcoal-900">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold tracking-[0.1em] uppercase text-saffron-400 mb-3 font-[var(--font-manrope)]">
              What RentOS does
            </p>
            <h2 className="font-[var(--font-manrope)] text-3xl md:text-4xl font-bold text-white tracking-[-0.02em]">
              Three things. No fluff.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <IconUpload className="w-8 h-8 text-saffron-400" />,
                bg: 'bg-saffron-500/[0.12]',
                title: 'Read the lease',
                highlight: 'Upload any PDF',
                desc: 'Drop a signed rental contract. Within seconds, every important clause is listed clearly — rent amount, deposit, lease term, notice period.',
              },
              {
                icon: <IconCalendar className="w-8 h-8 text-sage-400" />,
                bg: 'bg-sage-500/[0.12]',
                title: "Track what's paid",
                highlight: 'No more guessing',
                desc: 'Log rent payments as they come in. See which months are settled and which are outstanding — across every property you own.',
              },
              {
                icon: <IconGlobe className="w-8 h-8 text-saffron-400" />,
                bg: 'bg-saffron-500/[0.12]',
                title: 'Speak both languages',
                highlight: 'Thai & English',
                desc: 'Landlords and tenants can switch between Thai and English instantly — the interface, the contract summary, and payment history all follow.',
              },
            ].map((block) => (
              <div key={block.title} className="flex flex-col gap-4">
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center ${block.bg}`}
                >
                  {block.icon}
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-saffron-400 mb-1 font-[var(--font-manrope)]">
                    {block.highlight}
                  </p>
                  <h3 className="font-[var(--font-manrope)] text-xl font-bold text-white mb-2">
                    {block.title}
                  </h3>
                  <p className="text-sm text-white/60 leading-relaxed">{block.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Built for Thailand ── */}
      <div className="py-20 px-6">
        <div className="max-w-[1100px] mx-auto">
          <div className="rounded-3xl bg-sage-50 dark:bg-sage-900/20 border border-sage-200 dark:border-sage-700/20 p-10 md:p-16">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <p className="text-xs font-semibold tracking-[0.1em] uppercase text-sage-600 dark:text-sage-400 mb-4 font-[var(--font-manrope)]">
                  Built for Thailand
                </p>
                <h2 className="font-[var(--font-manrope)] text-3xl md:text-4xl font-bold text-charcoal-800 dark:text-white mb-4 tracking-[-0.02em]">
                  Designed here. Not adapted.
                </h2>
                <p className="text-charcoal-600 dark:text-white/70 text-base leading-relaxed">
                  Most rental tools are built for Western markets and localised as an afterthought.
                  RentOS was built from the ground up for the Thai rental market — the contracts,
                  the language, and the way landlords and tenants actually work here.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  {
                    icon: <IconMapPin className="w-5 h-5 text-sage-500" />,
                    label: 'Thailand-region servers',
                    sub: 'Your data stays in-country',
                  },
                  {
                    icon: <IconGlobe className="w-5 h-5 text-saffron-500" />,
                    label: 'Thai & English',
                    sub: 'Switch any time, anywhere',
                  },
                  {
                    icon: <IconShield className="w-5 h-5 text-sage-500" />,
                    label: 'PDPA compliant',
                    sub: 'Built to Thai data law',
                  },
                  {
                    icon: <IconZap className="w-5 h-5 text-saffron-500" />,
                    label: 'Works on mobile',
                    sub: 'No app download needed',
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="bg-white/70 dark:bg-white/[0.05] rounded-2xl p-4 border border-charcoal-800/10 dark:border-white/10"
                  >
                    <div className="mb-2">{item.icon}</div>
                    <p className="text-sm font-semibold text-charcoal-800 dark:text-white mb-0.5">
                      {item.label}
                    </p>
                    <p className="text-xs text-charcoal-500 dark:text-white/50">{item.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── How it works (step strip) ── */}
      <div className="py-16 px-6 bg-warm-100/50 dark:bg-white/[0.02]">
        <div className="max-w-[900px] mx-auto">
          <p className="text-center text-xs font-semibold tracking-[0.1em] uppercase text-saffron-500 mb-10 font-[var(--font-manrope)]">
            In practice
          </p>
          <div className="flex flex-col md:flex-row gap-4 md:gap-0">
            {[
              {
                n: 1,
                label: 'Add your property',
                icon: <IconHome className="w-5 h-5 text-saffron-500" />,
              },
              {
                n: 2,
                label: 'Upload the signed lease',
                icon: <IconUpload className="w-5 h-5 text-saffron-500" />,
              },
              {
                n: 3,
                label: 'Invite your tenant',
                icon: <IconUsers className="w-5 h-5 text-saffron-500" />,
              },
              {
                n: 4,
                label: 'Both sides are clear',
                icon: <IconCheck className="w-5 h-5 text-saffron-500" />,
              },
            ].map((step, i) => (
              <div key={step.n} className="flex md:flex-col items-center gap-4 flex-1">
                <div className="flex md:flex-col items-center gap-3 flex-1">
                  <div className="w-12 h-12 rounded-full bg-saffron-500/10 flex items-center justify-center shrink-0">
                    {step.icon}
                  </div>
                  <p className="text-sm font-medium text-charcoal-800 dark:text-white text-center">
                    {step.label}
                  </p>
                </div>
                {i < 3 && (
                  <div
                    className="hidden md:flex flex-col items-center justify-center h-full"
                    aria-hidden="true"
                  >
                    <div className="w-8 h-px bg-charcoal-800/20 dark:bg-white/20 mx-2" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FAQ ── */}
      <div id="faq" className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-[var(--font-manrope)] text-3xl md:text-4xl font-bold text-charcoal-800 dark:text-white mb-2 tracking-tight">
              Good questions
            </h2>
            <p className="text-base text-charcoal-600 dark:text-white/50">
              Anything else? hello@rentos.homes
            </p>
          </div>
          <FAQSection items={VARIANT_C_FAQ} />
        </div>
      </div>

      {/* ── CTA Band ── */}
      <div className="bg-charcoal-900 py-20 px-6">
        <div className="max-w-[600px] mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-saffron-500/20 px-4 py-1.5 mb-2">
            <IconClock className="w-4 h-4 text-saffron-400" />
            <span className="text-sm font-medium text-saffron-300">
              Upload your first contract in under 2 minutes
            </span>
          </div>
          <h2 className="font-[var(--font-manrope)] text-3xl md:text-4xl font-bold text-white tracking-[-0.02em]">
            Stop guessing. Start knowing.
          </h2>
          <p className="text-white/70 text-lg">
            Your contracts, your payments, your tenants — organised and clear. Free.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-2xl bg-saffron-500 hover:bg-saffron-600 text-white font-bold px-8 py-4 text-base shadow-lg shadow-saffron-500/20 transition-all"
          >
            Get started — it&apos;s free
            <IconArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <MockFooter />
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TABLE OF CONTENTS + PAGE WRAPPER
// ═══════════════════════════════════════════════════════════════════════════════

export default function Sprint8DesignPage() {
  return (
    <div className="bg-charcoal-900 font-[var(--font-plus-jakarta)]">
      {/* ── Table of contents ── */}
      <div className="sticky top-0 z-50 bg-charcoal-900/95 backdrop-blur-xl border-b border-white/10 px-6 py-4">
        <div className="max-w-[1120px] mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="font-[var(--font-manrope)] text-sm font-bold text-white">
              Sprint 8 — Landing Mockups
            </span>
            <span className="text-white/30 text-xs">PO preview · pick a variant</span>
          </div>
          <div className="flex gap-4 flex-wrap">
            <a
              href="#variant-a"
              className="inline-flex items-center gap-1.5 rounded-full bg-saffron-500/20 hover:bg-saffron-500/30 px-3 py-1 text-xs font-semibold text-saffron-400 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-saffron-500 inline-block" />A — Free Hero
            </a>
            <a
              href="#variant-b"
              className="inline-flex items-center gap-1.5 rounded-full bg-sage-500/20 hover:bg-sage-500/30 px-3 py-1 text-xs font-semibold text-sage-400 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-sage-500 inline-block" />B — Split Hero
            </a>
            <a
              href="#variant-c"
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/20 px-3 py-1 text-xs font-semibold text-white/70 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-charcoal-400 inline-block" />C — Numbers Hero
            </a>
          </div>
        </div>
      </div>

      {/* Divider between ToC and variants */}
      <div className="h-2 bg-charcoal-800" />

      {/* Variants */}
      <VariantA />
      <div className="h-4 bg-charcoal-800 flex items-center justify-center">
        <span className="text-xs text-white/30 font-[var(--font-manrope)] tracking-widest uppercase">
          — Variant B below —
        </span>
      </div>
      <VariantB />
      <div className="h-4 bg-charcoal-800 flex items-center justify-center">
        <span className="text-xs text-white/30 font-[var(--font-manrope)] tracking-widest uppercase">
          — Variant C below —
        </span>
      </div>
      <VariantC />
    </div>
  );
}
