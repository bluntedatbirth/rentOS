import { AnimatedSection } from './AnimatedSection';

interface StepStripProps {
  t: (key: string) => string;
}

function IconHome({ className }: { className?: string }) {
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
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
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

function IconUsers({ className }: { className?: string }) {
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
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function StepStrip({ t }: StepStripProps) {
  const steps = [
    { labelKey: 'landing.step_1', icon: <IconHome className="w-5 h-5 text-saffron-500" /> },
    { labelKey: 'landing.step_2', icon: <IconUpload className="w-5 h-5 text-saffron-500" /> },
    { labelKey: 'landing.step_3', icon: <IconUsers className="w-5 h-5 text-saffron-500" /> },
    { labelKey: 'landing.step_4', icon: <IconCheck className="w-5 h-5 text-saffron-500" /> },
  ];

  return (
    <section className="py-16 px-6 bg-warm-100/50 dark:bg-white/[0.02]">
      <div className="max-w-[900px] mx-auto">
        <AnimatedSection>
          <p className="text-center text-xs font-semibold tracking-[0.1em] uppercase text-saffron-500 mb-10 font-[var(--font-manrope)]">
            {t('landing.steps_label')}
          </p>
          <div className="flex flex-col md:flex-row gap-4 md:gap-0">
            {steps.map(({ labelKey, icon }, i) => (
              <div key={labelKey} className="flex md:flex-col items-center gap-4 flex-1">
                <div className="flex md:flex-col items-center gap-3 flex-1">
                  <div className="w-12 h-12 rounded-full bg-saffron-500/10 flex items-center justify-center shrink-0">
                    {icon}
                  </div>
                  <p className="text-sm font-medium text-charcoal-800 dark:text-white text-center">
                    {t(labelKey)}
                  </p>
                </div>
                {i < steps.length - 1 && (
                  <div
                    className="hidden md:flex flex-col items-center justify-center h-full"
                    aria-hidden="true"
                  >
                    <div className="w-8 h-px bg-charcoal-800/20 dark:bg-white/20 mx-2" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
