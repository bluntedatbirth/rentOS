import { AnimatedSection } from './AnimatedSection';

interface ProblemChipsProps {
  t: (key: string) => string;
  chips: string[];
}

export function ProblemChips({ t, chips }: ProblemChipsProps) {
  return (
    <section className="px-6 pt-6 pb-14 bg-warm-50">
      <AnimatedSection className="max-w-[900px] mx-auto text-center">
        <p className="text-xs font-semibold tracking-[0.1em] uppercase text-saffron-500 mb-5 font-[var(--font-manrope)]">
          {t('landing.problem_label')}
        </p>
        <div className="flex flex-wrap gap-2.5 justify-center">
          {chips.map((chip, i) => (
            <span
              key={i}
              className="bg-saffron-500/10 border border-saffron-500/25 rounded-sm px-4 py-2 text-sm font-medium text-charcoal-800"
            >
              {chip}
            </span>
          ))}
        </div>
      </AnimatedSection>
    </section>
  );
}
