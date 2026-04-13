import Link from 'next/link';
import { AnimatedSection } from './AnimatedSection';
import { RippleButton } from '@/components/ui/multi-type-ripple-buttons';

interface PricingCardsProps {
  t: (key: string) => string;
  freePlanItems: string[];
}

const CheckIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export function PricingCards({ t, freePlanItems }: PricingCardsProps) {
  return (
    <section id="pricing" className="py-20 px-6 bg-warm-50 dark:bg-charcoal-900">
      <div className="max-w-[960px] mx-auto">
        <AnimatedSection className="text-center mb-14">
          <p className="text-xs font-semibold tracking-[0.1em] uppercase text-saffron-500 mb-3 font-[var(--font-manrope)]">
            {t('landing.pricing_label')}
          </p>
          <h2
            className="font-[var(--font-manrope)] text-3xl md:text-4xl font-bold text-charcoal-800 dark:text-white mb-3"
            style={{ letterSpacing: '-0.02em' }}
          >
            {t('landing.pricing_h2')}
          </h2>
          <p className="text-charcoal-600 dark:text-white/60 text-base">
            {t('landing.pricing_sub')}
          </p>
        </AnimatedSection>

        <div className="max-w-sm mx-auto">
          <AnimatedSection>
            {/* Glassy pricing card */}
            <div className="backdrop-blur-[14px] bg-gradient-to-br from-charcoal-800/5 to-white/60 dark:from-white/5 dark:to-white/10 border border-charcoal-800/10 dark:border-white/10 rounded-2xl shadow-xl px-7 py-8 flex flex-col relative overflow-hidden">
              {/* Popular badge */}
              <div className="absolute -top-0 right-4 px-3 py-1.5 text-[11px] font-bold rounded-b-lg bg-saffron-500 text-white tracking-wide">
                {t('landing.plan_free_name')}
              </div>

              {/* Plan name + description */}
              <div className="mb-3">
                <h3 className="text-[42px] font-extralight tracking-[-0.03em] text-charcoal-900 dark:text-white font-[var(--font-manrope)]">
                  {t('landing.plan_free_price')}
                </h3>
                <p className="text-sm text-charcoal-600 dark:text-white/60 mt-1">
                  {t('landing.plan_free_per')}
                </p>
              </div>

              {/* Price */}
              <div className="my-6 flex items-baseline gap-2">
                <span className="text-[48px] font-extralight text-charcoal-900 dark:text-white font-[var(--font-manrope)]">
                  ฿0
                </span>
                <span className="text-sm text-charcoal-500 dark:text-white/50">/ month</span>
              </div>

              {/* Glassy divider */}
              <div className="w-full mb-5 h-px bg-[linear-gradient(90deg,transparent,rgba(0,0,0,0.08)_20%,rgba(0,0,0,0.15)_50%,rgba(0,0,0,0.08)_80%,transparent)]" />

              {/* Features list */}
              <ul className="flex flex-col gap-2.5 text-sm text-charcoal-700 dark:text-white/80 mb-8">
                {freePlanItems.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2.5">
                    <CheckIcon className="text-saffron-500 w-4 h-4 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              {/* CTA button with ripple */}
              <Link href="/signup" className="no-underline mt-auto">
                <RippleButton className="w-full py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-saffron-600 to-saffron-500 text-white hover:brightness-110">
                  {t('landing.plan_free_cta')}
                </RippleButton>
              </Link>
            </div>
          </AnimatedSection>
        </div>

        <p className="text-center mt-8 text-xs text-charcoal-400 dark:text-white/40">
          {t('landing.pricing_note')}
        </p>
      </div>
    </section>
  );
}
