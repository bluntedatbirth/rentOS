import Link from 'next/link';
import { getServerLocale, getServerT } from '@/lib/i18n/server';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { PricingToggle } from '@/components/landing/PricingToggle';
import { FAQAccordion } from '@/components/landing/FAQAccordion';
import type { FAQCategory } from '@/components/landing/FAQAccordion';
import { SLOT_UNLOCK_PACKS, PRO_MONTHLY_THB } from '@/lib/tier';

// ─── Landing Page — "People First" (Mockup C design, wired to i18n + tier constants)
// Palette: warm white #fefcf7, charcoal #2c2c2c, saffron #f0a500, sage #5a7a5a
// Typography: DM Sans + Georgia for pull quotes
// Server Component: statically rendered; interactive islands use 'use client'

export default function LandingPage() {
  const locale = getServerLocale();
  const t = getServerT(locale);

  const problemChips = [
    t('landing.problem_chip_1'),
    t('landing.problem_chip_2'),
    t('landing.problem_chip_3'),
    t('landing.problem_chip_4'),
    t('landing.problem_chip_5'),
    t('landing.problem_chip_6'),
    t('landing.problem_chip_7'),
    t('landing.problem_chip_8'),
  ];

  const landlordItems = [
    { icon: '📄', text: t('landing.landlord_item_1') },
    { icon: '⚠️', text: t('landing.landlord_item_2') },
    { icon: '🔧', text: t('landing.landlord_item_3') },
    { icon: '🏛️', text: t('landing.landlord_item_4') },
  ];

  const tenantItems = [
    { icon: '📋', text: t('landing.tenant_item_1') },
    { icon: '📅', text: t('landing.tenant_item_2') },
    { icon: '💬', text: t('landing.tenant_item_3') },
    { icon: '🔍', text: t('landing.tenant_item_4') },
  ];

  const features = [
    {
      icon: '📄',
      titleKey: 'landing.feature_1_title',
      descKey: 'landing.feature_1_desc',
      color: '#f0a500',
    },
    {
      icon: '⚠️',
      titleKey: 'landing.feature_2_title',
      descKey: 'landing.feature_2_desc',
      color: '#5a7a5a',
    },
    {
      icon: '🔧',
      titleKey: 'landing.feature_3_title',
      descKey: 'landing.feature_3_desc',
      color: '#f0a500',
    },
    {
      icon: '🏛️',
      titleKey: 'landing.feature_4_title',
      descKey: 'landing.feature_4_desc',
      color: '#5a7a5a',
    },
    {
      icon: '💳',
      titleKey: 'landing.feature_5_title',
      descKey: 'landing.feature_5_desc',
      color: '#f0a500',
    },
    {
      icon: '🌐',
      titleKey: 'landing.feature_6_title',
      descKey: 'landing.feature_6_desc',
      color: '#5a7a5a',
    },
  ];

  const freePlanItems = t('landing.plan_free_items').split('|');
  const proPlanItems = t('landing.plan_pro_items').split('|');

  // FAQ data constructed server-side, passed to client island as plain props
  const faqCategories: FAQCategory[] = [
    {
      key: 'about',
      label: t('faq.category_about'),
      items: [
        { id: 'q1', q: t('faq.q1_question'), a: t('faq.q1_answer') },
        { id: 'q2', q: t('faq.q2_question'), a: t('faq.q2_answer') },
        { id: 'q3', q: t('faq.q3_question'), a: t('faq.q3_answer') },
      ],
    },
    {
      key: 'contracts',
      label: t('faq.category_contracts_ai'),
      items: [
        { id: 'q4', q: t('faq.q4_question'), a: t('faq.q4_answer') },
        { id: 'q5', q: t('faq.q5_question'), a: t('faq.q5_answer') },
      ],
    },
    {
      key: 'payments',
      label: t('faq.category_payments'),
      items: [
        { id: 'q6', q: t('faq.q6_question'), a: t('faq.q6_answer') },
        { id: 'q7', q: t('faq.q7_question'), a: t('faq.q7_answer') },
      ],
    },
    {
      key: 'data_pricing',
      label: t('faq.category_data_pricing'),
      items: [
        { id: 'q8', q: t('faq.q8_question'), a: t('faq.q8_answer') },
        { id: 'q9', q: t('faq.q9_question'), a: t('faq.q9_answer') },
        { id: 'q10', q: t('faq.q10_question'), a: t('faq.q10_answer') },
        { id: 'q11', q: t('faq.q11_question'), a: t('faq.q11_answer') },
        { id: 'q12', q: t('faq.q12_question'), a: t('faq.q12_answer') },
      ],
    },
  ];

  return (
    <div
      style={{
        fontFamily: "'DM Sans', 'Helvetica Neue', system-ui, sans-serif",
        background: '#fefcf7',
        color: '#2c2c2c',
        minHeight: '100vh',
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `.saffron-btn { background: #f0a500; color: #fff; transition: background 0.15s; }
.saffron-btn:hover { background: #d49200; }
.outline-btn { border: 2px solid #2c2c2c; color: #2c2c2c; background: transparent; transition: background 0.15s, color 0.15s; }
.outline-btn:hover { background: #2c2c2c; color: #fefcf7; }
.quote-card { background: #fff; border-radius: 16px; padding: 28px 32px; box-shadow: 0 2px 16px rgba(44,44,44,0.07); border-left: 4px solid #f0a500; }
.benefit-chip { background: rgba(240,165,0,0.1); border: 1.5px solid rgba(240,165,0,0.3); border-radius: 999px; padding: 8px 18px; font-size: 14px; font-weight: 500; color: #2c2c2c; display: inline-block; }
.check-item { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 14px; font-size: 15px; line-height: 1.55; color: rgba(44,44,44,0.75); }
.audience-panel { border-radius: 20px; padding: 40px; }`,
        }}
      />

      {/* ── Nav ── */}
      <header
        style={{
          background: '#fefcf7',
          borderBottom: '1px solid rgba(44,44,44,0.08)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: '1120px',
            margin: '0 auto',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <Link
            href="/"
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <circle cx="16" cy="16" r="16" fill="rgba(240,165,0,0.12)" />
              <path
                d="M7 17L16 9l9 8"
                stroke="#f0a500"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <rect
                x="10"
                y="17"
                width="12"
                height="9"
                rx="2"
                fill="#f0a500"
                opacity="0.2"
                stroke="#f0a500"
                strokeWidth="1.5"
              />
              <rect x="13" y="20" width="6" height="6" rx="1" fill="#f0a500" />
            </svg>
            <span
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#2c2c2c',
                letterSpacing: '-0.01em',
              }}
            >
              RentOS
            </span>
          </Link>
          <nav style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <LanguageToggle variant="inline" />
            <a
              href="#features"
              style={{
                color: '#2c2c2c',
                opacity: 0.6,
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              {t('landing.nav_features')}
            </a>
            <a
              href="#pricing"
              style={{
                color: '#2c2c2c',
                opacity: 0.6,
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              {t('landing.nav_pricing')}
            </a>
            <Link
              href="/login"
              style={{
                color: '#2c2c2c',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              {t('landing.nav_login')}
            </Link>
            <Link
              href="/signup"
              className="saffron-btn"
              style={{
                padding: '9px 22px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              {t('landing.nav_cta')}
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section style={{ padding: '80px 24px 72px', position: 'relative', overflow: 'hidden' }}>
        {/* Warm abstract shapes */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '-80px',
            right: '-80px',
            width: '420px',
            height: '420px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(240,165,0,0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: '40px',
            left: '-60px',
            width: '280px',
            height: '280px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(90,122,90,0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            maxWidth: '1120px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '64px',
            alignItems: 'center',
          }}
        >
          {/* Copy */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(240,165,0,0.12)',
                borderRadius: '999px',
                padding: '6px 16px',
                marginBottom: '28px',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#f0a500',
                  flexShrink: 0,
                  display: 'inline-block',
                }}
              />
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#2c2c2c' }}>
                {t('landing.hero_badge')}
              </span>
            </div>
            <h1
              style={{
                fontSize: 'clamp(38px, 5.5vw, 66px)',
                fontWeight: 700,
                color: '#2c2c2c',
                lineHeight: 1.08,
                letterSpacing: '-0.025em',
                margin: '0 0 24px',
              }}
            >
              {t('landing.hero_h1_line1')}
              <br />
              {t('landing.hero_h1_line2')}
              <br />
              <span style={{ color: '#f0a500' }}>{t('landing.hero_h1_line3')}</span>
            </h1>
            <p
              style={{
                fontSize: '18px',
                lineHeight: 1.7,
                color: 'rgba(44,44,44,0.6)',
                maxWidth: '480px',
                fontWeight: 400,
                margin: '0 0 36px',
              }}
            >
              {t('landing.hero_sub')}
            </p>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <Link
                href="/signup"
                className="saffron-btn"
                style={{
                  padding: '13px 30px',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                {t('landing.hero_cta_primary')}
              </Link>
              <a
                href="#features"
                className="outline-btn"
                style={{
                  padding: '13px 30px',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: 500,
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                {t('landing.hero_cta_secondary')}
              </a>
            </div>
            <p
              style={{
                marginTop: '28px',
                fontSize: '13px',
                color: 'rgba(44,44,44,0.4)',
                fontWeight: 400,
              }}
            >
              {t('landing.hero_trust_line')}
            </p>
          </div>

          {/* Hero: quote card stack */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Card 1 */}
            <div
              style={{
                background: '#fff',
                borderRadius: '16px',
                padding: '24px 28px',
                boxShadow: '0 4px 24px rgba(44,44,44,0.10)',
                marginBottom: '16px',
                borderLeft: '4px solid #f0a500',
              }}
            >
              <p
                style={{
                  fontSize: '15px',
                  lineHeight: 1.65,
                  color: '#2c2c2c',
                  margin: '0 0 14px',
                  fontStyle: 'italic',
                  fontFamily: 'Georgia, serif',
                }}
              >
                &ldquo;{t('landing.hero_quote_1_text')}&rdquo;
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'rgba(240,165,0,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                  }}
                >
                  👤
                </div>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#2c2c2c', margin: 0 }}>
                    {t('landing.hero_quote_1_author')}
                  </p>
                  <p style={{ fontSize: '12px', color: 'rgba(44,44,44,0.5)', margin: 0 }}>
                    {t('landing.hero_quote_1_role')}
                  </p>
                </div>
              </div>
            </div>
            {/* Card 2 */}
            <div
              style={{
                background: '#fff',
                borderRadius: '16px',
                padding: '24px 28px',
                boxShadow: '0 4px 24px rgba(44,44,44,0.10)',
                marginLeft: '24px',
                borderLeft: '4px solid #5a7a5a',
              }}
            >
              <p
                style={{
                  fontSize: '15px',
                  lineHeight: 1.65,
                  color: '#2c2c2c',
                  margin: '0 0 14px',
                  fontStyle: 'italic',
                  fontFamily: 'Georgia, serif',
                }}
              >
                &ldquo;{t('landing.hero_quote_2_text')}&rdquo;
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'rgba(90,122,90,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                  }}
                >
                  👤
                </div>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#2c2c2c', margin: 0 }}>
                    {t('landing.hero_quote_2_author')}
                  </p>
                  <p style={{ fontSize: '12px', color: 'rgba(44,44,44,0.5)', margin: 0 }}>
                    {t('landing.hero_quote_2_role')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Problem chips ── */}
      <section style={{ padding: '24px 24px 56px', background: '#fefcf7' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <p
            style={{
              fontSize: '13px',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#f0a500',
              marginBottom: '20px',
            }}
          >
            {t('landing.problem_label')}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
            {problemChips.map((chip, i) => (
              <span key={i} className="benefit-chip">
                {chip}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── For Landlords + For Tenants side by side ── */}
      <section style={{ padding: '72px 24px', background: 'rgba(240,165,0,0.05)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <p
              style={{
                fontSize: '13px',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#f0a500',
                marginBottom: '12px',
              }}
            >
              {t('landing.for_both_label')}
            </p>
            <h2
              style={{
                fontSize: 'clamp(28px, 3.5vw, 44px)',
                fontWeight: 700,
                color: '#2c2c2c',
                margin: '0 0 12px',
                letterSpacing: '-0.02em',
              }}
            >
              {t('landing.for_both_h2')}
            </h2>
            <p
              style={{
                fontSize: '17px',
                color: 'rgba(44,44,44,0.55)',
                fontWeight: 400,
                maxWidth: '540px',
                margin: '0 auto',
              }}
            >
              {t('landing.for_both_sub')}
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '24px',
            }}
          >
            {/* Landlords */}
            <div className="audience-panel" style={{ background: '#2c2c2c' }}>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: '#f0a500',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '22px',
                  }}
                >
                  🏠
                </div>
                <div>
                  <p
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: '#f0a500',
                      margin: 0,
                    }}
                  >
                    {t('landing.landlord_panel_title')}
                  </p>
                  <p
                    style={{
                      fontSize: '20px',
                      fontWeight: 700,
                      color: '#fefcf7',
                      margin: 0,
                      lineHeight: 1,
                    }}
                  >
                    {t('landing.landlord_panel_sub')}
                  </p>
                </div>
              </div>
              <div>
                {landlordItems.map(({ icon, text }, i) => (
                  <div key={i} className="check-item" style={{ color: 'rgba(254,252,247,0.7)' }}>
                    <span style={{ fontSize: '18px', flexShrink: 0 }}>{icon}</span>
                    <span>{text}</span>
                  </div>
                ))}
              </div>
              <div
                style={{
                  marginTop: '28px',
                  paddingTop: '24px',
                  borderTop: '1px solid rgba(254,252,247,0.1)',
                }}
              >
                <div
                  style={{
                    background: 'rgba(240,165,0,0.15)',
                    border: '1.5px solid rgba(240,165,0,0.35)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    marginBottom: '16px',
                  }}
                >
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#f0a500', margin: 0 }}>
                    {t('landing.landlord_free_badge')}
                  </p>
                </div>
                <p
                  style={{ fontSize: '13px', color: 'rgba(254,252,247,0.45)', margin: '0 0 16px' }}
                >
                  {t('landing.landlord_cta_hint')}
                </p>
                <Link
                  href="/signup"
                  className="saffron-btn"
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  {t('landing.landlord_cta')}
                </Link>
              </div>
            </div>

            {/* Tenants */}
            <div
              className="audience-panel"
              style={{ background: '#fff', border: '2px solid rgba(44,44,44,0.08)' }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: 'rgba(90,122,90,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '22px',
                  }}
                >
                  🔑
                </div>
                <div>
                  <p
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: '#5a7a5a',
                      margin: 0,
                    }}
                  >
                    {t('landing.tenant_panel_title')}
                  </p>
                  <p
                    style={{
                      fontSize: '20px',
                      fontWeight: 700,
                      color: '#2c2c2c',
                      margin: 0,
                      lineHeight: 1,
                    }}
                  >
                    {t('landing.tenant_panel_sub')}
                  </p>
                </div>
              </div>
              <div>
                {tenantItems.map(({ icon, text }, i) => (
                  <div key={i} className="check-item">
                    <span style={{ fontSize: '18px', flexShrink: 0 }}>{icon}</span>
                    <span>{text}</span>
                  </div>
                ))}
              </div>
              <div
                style={{
                  marginTop: '28px',
                  paddingTop: '24px',
                  borderTop: '1px solid rgba(44,44,44,0.07)',
                }}
              >
                <div
                  style={{
                    background: 'rgba(90,122,90,0.08)',
                    border: '1.5px solid rgba(90,122,90,0.25)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    marginBottom: '16px',
                  }}
                >
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#5a7a5a', margin: 0 }}>
                    {t('landing.tenant_free_badge')}
                  </p>
                </div>
                <Link
                  href="/signup"
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '2px solid #2c2c2c',
                    color: '#2c2c2c',
                    textDecoration: 'none',
                    fontSize: '14px',
                    fontWeight: 600,
                  }}
                >
                  {t('landing.tenant_cta')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" style={{ padding: '80px 24px', background: '#fefcf7' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <p
              style={{
                fontSize: '13px',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#f0a500',
                marginBottom: '12px',
              }}
            >
              {t('landing.features_label')}
            </p>
            <h2
              style={{
                fontSize: 'clamp(28px, 3.5vw, 42px)',
                fontWeight: 700,
                color: '#2c2c2c',
                margin: '0 0 12px',
                letterSpacing: '-0.02em',
              }}
            >
              {t('landing.features_h2')}
            </h2>
            <p
              style={{
                fontSize: '17px',
                color: 'rgba(44,44,44,0.5)',
                margin: 0,
                maxWidth: '520px',
                marginInline: 'auto',
              }}
            >
              {t('landing.features_sub')}
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px',
            }}
          >
            {features.map(({ icon, titleKey, descKey, color }) => (
              <div
                key={titleKey}
                style={{
                  background: '#fff',
                  borderRadius: '16px',
                  padding: '28px',
                  border: '1px solid rgba(44,44,44,0.07)',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: `rgba(${color === '#f0a500' ? '240,165,0' : '90,122,90'},0.12)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    marginBottom: '16px',
                  }}
                >
                  {icon}
                </div>
                <h3
                  style={{
                    fontSize: '17px',
                    fontWeight: 700,
                    color: '#2c2c2c',
                    margin: '0 0 10px',
                  }}
                >
                  {t(titleKey)}
                </h3>
                <p
                  style={{
                    fontSize: '14px',
                    lineHeight: 1.65,
                    color: 'rgba(44,44,44,0.6)',
                    margin: 0,
                  }}
                >
                  {t(descKey)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section style={{ padding: '64px 24px', background: 'rgba(240,165,0,0.04)' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <p
            style={{
              textAlign: 'center',
              fontSize: '13px',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#f0a500',
              marginBottom: '12px',
            }}
          >
            {t('landing.testimonials_label')}
          </p>
          <h2
            style={{
              textAlign: 'center',
              fontSize: 'clamp(22px, 3vw, 34px)',
              fontWeight: 700,
              color: '#2c2c2c',
              margin: '0 0 36px',
              letterSpacing: '-0.02em',
            }}
          >
            {t('landing.testimonials_h2')}
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
            }}
          >
            {[
              {
                quoteKey: 'landing.testimonial_1_quote',
                nameKey: 'landing.testimonial_1_author',
                roleKey: 'landing.testimonial_1_role',
                color: '#f0a500',
              },
              {
                quoteKey: 'landing.testimonial_2_quote',
                nameKey: 'landing.testimonial_2_author',
                roleKey: 'landing.testimonial_2_role',
                color: '#5a7a5a',
              },
              {
                quoteKey: 'landing.testimonial_3_quote',
                nameKey: 'landing.testimonial_3_author',
                roleKey: 'landing.testimonial_3_role',
                color: '#f0a500',
              },
            ].map(({ quoteKey, nameKey, roleKey, color }) => (
              <div key={quoteKey} className="quote-card" style={{ borderLeftColor: color }}>
                <p
                  style={{
                    fontSize: '15px',
                    lineHeight: 1.7,
                    color: '#2c2c2c',
                    margin: '0 0 18px',
                    fontStyle: 'italic',
                    fontFamily: 'Georgia, serif',
                  }}
                >
                  &ldquo;{t(quoteKey)}&rdquo;
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: `rgba(${color === '#f0a500' ? '240,165,0' : '90,122,90'},0.15)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '17px',
                    }}
                  >
                    👤
                  </div>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#2c2c2c', margin: 0 }}>
                      {t(nameKey)}
                    </p>
                    <p style={{ fontSize: '12px', color: 'rgba(44,44,44,0.5)', margin: 0 }}>
                      {t(roleKey)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" style={{ padding: '80px 24px', background: '#fefcf7' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <p
              style={{
                fontSize: '13px',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#f0a500',
                marginBottom: '12px',
              }}
            >
              {t('landing.pricing_label')}
            </p>
            <h2
              style={{
                fontSize: 'clamp(28px, 3.5vw, 42px)',
                fontWeight: 700,
                color: '#2c2c2c',
                margin: '0 0 12px',
                letterSpacing: '-0.02em',
              }}
            >
              {t('landing.pricing_h2')}
            </h2>
            <p style={{ fontSize: '16px', color: 'rgba(44,44,44,0.5)', margin: 0 }}>
              {t('landing.pricing_sub')}
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '20px',
            }}
          >
            {/* Landlord Free */}
            <div
              style={{
                background: '#fff',
                border: '2px solid rgba(240,165,0,0.25)',
                borderRadius: '20px',
                padding: '36px',
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  background: 'rgba(240,165,0,0.12)',
                  color: '#f0a500',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '999px',
                }}
              >
                {t('landing.plan_free_name')}
              </div>
              <h3
                style={{ fontSize: '22px', fontWeight: 700, color: '#2c2c2c', margin: '0 0 4px' }}
              >
                {t('landing.plan_free_price')}
              </h3>
              <p style={{ fontSize: '13px', color: 'rgba(44,44,44,0.5)', margin: '0 0 20px' }}>
                {t('landing.plan_free_per')}
              </p>
              <div style={{ marginBottom: '24px' }}>
                <span style={{ fontSize: '48px', fontWeight: 700, color: '#2c2c2c' }}>฿0</span>
                <span style={{ fontSize: '14px', color: 'rgba(44,44,44,0.4)', marginLeft: '6px' }}>
                  / month
                </span>
              </div>
              <Link
                href="/signup"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '2px solid #f0a500',
                  color: '#f0a500',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 600,
                  marginBottom: '24px',
                }}
              >
                {t('landing.plan_free_cta')}
              </Link>
              <ul
                style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '10px' }}
              >
                {freePlanItems.map((f, i) => (
                  <li
                    key={i}
                    style={{
                      display: 'flex',
                      gap: '10px',
                      fontSize: '14px',
                      color: 'rgba(44,44,44,0.7)',
                      alignItems: 'flex-start',
                    }}
                  >
                    <span style={{ color: '#f0a500', fontWeight: 700, flexShrink: 0 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Slot Packs */}
            <div
              style={{
                background: '#fff',
                border: '2px solid rgba(44,44,44,0.08)',
                borderRadius: '20px',
                padding: '36px',
              }}
            >
              <h3
                style={{ fontSize: '22px', fontWeight: 700, color: '#2c2c2c', margin: '0 0 4px' }}
              >
                {t('landing.plan_slots_name')}
              </h3>
              <p style={{ fontSize: '13px', color: 'rgba(44,44,44,0.5)', margin: '0 0 20px' }}>
                {t('landing.plan_slots_desc')}
              </p>
              <div style={{ marginBottom: '24px', display: 'grid', gap: '10px' }}>
                {SLOT_UNLOCK_PACKS.map((pack) => (
                  <div
                    key={pack.packIndex}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: 'rgba(240,165,0,0.06)',
                      border: '1px solid rgba(240,165,0,0.2)',
                    }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#2c2c2c' }}>
                      +{pack.slots} {pack.slots === 1 ? 'slot' : 'slots'}
                    </span>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#f0a500' }}>
                      ฿{pack.thb}
                    </span>
                  </div>
                ))}
              </div>
              <Link
                href="/signup"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '2px solid #2c2c2c',
                  color: '#2c2c2c',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 600,
                  marginBottom: '12px',
                }}
              >
                {t('landing.plan_slots_cta')}
              </Link>
              <p
                style={{
                  fontSize: '12px',
                  color: 'rgba(44,44,44,0.4)',
                  textAlign: 'center',
                  margin: 0,
                }}
              >
                {t('landing.plan_slots_note')}
              </p>
            </div>

            {/* Pro — interactive island for the toggle */}
            <div
              style={{
                background: '#2c2c2c',
                borderRadius: '20px',
                padding: '36px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: 'linear-gradient(90deg, #f0a500 0%, #ffd166 100%)',
                }}
              />
              <h3
                style={{ fontSize: '22px', fontWeight: 700, color: '#fefcf7', margin: '0 0 4px' }}
              >
                {t('landing.plan_pro_name')}
              </h3>
              <p style={{ fontSize: '13px', color: 'rgba(254,252,247,0.45)', margin: '0 0 16px' }}>
                {t('landing.plan_pro_per')}
              </p>

              {/* PricingToggle handles the monthly/yearly toggle + price display + CTA */}
              <PricingToggle
                monthlyPrice={`฿${PRO_MONTHLY_THB}`}
                yearlyPrice={t('landing.plan_pro_yearly_price')}
                monthlyLabel={`${t('landing.plan_pro_monthly_label')} · ฿${PRO_MONTHLY_THB}`}
                yearlyLabel={`${t('landing.plan_pro_yearly_label')} · ${t('landing.plan_pro_yearly_price')}`}
                saveBadge={t('landing.plan_pro_save_badge')}
                perMonth="/ month"
                perYear={t('landing.plan_pro_per_year')}
                yearlyHint={t('landing.plan_pro_yearly_per_month_hint')}
                proCtaHref="/signup"
                proCtaLabel={t('landing.plan_pro_cta')}
              />

              <ul
                style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '10px' }}
              >
                {proPlanItems.map((f, i) => (
                  <li
                    key={i}
                    style={{
                      display: 'flex',
                      gap: '10px',
                      fontSize: '14px',
                      color: 'rgba(254,252,247,0.65)',
                      alignItems: 'flex-start',
                    }}
                  >
                    <span style={{ color: '#f0a500', fontWeight: 700, flexShrink: 0 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p
            style={{
              textAlign: 'center',
              marginTop: '24px',
              fontSize: '13px',
              color: 'rgba(44,44,44,0.4)',
            }}
          >
            {t('landing.pricing_note')}
          </p>
        </div>
      </section>

      {/* ── FAQ — interactive island ── */}
      <FAQAccordion
        title={t('faq.title')}
        subtitle={t('faq.subtitle')}
        categories={faqCategories}
      />

      {/* ── CTA Band ── */}
      <section style={{ background: '#f0a500', padding: '80px 24px', textAlign: 'center' }}>
        <h2
          style={{
            fontSize: 'clamp(28px, 4vw, 48px)',
            fontWeight: 700,
            color: '#fff',
            margin: '0 0 16px',
            letterSpacing: '-0.02em',
          }}
        >
          {t('landing.cta_band_h2')}
        </h2>
        <p
          style={{
            fontSize: '17px',
            color: 'rgba(255,255,255,0.8)',
            margin: '0 auto 36px',
            maxWidth: '500px',
          }}
        >
          {t('landing.cta_band_sub')}
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/signup"
            style={{
              display: 'inline-block',
              background: '#fff',
              color: '#f0a500',
              padding: '14px 36px',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            {t('landing.cta_band_btn')}
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        style={{
          borderTop: '1px solid rgba(44,44,44,0.08)',
          background: '#fefcf7',
          padding: '40px 24px',
        }}
      >
        <div
          style={{
            maxWidth: '1120px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          {/* Disclaimer */}
          <p
            style={{
              fontSize: '11px',
              color: 'rgba(44,44,44,0.5)',
              lineHeight: '1.7',
              maxWidth: '896px',
              margin: '0 auto',
              textAlign: 'center',
            }}
          >
            {t('disclaimer.footer_text')}{' '}
            <Link
              href="/legal#privacy"
              style={{ color: 'rgba(44,44,44,0.6)', textDecoration: 'underline' }}
            >
              {t('disclaimer.privacy_link')}
            </Link>{' '}
            <Link
              href="/legal#terms"
              style={{ color: 'rgba(44,44,44,0.6)', textDecoration: 'underline' }}
            >
              {t('disclaimer.terms_link')}
            </Link>
          </p>
          {/* Footer nav row */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <span style={{ fontSize: '13px', color: 'rgba(44,44,44,0.45)' }}>
              {t('landing.footer_tagline')}
            </span>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <a
                href="#faq"
                style={{ fontSize: '13px', color: 'rgba(44,44,44,0.45)', textDecoration: 'none' }}
              >
                {t('footer.faq_link')}
              </a>
              <Link
                href="/login"
                style={{ fontSize: '13px', color: 'rgba(44,44,44,0.45)', textDecoration: 'none' }}
              >
                {t('landing.nav_login')}
              </Link>
              <Link
                href="/signup"
                style={{ fontSize: '13px', color: 'rgba(44,44,44,0.45)', textDecoration: 'none' }}
              >
                {t('landing.nav_cta')}
              </Link>
              <a
                href="mailto:hello@rentos.homes"
                style={{ fontSize: '13px', color: 'rgba(44,44,44,0.45)', textDecoration: 'none' }}
              >
                hello@rentos.homes
              </a>
            </div>
            <span style={{ fontSize: '13px', color: 'rgba(44,44,44,0.35)' }}>
              {t('landing.footer_copy')}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
