'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Home, Menu, X } from 'lucide-react';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { NeonButton } from '@/components/ui/neon-button';
import { useI18n } from '@/lib/i18n/context';

export function LandingNav() {
  const { t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-warm-50/80 dark:bg-charcoal-900/80 backdrop-blur-xl border-b border-charcoal-800/[0.06] dark:border-white/10">
      <div className="max-w-[1120px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link
          href="/"
          className="no-underline flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:ring-offset-2 rounded"
        >
          <div className="w-8 h-8 rounded-lg bg-saffron-500/12 flex items-center justify-center">
            <Home className="w-4 h-4 text-saffron-500" />
          </div>
          <span className="font-[var(--font-manrope)] text-xl font-bold text-charcoal-800 dark:text-white tracking-tight">
            RentOS
          </span>
        </Link>

        {/* Desktop nav — hidden on mobile */}
        <nav className="hidden md:flex items-center gap-4">
          <LanguageToggle variant="inline" onlyLocales={['en', 'th']} />
          <ThemeToggle />
          <NeonButton
            variant="ghost"
            size="sm"
            neon={false}
            href="#features"
            className="tracking-wide uppercase"
          >
            {t('landing.nav_features')}
          </NeonButton>
          <NeonButton
            variant="ghost"
            size="sm"
            neon={false}
            href="#pricing"
            className="tracking-wide uppercase"
          >
            {t('landing.nav_pricing')}
          </NeonButton>
          <Link href="/login" legacyBehavior passHref>
            <NeonButton variant="ghost" size="sm" neon={false}>
              {t('landing.nav_login')}
            </NeonButton>
          </Link>
          <Link href="/signup" legacyBehavior passHref>
            <NeonButton variant="default" size="sm">
              {t('landing.nav_cta')}
            </NeonButton>
          </Link>
        </nav>

        {/* Mobile controls — visible on mobile only */}
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
            href="#pricing"
            onClick={() => setMobileOpen(false)}
            className="block py-2.5 text-sm font-medium text-charcoal-700 dark:text-white/80 hover:text-saffron-500 transition-colors"
          >
            {t('landing.nav_pricing')}
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
            className="block mt-2 text-center py-2.5 rounded-xl bg-gradient-to-r from-saffron-700 to-saffron-500 text-white text-sm font-semibold no-underline hover:brightness-110 transition"
          >
            {t('landing.nav_cta')}
          </Link>
        </nav>
      )}
    </header>
  );
}
