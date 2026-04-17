import Link from 'next/link';
import { AnimatedSection } from './AnimatedSection';

interface CTABandProps {
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

export function CTABand({ t }: CTABandProps) {
  return (
    <section className="bg-charcoal-900 py-20 px-6">
      <AnimatedSection className="max-w-[600px] mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-saffron-500/20 px-4 py-1.5 mb-2">
          <IconClock className="w-4 h-4 text-saffron-400" />
          <span className="text-sm font-medium text-saffron-300">
            {t('landing.cta_band_badge')}
          </span>
        </div>
        <h2 className="font-[var(--font-manrope)] text-3xl md:text-4xl font-bold text-white tracking-[-0.02em]">
          {t('landing.cta_band_h2')}
        </h2>
        <p className="text-white/70 text-lg">{t('landing.cta_band_sub')}</p>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 rounded-2xl bg-saffron-500 hover:bg-saffron-600 text-white font-bold px-8 py-4 text-base shadow-lg shadow-saffron-500/20 transition-all no-underline"
        >
          {t('landing.cta_band_btn')}
          <IconArrowRight className="w-4 h-4" />
        </Link>
      </AnimatedSection>
    </section>
  );
}
