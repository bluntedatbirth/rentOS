'use client';

import { useState } from 'react';

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
    <section id="faq" style={{ background: 'rgba(240,165,0,0.04)', padding: '80px 24px' }}>
      <div style={{ maxWidth: '768px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <h2
            style={{
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: 700,
              color: '#2c2c2c',
              margin: '0 0 8px',
              letterSpacing: '-0.02em',
            }}
          >
            {title}
          </h2>
          <p style={{ fontSize: '16px', color: 'rgba(44,44,44,0.6)', margin: 0 }}>{subtitle}</p>
        </div>

        {/* Categories */}
        {categories.map((cat) => (
          <div key={cat.key}>
            <p
              style={{
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#f0a500',
                fontWeight: 600,
                margin: '40px 0 16px',
              }}
            >
              {cat.label}
            </p>
            {cat.items.map((item) => {
              const isOpen = openItems.has(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => toggle(item.id)}
                  style={{
                    background: '#fff',
                    border: isOpen
                      ? '1px solid rgba(240,165,0,0.35)'
                      : '1px solid rgba(44,44,44,0.1)',
                    borderLeft: isOpen ? '4px solid #f0a500' : '1px solid rgba(44,44,44,0.1)',
                    borderRadius: '10px',
                    padding: '16px 20px',
                    marginBottom: '12px',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '16px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '15px',
                        fontWeight: 500,
                        color: '#2c2c2c',
                        lineHeight: '1.5',
                      }}
                    >
                      {item.q}
                    </span>
                    <span
                      style={{
                        flexShrink: 0,
                        color: '#f0a500',
                        fontSize: '18px',
                        lineHeight: 1,
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                        display: 'inline-block',
                      }}
                      aria-hidden="true"
                    >
                      ›
                    </span>
                  </div>
                  {isOpen && (
                    <p
                      style={{
                        fontSize: '14px',
                        color: 'rgba(44,44,44,0.7)',
                        margin: '12px 0 0',
                        lineHeight: '1.7',
                      }}
                    >
                      {item.a}
                    </p>
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
