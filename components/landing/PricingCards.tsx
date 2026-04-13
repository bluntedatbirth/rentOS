import Link from 'next/link';
import { Check } from 'lucide-react';
import { AnimatedSection } from './AnimatedSection';

interface PricingCardsProps {
  t: (key: string) => string;
  freePlanItems: string[];
}

export function PricingCards({ t, freePlanItems }: PricingCardsProps) {
  return (
    <section id="pricing" className="py-20 px-6 bg-warm-50">
      <div className="max-w-[960px] mx-auto">
        <AnimatedSection className="text-center mb-14">
          <p className="text-xs font-semibold tracking-[0.1em] uppercase text-saffron-500 mb-3 font-[var(--font-manrope)]">
            {t('landing.pricing_label')}
          </p>
          <h2
            className="font-[var(--font-manrope)] text-3xl md:text-4xl font-bold text-charcoal-800 mb-3"
            style={{ letterSpacing: '-0.02em' }}
          >
            {t('landing.pricing_h2')}
          </h2>
          <p className="text-charcoal-600 text-base">{t('landing.pricing_sub')}</p>
        </AnimatedSection>

        <div className="max-w-md mx-auto">
          {/* Free tier */}
          <AnimatedSection className="bg-white border border-saffron-500/20 rounded-sm p-9 relative">
            <div className="absolute top-5 right-5 bg-saffron-500/12 text-saffron-500 text-[11px] font-bold px-2.5 py-1 rounded-sm">
              {t('landing.plan_free_name')}
            </div>
            <h3 className="font-[var(--font-manrope)] text-xl font-bold text-charcoal-800 mb-1">
              {t('landing.plan_free_price')}
            </h3>
            <p className="text-xs text-charcoal-600 mb-5">{t('landing.plan_free_per')}</p>
            <div className="mb-6">
              <span className="font-[var(--font-manrope)] text-5xl font-bold text-charcoal-800">
                &#3647;0
              </span>
              <span className="text-sm text-charcoal-300 ml-1.5">/ month</span>
            </div>
            <Link
              href="/signup"
              className="block text-center py-3 rounded-sm border-2 border-saffron-500 text-saffron-500 text-sm font-semibold no-underline mb-6 hover:bg-saffron-500 hover:text-white transition-colors"
            >
              {t('landing.plan_free_cta')}
            </Link>
            <ul className="space-y-2.5">
              {freePlanItems.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-charcoal-500">
                  <Check className="w-4 h-4 mt-0.5 text-saffron-500 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </AnimatedSection>
        </div>

        <p className="text-center mt-6 text-xs text-charcoal-300">{t('landing.pricing_note')}</p>
      </div>
    </section>
  );
}
