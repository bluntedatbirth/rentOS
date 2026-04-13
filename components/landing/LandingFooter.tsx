import Link from 'next/link';

interface LandingFooterProps {
  t: (key: string) => string;
}

export function LandingFooter({ t }: LandingFooterProps) {
  return (
    <footer className="border-t border-charcoal-800/[0.06] dark:border-white/10 bg-warm-50 dark:bg-charcoal-900 px-6 py-10">
      <div className="max-w-[1120px] mx-auto space-y-6">
        {/* Disclaimer */}
        <p className="text-[11px] text-charcoal-400 dark:text-white/40 leading-relaxed max-w-[896px] mx-auto text-center">
          {t('disclaimer.footer_text')}{' '}
          <Link
            href="/legal#privacy"
            className="text-charcoal-500 dark:text-white/50 underline hover:text-saffron-500 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 focus-visible:ring-offset-2 rounded"
          >
            {t('disclaimer.privacy_link')}
          </Link>{' '}
          <Link
            href="/legal#terms"
            className="text-charcoal-500 dark:text-white/50 underline hover:text-saffron-500 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 focus-visible:ring-offset-2 rounded"
          >
            {t('disclaimer.terms_link')}
          </Link>
        </p>

        {/* Footer nav */}
        <div className="flex flex-wrap justify-between items-center gap-4">
          <span className="text-xs text-charcoal-300 dark:text-white/40">
            {t('landing.footer_tagline')}
          </span>
          <div className="flex gap-6 flex-wrap">
            <a
              href="#faq"
              className="text-xs text-charcoal-300 dark:text-white/50 no-underline hover:text-saffron-500 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 focus-visible:ring-offset-2 rounded"
            >
              {t('footer.faq_link')}
            </a>
            <Link
              href="/login"
              className="text-xs text-charcoal-300 dark:text-white/50 no-underline hover:text-saffron-500 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 focus-visible:ring-offset-2 rounded"
            >
              {t('landing.nav_login')}
            </Link>
            <Link
              href="/signup"
              className="text-xs text-charcoal-300 dark:text-white/50 no-underline hover:text-saffron-500 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 focus-visible:ring-offset-2 rounded"
            >
              {t('landing.nav_cta')}
            </Link>
            <a
              href="mailto:hello@rentos.homes"
              className="text-xs text-charcoal-300 dark:text-white/50 no-underline hover:text-saffron-500 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 focus-visible:ring-offset-2 rounded"
            >
              hello@rentos.homes
            </a>
          </div>
          <span className="text-xs text-charcoal-200 dark:text-white/30">
            {t('landing.footer_copy')}
          </span>
        </div>
      </div>
    </footer>
  );
}
