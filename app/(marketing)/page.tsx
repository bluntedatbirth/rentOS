import { getServerLocale, getServerT } from '@/lib/i18n/server';
import { LandingNav } from '@/components/landing/LandingNav';
import { LandingHero } from '@/components/landing/LandingHero';
import { FeaturesGrid } from '@/components/landing/FeaturesGrid';
import { BuiltForThailand } from '@/components/landing/BuiltForThailand';
import { StepStrip } from '@/components/landing/StepStrip';
import { FAQAccordion } from '@/components/landing/FAQAccordion';
import type { FAQItem } from '@/components/landing/FAQAccordion';
import { CTABand } from '@/components/landing/CTABand';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { AuroraBackground } from '@/components/ui/aurora-background';
import { HeroScrollDemo } from '@/components/landing/HeroScrollDemo';

// ─── Landing Page — Variant C "Numbers Hero"
// Design: Action-oriented, left-aligned hero with stat strip, dark features section,
// "Built for Thailand" trust panel, step strip, FAQ, CTA band.
// Palette: warm white / charcoal / saffron / sage (People First design language)
// Typography: Manrope (headlines) + Plus Jakarta Sans (body)

export default function LandingPage() {
  const locale = getServerLocale();
  const t = getServerT(locale);

  const features = [
    {
      highlightKey: 'landing.feature_1_highlight',
      titleKey: 'landing.feature_1_title',
      descKey: 'landing.feature_1_desc',
      icon: 'upload' as const,
      iconColor: 'saffron' as const,
    },
    {
      highlightKey: 'landing.feature_2_highlight',
      titleKey: 'landing.feature_2_title',
      descKey: 'landing.feature_2_desc',
      icon: 'calendar' as const,
      iconColor: 'sage' as const,
    },
    {
      highlightKey: 'landing.feature_3_highlight',
      titleKey: 'landing.feature_3_title',
      descKey: 'landing.feature_3_desc',
      icon: 'globe' as const,
      iconColor: 'saffron' as const,
    },
  ];

  const faqItems: FAQItem[] = [
    { id: 'q1', q: t('faq.q1_question'), a: t('faq.q1_answer') },
    { id: 'q2', q: t('faq.q2_question'), a: t('faq.q2_answer') },
    { id: 'q3', q: t('faq.q3_question'), a: t('faq.q3_answer') },
    { id: 'q4', q: t('faq.q4_question'), a: t('faq.q4_answer') },
    { id: 'q5', q: t('faq.q5_question'), a: t('faq.q5_answer') },
    { id: 'q6', q: t('faq.q6_question'), a: t('faq.q6_answer') },
  ];

  return (
    <div className="font-[var(--font-plus-jakarta)] bg-warm-50 dark:bg-charcoal-900 text-charcoal-800 dark:text-warm-100 min-h-screen">
      <AuroraBackground className="!h-auto !bg-warm-50 dark:!bg-charcoal-900">
        <div className="w-full">
          <LandingNav />
          <LandingHero t={t} />
        </div>
      </AuroraBackground>
      <HeroScrollDemo
        labels={{
          headline: t('landing.scroll_headline'),
          subheadline: t('landing.scroll_subheadline'),
          badge: t('landing.scroll_badge'),
        }}
      />
      <FeaturesGrid t={t} features={features} />
      <BuiltForThailand t={t} />
      <StepStrip t={t} />
      <FAQAccordion title={t('faq.title')} subtitle={t('faq.subtitle_c')} items={faqItems} />
      <CTABand t={t} />
      <LandingFooter t={t} />
    </div>
  );
}
