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
    <section id="faq" className="bg-saffron-500/[0.04] py-20 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-4">
          <h2 className="font-[var(--font-manrope)] text-3xl md:text-4xl font-bold text-charcoal-800 mb-2 tracking-tight">
            {title}
          </h2>
          <p className="text-base text-charcoal-800/60">{subtitle}</p>
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
                <div
                  key={item.id}
                  onClick={() => toggle(item.id)}
                  className={`bg-white rounded-lg px-5 py-4 mb-3 cursor-pointer transition-colors duration-150 ${
                    isOpen
                      ? 'border border-saffron-500/35 border-l-4 border-l-saffron-500'
                      : 'border border-charcoal-800/10'
                  }`}
                >
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-[15px] font-medium text-charcoal-800 leading-snug">
                      {item.q}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-charcoal-500 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                      aria-hidden="true"
                    />
                  </div>
                  {isOpen && (
                    <p className="text-sm text-charcoal-800/70 mt-3 leading-relaxed">{item.a}</p>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
