'use client';

import { useState } from 'react';

interface Props {
  monthlyPrice: string; // e.g. "฿199"
  yearlyPrice: string; // e.g. "฿1,990"
  monthlyLabel: string; // e.g. "Monthly · ฿199"
  yearlyLabel: string; // e.g. "Yearly · ฿1,990"
  saveBadge: string; // e.g. "Save 16%"
  perMonth: string; // e.g. "/ month"
  perYear: string; // e.g. "/ year"
  yearlyHint: string; // e.g. "฿166/month billed annually"
  proCtaHref: string; // e.g. "/signup"
  proCtaLabel: string; // e.g. "Get Pro"
}

export function PricingToggle({
  monthlyPrice,
  yearlyPrice,
  monthlyLabel,
  yearlyLabel,
  saveBadge,
  perMonth,
  perYear,
  yearlyHint,
  proCtaHref,
  proCtaLabel,
}: Props) {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <>
      {/* Monthly / Yearly toggle */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => setIsYearly(false)}
          style={{
            padding: '5px 14px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            background: !isYearly ? '#f0a500' : 'rgba(254,252,247,0.12)',
            color: !isYearly ? '#fff' : 'rgba(254,252,247,0.55)',
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          {monthlyLabel}
        </button>
        <button
          type="button"
          onClick={() => setIsYearly(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 14px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            background: isYearly ? '#f0a500' : 'rgba(254,252,247,0.12)',
            color: isYearly ? '#fff' : 'rgba(254,252,247,0.55)',
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          {yearlyLabel}
          <span
            style={{
              background: 'rgba(255,255,255,0.25)',
              borderRadius: '999px',
              padding: '1px 7px',
              fontSize: '10px',
              fontWeight: 700,
            }}
          >
            {saveBadge}
          </span>
        </button>
      </div>

      {/* Price display */}
      <div style={{ marginBottom: isYearly ? '8px' : '24px' }}>
        <span style={{ fontSize: '48px', fontWeight: 700, color: '#f0a500' }}>
          {isYearly ? yearlyPrice : monthlyPrice}
        </span>
        <span style={{ fontSize: '14px', color: 'rgba(254,252,247,0.35)', marginLeft: '6px' }}>
          {isYearly ? perYear : perMonth}
        </span>
      </div>
      {isYearly && (
        <p style={{ fontSize: '12px', color: 'rgba(240,165,0,0.7)', marginBottom: '20px' }}>
          {yearlyHint}
        </p>
      )}

      {/* CTA */}
      <a
        href={proCtaHref}
        className="saffron-btn"
        style={{
          display: 'block',
          textAlign: 'center',
          padding: '12px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 600,
          textDecoration: 'none',
          marginBottom: '24px',
        }}
      >
        {proCtaLabel}
      </a>
    </>
  );
}
