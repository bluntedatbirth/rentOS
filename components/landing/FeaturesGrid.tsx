import { Upload, FileText, CreditCard, Globe } from 'lucide-react';
import { AnimatedSection } from './AnimatedSection';

const FEATURE_ICONS = [Upload, FileText, CreditCard, Globe];

interface FeaturesGridProps {
  t: (key: string) => string;
  features: {
    icon: string;
    titleKey: string;
    descKey: string;
    color: string;
  }[];
}

export function FeaturesGrid({ t, features }: FeaturesGridProps) {
  return (
    <section id="features" className="py-20 px-6 bg-warm-50 dark:bg-charcoal-900">
      <div className="max-w-[1100px] mx-auto">
        <AnimatedSection className="text-center mb-14">
          <p className="text-xs font-semibold tracking-[0.1em] uppercase text-saffron-500 mb-3 font-[var(--font-manrope)]">
            {t('landing.features_label')}
          </p>
          <h2 className="font-[var(--font-manrope)] text-3xl md:text-4xl font-bold text-charcoal-800 dark:text-white mb-3 tracking-[-0.02em]">
            {t('landing.features_h2')}
          </h2>
          <p className="text-charcoal-600 dark:text-white/60 text-lg max-w-[520px] mx-auto">
            {t('landing.features_sub')}
          </p>
        </AnimatedSection>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map(({ titleKey, descKey, color }, i) => {
            const Icon = FEATURE_ICONS[i] || FileText;
            const palette = color === '#f0a500' ? 'saffron' : 'sage';

            return (
              <AnimatedSection
                key={titleKey}
                delay={i * 0.06}
                className="backdrop-blur-[14px] bg-gradient-to-br from-charcoal-800/[0.03] to-white/70 dark:from-white/[0.06] dark:to-white/[0.04] border border-charcoal-800/10 dark:border-white/10 rounded-2xl shadow-md dark:shadow-black/20 p-7"
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                    palette === 'saffron' ? 'bg-saffron-500/12' : 'bg-sage-500/12'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      palette === 'saffron' ? 'text-saffron-500' : 'text-sage-500'
                    }`}
                  />
                </div>
                <h3 className="font-[var(--font-manrope)] text-base font-bold text-charcoal-800 dark:text-white mb-2">
                  {t(titleKey)}
                </h3>
                <p className="text-sm text-charcoal-600 dark:text-white/60 leading-relaxed">
                  {t(descKey)}
                </p>
              </AnimatedSection>
            );
          })}
        </div>
      </div>
    </section>
  );
}
