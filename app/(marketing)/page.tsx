import { getServerLocale, getServerT } from '@/lib/i18n/server';
import { LandingNav } from '@/components/landing/LandingNav';
import { LandingHero } from '@/components/landing/LandingHero';
import { ProblemChips } from '@/components/landing/ProblemChips';
import { AudiencePanels } from '@/components/landing/AudiencePanels';
import { HeroScrollDemo } from '@/components/landing/HeroScrollDemo';
import { FeaturesGrid } from '@/components/landing/FeaturesGrid';
import { PricingCards } from '@/components/landing/PricingCards';
import { FAQAccordion } from '@/components/landing/FAQAccordion';
import type { FAQCategory } from '@/components/landing/FAQAccordion';
import { CTABand } from '@/components/landing/CTABand';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { AuroraBackground } from '@/components/ui/aurora-background';
import { BackgroundPaths } from '@/components/ui/background-paths';

// ─── Landing Page — "People First" (Variant A: Minimal/Editorial)
// Design: Stitch "Editorial Humanism" system
// Palette: warm white #fefcf7, charcoal #2c2c2c, saffron #f0a500, sage #5a7a5a
// Typography: Manrope (headlines) + Plus Jakarta Sans (body)
// All inline styles replaced with Tailwind tokens; Framer Motion animations via AnimatedSection

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
  ];

  const landlordItems = [
    { icon: '📄', text: t('landing.landlord_item_1') },
    { icon: '💳', text: t('landing.landlord_item_2') },
    { icon: '🌐', text: t('landing.landlord_item_3') },
    { icon: '👥', text: t('landing.landlord_item_4') },
  ];

  const tenantItems = [
    { icon: '📋', text: t('landing.tenant_item_1') },
    { icon: '📅', text: t('landing.tenant_item_2') },
    { icon: '🌐', text: t('landing.tenant_item_3') },
    { icon: '🛡️', text: t('landing.tenant_item_4') },
  ];

  const features = [
    {
      icon: '📤',
      titleKey: 'landing.feature_1_title',
      descKey: 'landing.feature_1_desc',
      color: '#f0a500',
    },
    {
      icon: '📄',
      titleKey: 'landing.feature_2_title',
      descKey: 'landing.feature_2_desc',
      color: '#5a7a5a',
    },
    {
      icon: '💳',
      titleKey: 'landing.feature_3_title',
      descKey: 'landing.feature_3_desc',
      color: '#f0a500',
    },
    {
      icon: '🌐',
      titleKey: 'landing.feature_4_title',
      descKey: 'landing.feature_4_desc',
      color: '#5a7a5a',
    },
  ];

  const freePlanItems = t('landing.plan_free_items').split('|');

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
      key: 'data',
      label: t('faq.category_data'),
      items: [
        { id: 'q6', q: t('faq.q6_question'), a: t('faq.q6_answer') },
        { id: 'q7', q: t('faq.q7_question'), a: t('faq.q7_answer') },
        { id: 'q8', q: t('faq.q8_question'), a: t('faq.q8_answer') },
      ],
    },
  ];

  return (
    <div className="font-[var(--font-plus-jakarta)] bg-warm-50 dark:bg-charcoal-900 text-charcoal-800 dark:text-warm-100 min-h-screen">
      <AuroraBackground className="!h-auto !bg-warm-50 dark:!bg-charcoal-900">
        <div className="w-full">
          <LandingNav />
          <LandingHero t={t} />
        </div>
      </AuroraBackground>
      <ProblemChips t={t} chips={problemChips} />
      <HeroScrollDemo
        labels={{
          headline: t('landing.scroll_headline'),
          subheadline: t('landing.scroll_subheadline'),
          badge: t('landing.scroll_badge'),
        }}
      />
      <AudiencePanels t={t} landlordItems={landlordItems} tenantItems={tenantItems} />
      <BackgroundPaths overlay>
        <FeaturesGrid t={t} features={features} />
        <PricingCards t={t} freePlanItems={freePlanItems} />
        <FAQAccordion
          title={t('faq.title')}
          subtitle={t('faq.subtitle')}
          categories={faqCategories}
        />
        <CTABand t={t} />
      </BackgroundPaths>
      <LandingFooter t={t} />
    </div>
  );
}
