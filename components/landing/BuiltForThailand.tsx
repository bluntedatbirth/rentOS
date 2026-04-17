import { AnimatedSection } from './AnimatedSection';

interface BuiltForThailandProps {
  t: (key: string) => string;
}

function IconMapPin({ className }: { className?: string }) {
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
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconGlobe({ className }: { className?: string }) {
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
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function IconShield({ className }: { className?: string }) {
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
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconZap({ className }: { className?: string }) {
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
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

export function BuiltForThailand({ t }: BuiltForThailandProps) {
  const trustCards = [
    {
      icon: <IconMapPin className="w-5 h-5 text-sage-500" />,
      labelKey: 'landing.trust_1_label',
      subKey: 'landing.trust_1_sub',
    },
    {
      icon: <IconGlobe className="w-5 h-5 text-saffron-500" />,
      labelKey: 'landing.trust_2_label',
      subKey: 'landing.trust_2_sub',
    },
    {
      icon: <IconShield className="w-5 h-5 text-sage-500" />,
      labelKey: 'landing.trust_3_label',
      subKey: 'landing.trust_3_sub',
    },
    {
      icon: <IconZap className="w-5 h-5 text-saffron-500" />,
      labelKey: 'landing.trust_4_label',
      subKey: 'landing.trust_4_sub',
    },
  ];

  return (
    <section className="py-20 px-6">
      <div className="max-w-[1100px] mx-auto">
        <AnimatedSection>
          <div className="rounded-3xl bg-sage-50 dark:bg-sage-900/20 border border-sage-200 dark:border-sage-700/20 p-10 md:p-16">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <p className="text-xs font-semibold tracking-[0.1em] uppercase text-sage-600 dark:text-sage-400 mb-4 font-[var(--font-manrope)]">
                  {t('landing.built_label')}
                </p>
                <h2 className="font-[var(--font-manrope)] text-3xl md:text-4xl font-bold text-charcoal-800 dark:text-white mb-4 tracking-[-0.02em]">
                  {t('landing.built_h2')}
                </h2>
                <p className="text-charcoal-600 dark:text-white/70 text-base leading-relaxed">
                  {t('landing.built_body')}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {trustCards.map(({ icon, labelKey, subKey }) => (
                  <div
                    key={labelKey}
                    className="bg-white/70 dark:bg-white/[0.05] rounded-2xl p-4 border border-charcoal-800/10 dark:border-white/10"
                  >
                    <div className="mb-2">{icon}</div>
                    <p className="text-sm font-semibold text-charcoal-800 dark:text-white mb-0.5">
                      {t(labelKey)}
                    </p>
                    <p className="text-xs text-charcoal-500 dark:text-white/50">{t(subKey)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
