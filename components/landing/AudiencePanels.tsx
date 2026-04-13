import Link from 'next/link';
import {
  FileText,
  CreditCard,
  Globe,
  Users,
  Building2,
  CalendarDays,
  Shield,
  ArrowRight,
} from 'lucide-react';
import { AnimatedSection } from './AnimatedSection';
import { NeonButton } from '@/components/ui/neon-button';

const LANDLORD_ICONS = [FileText, CreditCard, Globe, Users];
const TENANT_ICONS = [FileText, CalendarDays, Globe, Shield];

interface AudiencePanelsProps {
  t: (key: string) => string;
  landlordItems: { icon: string; text: string }[];
  tenantItems: { icon: string; text: string }[];
}

export function AudiencePanels({ t, landlordItems, tenantItems }: AudiencePanelsProps) {
  return (
    <section className="py-24 px-6 bg-saffron-500/[0.04] dark:bg-charcoal-800/50">
      <div className="max-w-[1100px] mx-auto">
        {/* Section header */}
        <AnimatedSection className="text-center mb-14">
          <p className="text-xs font-semibold tracking-[0.1em] uppercase text-saffron-500 mb-3 font-[var(--font-manrope)]">
            {t('landing.for_both_label')}
          </p>
          <h2 className="font-[var(--font-manrope)] text-3xl md:text-4xl font-bold text-charcoal-800 dark:text-white mb-3 tracking-[-0.02em]">
            {t('landing.for_both_h2')}
          </h2>
          <p className="text-charcoal-600 dark:text-white/60 text-lg max-w-[540px] mx-auto">
            {t('landing.for_both_sub')}
          </p>
        </AnimatedSection>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Landlords panel — dark */}
          <AnimatedSection className="backdrop-blur-[14px] bg-gradient-to-br from-charcoal-800/95 to-charcoal-700/80 dark:from-charcoal-700/60 dark:to-charcoal-800/80 border border-white/[0.08] rounded-2xl shadow-lg dark:shadow-black/30 p-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-xl bg-saffron-500 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold tracking-[0.1em] uppercase text-saffron-500 font-[var(--font-manrope)]">
                  {t('landing.landlord_panel_title')}
                </p>
                <p className="text-xl font-bold text-warm-50 leading-tight font-[var(--font-manrope)]">
                  {t('landing.landlord_panel_sub')}
                </p>
              </div>
            </div>

            <div className="space-y-3.5 mb-7">
              {landlordItems.map(({ text }, i) => {
                const Icon = LANDLORD_ICONS[i] || FileText;
                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 text-warm-50/70 text-sm leading-relaxed"
                  >
                    <Icon className="w-4 h-4 mt-0.5 text-saffron-500 shrink-0" />
                    <span>{text}</span>
                  </div>
                );
              })}
            </div>

            <div className="pt-6 border-t border-warm-50/10 space-y-4">
              <div className="bg-saffron-500/15 border border-saffron-500/30 rounded-xl px-4 py-3">
                <p className="text-sm font-semibold text-saffron-500">
                  {t('landing.landlord_free_badge')}
                </p>
              </div>
              <p className="text-xs text-warm-50/40">{t('landing.landlord_cta_hint')}</p>
              <Link href="/signup" legacyBehavior passHref>
                <NeonButton variant="default" size="full">
                  {t('landing.landlord_cta')}
                  <ArrowRight className="w-3.5 h-3.5" />
                </NeonButton>
              </Link>
            </div>
          </AnimatedSection>

          {/* Tenants panel — light */}
          <AnimatedSection
            delay={0.1}
            className="backdrop-blur-[14px] bg-gradient-to-br from-charcoal-800/[0.03] to-white/70 dark:from-white/[0.06] dark:to-white/[0.04] border border-charcoal-800/10 dark:border-white/10 rounded-2xl shadow-md dark:shadow-black/20 p-10"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-xl bg-sage-500/15 flex items-center justify-center">
                <Shield className="w-5 h-5 text-sage-500" />
              </div>
              <div>
                <p className="text-xs font-semibold tracking-[0.1em] uppercase text-sage-500 font-[var(--font-manrope)]">
                  {t('landing.tenant_panel_title')}
                </p>
                <p className="text-xl font-bold text-charcoal-800 dark:text-white leading-tight font-[var(--font-manrope)]">
                  {t('landing.tenant_panel_sub')}
                </p>
              </div>
            </div>

            <div className="space-y-3.5 mb-7">
              {tenantItems.map(({ text }, i) => {
                const Icon = TENANT_ICONS[i] || FileText;
                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 text-charcoal-600 dark:text-white/70 text-sm leading-relaxed"
                  >
                    <Icon className="w-4 h-4 mt-0.5 text-sage-500 shrink-0" />
                    <span>{text}</span>
                  </div>
                );
              })}
            </div>

            <div className="pt-6 border-t border-charcoal-800/[0.06] dark:border-white/10 space-y-4">
              <div className="bg-sage-500/[0.08] border border-sage-500/20 rounded-xl px-4 py-3">
                <p className="text-sm font-semibold text-sage-500">
                  {t('landing.tenant_free_badge')}
                </p>
              </div>
              <Link href="/signup" legacyBehavior passHref>
                <NeonButton variant="outline" size="full" neon={false}>
                  {t('landing.tenant_cta')}
                  <ArrowRight className="w-3.5 h-3.5" />
                </NeonButton>
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
