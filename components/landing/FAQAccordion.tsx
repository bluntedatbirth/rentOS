'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface FAQItem {
  id: string;
  q: string;
  a: string;
}

export interface FAQCategory {
  key: string;
  label: string;
  items: FAQItem[];
}

interface Props {
  title: string;
  subtitle: string;
  categories: FAQCategory[];
}

export function FAQAccordion({ title, subtitle, categories }: Props) {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggle = (key: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <section id="faq" className="bg-warm-50 dark:bg-charcoal-900 py-20 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="font-[var(--font-manrope)] text-3xl md:text-4xl font-bold text-charcoal-800 dark:text-white mb-2 tracking-tight">
            {title}
          </h2>
          <p className="text-base text-charcoal-800/60 dark:text-white/50">{subtitle}</p>
        </div>

        {/* Categories */}
        {categories.map((cat) => (
          <div key={cat.key}>
            <p className="text-[11px] uppercase tracking-[0.08em] text-saffron-500 font-semibold font-[var(--font-manrope)] mt-10 mb-4">
              {cat.label}
            </p>
            {cat.items.map((item) => {
              const isOpen = openItems.has(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggle(item.id)}
                  aria-expanded={isOpen}
                  className={`w-full text-left backdrop-blur-[14px] bg-gradient-to-br from-charcoal-800/[0.03] to-white/70 dark:from-white/[0.06] dark:to-white/[0.04] rounded-2xl px-5 py-4 mb-3 cursor-pointer transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 focus-visible:ring-offset-2 ${
                    isOpen
                      ? 'border border-saffron-500/40 shadow-md dark:shadow-black/20 border-l-4 border-l-saffron-500'
                      : 'border border-charcoal-800/10 dark:border-white/10 shadow-sm'
                  }`}
                >
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-[15px] font-medium text-charcoal-800 dark:text-white leading-snug">
                      {item.q}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-charcoal-500 dark:text-white/50 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                      aria-hidden="true"
                    />
                  </div>
                  {isOpen && (
                    <p className="text-sm text-charcoal-800/70 dark:text-white/60 mt-3 leading-relaxed">
                      {item.a}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
