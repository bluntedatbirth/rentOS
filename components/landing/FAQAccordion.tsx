'use client';

import { useState } from 'react';

export interface FAQItem {
  id: string;
  q: string;
  a: string;
}

interface Props {
  title: string;
  subtitle: string;
  items: FAQItem[];
}

function IconChevronDown({ className }: { className?: string }) {
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
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function FAQAccordion({ title, subtitle, items }: Props) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <section id="faq" className="py-20 px-6 bg-warm-50 dark:bg-charcoal-900">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="font-[var(--font-manrope)] text-3xl md:text-4xl font-bold text-charcoal-800 dark:text-white mb-2 tracking-tight">
            {title}
          </h2>
          <p className="text-base text-charcoal-600 dark:text-white/50">{subtitle}</p>
        </div>

        <div className="space-y-3">
          {items.map((item) => {
            const isOpen = open === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setOpen(isOpen ? null : item.id)}
                aria-expanded={isOpen}
                className={`w-full text-left rounded-2xl px-5 py-4 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 focus-visible:ring-offset-2 ${
                  isOpen
                    ? 'bg-warm-100 dark:bg-white/[0.06] border border-saffron-500/40 shadow-md border-l-4 border-l-saffron-500'
                    : 'bg-warm-100/60 dark:bg-white/[0.04] border border-charcoal-800/10 dark:border-white/10 shadow-sm hover:border-charcoal-800/20 dark:hover:border-white/20'
                }`}
              >
                <div className="flex justify-between items-center gap-4">
                  <span className="text-[15px] font-medium text-charcoal-800 dark:text-white leading-snug">
                    {item.q}
                  </span>
                  <IconChevronDown
                    className={`h-4 w-4 text-charcoal-500 dark:text-white/50 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  />
                </div>
                {isOpen && (
                  <p className="text-sm text-charcoal-600 dark:text-white/60 mt-3 leading-relaxed">
                    {item.a}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
