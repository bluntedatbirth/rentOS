import Link from 'next/link';
import { AnimatedSection } from './AnimatedSection';

interface LandingHeroProps {
  t: (key: string) => string;
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

export function LandingHero({ t }: LandingHeroProps) {
  return (
    <section className="pt-20 pb-24 px-6 max-w-[1120px] mx-auto">
      <AnimatedSection className="max-w-3xl">
        <h1 className="font-[var(--font-manrope)] text-5xl md:text-7xl font-bold text-charcoal-900 dark:text-white tracking-[-0.03em] leading-[1.02] mb-6">
          {t('landing.hero_headline_line1')} <br className="hidden sm:block" />
          <span className="text-saffron-500">{t('landing.hero_headline_line2')}</span>
        </h1>
        <p className="text-charcoal-600 dark:text-white/70 text-lg md:text-xl leading-relaxed max-w-2xl mb-10">
          {t('landing.hero_sub')}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-2xl bg-saffron-500 hover:bg-saffron-600 text-white font-bold px-8 py-4 text-base shadow-lg shadow-saffron-500/20 hover:shadow-saffron-500/30 transition-all no-underline"
          >
            {t('landing.cta_primary')}
            <IconArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-2xl border-2 border-charcoal-800/20 dark:border-white/20 text-charcoal-700 dark:text-white/80 font-semibold px-7 py-3.5 text-base hover:border-charcoal-800/40 dark:hover:border-white/40 transition-all no-underline"
          >
            {t('landing.cta_secondary')}
          </Link>
        </div>
      </AnimatedSection>

      {/* Stat strip */}
      <AnimatedSection
        delay={0.15}
        className="mt-16 flex flex-wrap gap-10 border-t border-charcoal-800/10 dark:border-white/10 pt-10"
      >
        {[
          { numberKey: 'landing.stat_1_number', labelKey: 'landing.stat_1_label' },
          { numberKey: 'landing.stat_2_number', labelKey: 'landing.stat_2_label' },
          { numberKey: 'landing.stat_3_number', labelKey: 'landing.stat_3_label' },
        ].map(({ numberKey, labelKey }) => (
          <div key={labelKey}>
            <div className="font-[var(--font-manrope)] text-4xl font-black text-saffron-500 mb-1">
              {t(numberKey)}
            </div>
            <div className="text-sm text-charcoal-500 dark:text-white/50">{t(labelKey)}</div>
          </div>
        ))}
      </AnimatedSection>
    </section>
  );
}
