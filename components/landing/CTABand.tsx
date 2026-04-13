import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { AnimatedSection } from './AnimatedSection';

interface CTABandProps {
  t: (key: string) => string;
}

export function CTABand({ t }: CTABandProps) {
  return (
    <section className="bg-gradient-to-br from-saffron-600 to-saffron-500 py-20 px-6 text-center">
      <AnimatedSection className="max-w-[500px] mx-auto space-y-6">
        <h2
          className="font-[var(--font-manrope)] text-3xl md:text-4xl font-bold text-white"
          style={{ letterSpacing: '-0.02em' }}
        >
          {t('landing.cta_band_h2')}
        </h2>
        <p className="text-white/80 text-lg">{t('landing.cta_band_sub')}</p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-white text-saffron-600 px-8 py-3.5 rounded-sm text-sm font-bold no-underline hover:bg-warm-50 transition-colors"
          >
            {t('landing.cta_band_btn')}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </AnimatedSection>
    </section>
  );
}
