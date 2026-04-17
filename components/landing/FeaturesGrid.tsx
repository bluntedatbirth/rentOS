import { AnimatedSection } from './AnimatedSection';

interface Feature {
  highlightKey: string;
  titleKey: string;
  descKey: string;
  icon: 'upload' | 'calendar' | 'globe';
  iconColor: 'saffron' | 'sage';
}

interface FeaturesGridProps {
  t: (key: string) => string;
  features: Feature[];
}

function IconUpload({ className }: { className?: string }) {
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
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function IconCalendar({ className }: { className?: string }) {
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
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
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

const ICON_MAP = {
  upload: IconUpload,
  calendar: IconCalendar,
  globe: IconGlobe,
};

export function FeaturesGrid({ t, features }: FeaturesGridProps) {
  return (
    <section id="features" className="py-20 px-6 bg-charcoal-900">
      <div className="max-w-[1100px] mx-auto">
        <AnimatedSection className="text-center mb-14">
          <p className="text-xs font-semibold tracking-[0.1em] uppercase text-saffron-400 mb-3 font-[var(--font-manrope)]">
            {t('landing.features_label')}
          </p>
          <h2 className="font-[var(--font-manrope)] text-3xl md:text-4xl font-bold text-white tracking-[-0.02em]">
            {t('landing.features_h2')}
          </h2>
        </AnimatedSection>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map(({ highlightKey, titleKey, descKey, icon, iconColor }, i) => {
            const Icon = ICON_MAP[icon];
            const iconClass = iconColor === 'saffron' ? 'text-saffron-400' : 'text-sage-400';
            const bgClass =
              iconColor === 'saffron' ? 'bg-saffron-500/[0.12]' : 'bg-sage-500/[0.12]';
            const highlightClass = iconColor === 'saffron' ? 'text-saffron-400' : 'text-sage-400';

            return (
              <AnimatedSection key={titleKey} delay={i * 0.08} className="flex flex-col gap-4">
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center ${bgClass}`}
                >
                  <Icon className={`w-8 h-8 ${iconClass}`} />
                </div>
                <div>
                  <p
                    className={`text-xs font-bold uppercase tracking-wider mb-1 font-[var(--font-manrope)] ${highlightClass}`}
                  >
                    {t(highlightKey)}
                  </p>
                  <h3 className="font-[var(--font-manrope)] text-xl font-bold text-white mb-2">
                    {t(titleKey)}
                  </h3>
                  <p className="text-sm text-white/60 leading-relaxed">{t(descKey)}</p>
                </div>
              </AnimatedSection>
            );
          })}
        </div>
      </div>
    </section>
  );
}
