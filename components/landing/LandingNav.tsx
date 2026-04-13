import Link from 'next/link';
import { Home } from 'lucide-react';
import { LanguageToggle } from '@/components/ui/LanguageToggle';

interface LandingNavProps {
  t: (key: string) => string;
}

export function LandingNav({ t }: LandingNavProps) {
  return (
    <header className="sticky top-0 z-50 bg-transparent backdrop-blur-xl border-b border-charcoal-800/[0.06]">
      <div className="max-w-[1120px] mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <Link
          href="/"
          className="no-underline flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:ring-offset-2 rounded"
        >
          <div className="w-8 h-8 rounded-lg bg-saffron-500/12 flex items-center justify-center">
            <Home className="w-4 h-4 text-saffron-500" />
          </div>
          <span className="font-[var(--font-manrope)] text-xl font-bold text-charcoal-800 tracking-tight">
            RentOS
          </span>
        </Link>

        <nav className="flex items-center gap-4 flex-wrap">
          <LanguageToggle variant="inline" onlyLocales={['en', 'th']} />
          <a
            href="#features"
            className="text-charcoal-600 no-underline text-sm font-medium tracking-wide uppercase hover:text-saffron-500 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:ring-offset-2 rounded"
          >
            {t('landing.nav_features')}
          </a>
          <a
            href="#pricing"
            className="text-charcoal-600 no-underline text-sm font-medium tracking-wide uppercase hover:text-saffron-500 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:ring-offset-2 rounded"
          >
            {t('landing.nav_pricing')}
          </a>
          <Link
            href="/login"
            className="text-charcoal-800 no-underline text-sm font-medium hover:text-saffron-500 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:ring-offset-2 rounded"
          >
            {t('landing.nav_login')}
          </Link>
          <Link
            href="/signup"
            className="bg-gradient-to-r from-saffron-700 to-saffron-500 text-white px-5 py-2 rounded text-sm font-semibold no-underline hover:brightness-110 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:ring-offset-2"
          >
            {t('landing.nav_cta')}
          </Link>
        </nav>
      </div>
    </header>
  );
}
