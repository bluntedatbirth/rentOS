'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useI18n } from '@/lib/i18n/context';

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

export function LandingNav() {
  const { t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-warm-50/90 dark:bg-charcoal-900/90 backdrop-blur-xl border-b border-charcoal-800/[0.06] dark:border-white/10">
      <div className="max-w-[1120px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link
          href="/"
          className="no-underline flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:ring-offset-2 rounded"
        >
          <div className="w-8 h-8 rounded-lg bg-saffron-500/10 flex items-center justify-center">
            <IconHome className="w-4 h-4 text-saffron-500" />
          </div>
          <span className="font-[var(--font-manrope)] text-xl font-bold text-charcoal-800 dark:text-white tracking-tight">
            RentOS
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-4">
          <LanguageToggle variant="inline" onlyLocales={['en', 'th']} />
          <ThemeToggle />
          <a
            href="#features"
            className="text-sm font-medium text-charcoal-600 dark:text-white/70 hover:text-charcoal-900 dark:hover:text-white transition-colors tracking-wide uppercase"
          >
            {t('landing.nav_features')}
          </a>
          <a
            href="#faq"
            className="text-sm font-medium text-charcoal-600 dark:text-white/70 hover:text-charcoal-900 dark:hover:text-white transition-colors tracking-wide uppercase"
          >
            {t('landing.nav_faq')}
          </a>
          <Link
            href="/login"
            className="text-sm font-medium text-charcoal-600 dark:text-white/70 hover:text-charcoal-900 dark:hover:text-white transition-colors no-underline"
          >
            {t('landing.nav_login')}
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center gap-1.5 rounded-xl bg-saffron-500 hover:bg-saffron-600 text-white text-sm font-semibold px-4 py-2 transition-colors shadow-sm no-underline"
          >
            {t('landing.nav_cta')}
            <IconArrowRight className="w-3.5 h-3.5" />
          </Link>
        </nav>

        {/* Mobile controls */}
        <div className="flex md:hidden items-center gap-2">
          <LanguageToggle variant="inline" onlyLocales={['en', 'th']} />
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            className="p-2 rounded-lg text-charcoal-600 dark:text-white/70 hover:bg-warm-100 dark:hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-charcoal-800/[0.06] dark:border-white/10 bg-warm-50/95 dark:bg-charcoal-900/95 backdrop-blur-xl px-6 py-4 space-y-2">
          <a
            href="#features"
            onClick={() => setMobileOpen(false)}
            className="block py-2.5 text-sm font-medium text-charcoal-700 dark:text-white/80 hover:text-saffron-500 transition-colors"
          >
            {t('landing.nav_features')}
          </a>
          <a
            href="#faq"
            onClick={() => setMobileOpen(false)}
            className="block py-2.5 text-sm font-medium text-charcoal-700 dark:text-white/80 hover:text-saffron-500 transition-colors"
          >
            {t('landing.nav_faq')}
          </a>
          <Link
            href="/login"
            onClick={() => setMobileOpen(false)}
            className="block py-2.5 text-sm font-medium text-charcoal-700 dark:text-white/80 hover:text-saffron-500 transition-colors no-underline"
          >
            {t('landing.nav_login')}
          </Link>
          <Link
            href="/signup"
            onClick={() => setMobileOpen(false)}
            className="block mt-2 text-center py-2.5 rounded-xl bg-saffron-500 hover:bg-saffron-600 text-white text-sm font-semibold no-underline transition-colors"
          >
            {t('landing.nav_cta')}
          </Link>
        </nav>
      )}
    </header>
  );
}
