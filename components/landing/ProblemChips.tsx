import { AnimatedSection } from './AnimatedSection';

interface ProblemChipsProps {
  t: (key: string) => string;
  chips: string[];
}

export function ProblemChips({ t, chips }: ProblemChipsProps) {
  return (
    <section className="px-6 pt-8 pb-16 bg-warm-50 dark:bg-charcoal-900">
      <AnimatedSection className="max-w-[900px] mx-auto text-center">
        <p className="text-xs font-semibold tracking-[0.1em] uppercase text-saffron-500 mb-6 font-[var(--font-manrope)]">
          {t('landing.problem_label')}
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          {chips.map((chip, i) => (
            <span
              key={i}
              className="backdrop-blur-sm bg-saffron-500/[0.08] dark:bg-saffron-500/[0.12] border border-saffron-500/20 dark:border-saffron-500/25 rounded-xl px-4 py-2 text-sm font-medium text-charcoal-800 dark:text-warm-200 shadow-sm"
            >
              {chip}
            </span>
          ))}
        </div>
      </AnimatedSection>
    </section>
  );
}
