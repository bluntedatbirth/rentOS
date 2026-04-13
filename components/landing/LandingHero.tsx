import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { AnimatedSection } from './AnimatedSection';

interface LandingHeroProps {
  t: (key: string) => string;
}

export function LandingHero({ t }: LandingHeroProps) {
  return (
    <section className="pt-24 pb-20 px-6">
      <div className="max-w-2xl mx-auto text-center relative z-10">
        <AnimatedSection className="space-y-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-saffron-500/10 dark:bg-saffron-500/20 backdrop-blur-sm px-3 py-1 text-xs font-medium text-saffron-700 dark:text-saffron-300 mb-4">
            {t('landing.hero_badge')}
          </span>
          <h1
            className="font-[var(--font-manrope)] text-5xl md:text-6xl font-light leading-tight text-charcoal-900 dark:text-white"
            style={{ letterSpacing: '-0.02em' }}
          >
            {t('landing.hero_headline')
              .split('\n')
              .map((line, i) => (
                <span key={i}>
                  {i === 0 ? line : <span className="font-bold text-saffron-500">{line}</span>}
                  {i === 0 && <br />}
                </span>
              ))}
          </h1>

          <p className="text-charcoal-600 dark:text-white/70 text-lg leading-relaxed font-[var(--font-plus-jakarta)]">
            {t('landing.hero_sub_v1')}
          </p>

          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/signup?role=landlord"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-saffron-700 to-saffron-500 text-white px-7 py-3 rounded text-sm font-semibold no-underline hover:brightness-110 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:ring-offset-2"
            >
              {t('landing.cta_primary')}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center px-6 py-3 rounded text-sm font-medium no-underline border border-charcoal-200 dark:border-white/10 text-charcoal-700 dark:text-white/80 bg-warm-100/80 dark:bg-white/5 backdrop-blur-sm hover:bg-warm-200/80 dark:hover:bg-white/10 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-charcoal-400 focus:ring-offset-2"
            >
              {t('landing.cta_secondary')}
            </Link>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
