import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { AnimatedSection } from './AnimatedSection';
import { NeonButton } from '@/components/ui/neon-button';

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
          <h1 className="font-[var(--font-manrope)] text-5xl md:text-6xl font-light leading-tight text-charcoal-900 dark:text-white tracking-[-0.02em]">
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
            <Link href="/signup?role=landlord" legacyBehavior passHref>
              <NeonButton variant="default">
                {t('landing.cta_primary')}
                <ArrowRight className="w-4 h-4" />
              </NeonButton>
            </Link>
            <Link href="/login" legacyBehavior passHref>
              <NeonButton variant="secondary" neon={false}>
                {t('landing.cta_secondary')}
              </NeonButton>
            </Link>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
