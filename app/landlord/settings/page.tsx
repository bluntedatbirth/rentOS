'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';
import ProfileForm from '@/components/profile/ProfileForm';

export default function LandlordSettingsPage() {
  const { profile } = useAuth();
  const { t } = useI18n();

  const tier = profile?.tier ?? 'free';

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold text-charcoal-900">{t('settings.title')}</h1>

      {/* Section 1: Profile */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-charcoal-900">
          {t('settings.profile_section')}
        </h2>
        <ProfileForm />
      </section>

      {/* Section 2: Notification Preferences */}
      <section className="rounded-lg bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-charcoal-900">
          {t('settings.notifications_section')}
        </h2>
        <p className="mt-1 text-sm text-charcoal-500">{t('settings.notifications_description')}</p>
        <Link
          href="/landlord/notifications"
          className="mt-3 inline-flex min-h-[44px] items-center rounded-lg border border-saffron-300 px-4 py-2 text-sm font-medium text-saffron-600 hover:bg-saffron-50"
        >
          {t('settings.go_to_notifications')}
        </Link>
      </section>

      {/* Section 3: Tier Display */}
      <section className="rounded-lg bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-charcoal-900">{t('settings.tier_section')}</h2>
        <div className="mt-3 flex items-center gap-3">
          <span className="text-sm text-charcoal-600">{t('settings.current_tier')}:</span>
          {tier === 'pro' ? (
            <span className="inline-flex items-center rounded-full bg-sage-100 px-3 py-1 text-sm font-medium text-sage-700">
              {t('settings.tier_pro')}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-warm-200 px-3 py-1 text-sm font-medium text-charcoal-600">
              {t('settings.tier_free')}
            </span>
          )}
        </div>
      </section>

      {/* Section 4: About RentOS */}
      <section className="rounded-lg border border-warm-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-charcoal-900">{t('settings.about_title')}</h2>
        <p className="mt-3 text-sm leading-relaxed text-charcoal-700">
          {t('settings.about_disclaimer')}
        </p>
        <div className="mt-4 flex flex-wrap gap-4">
          <Link
            href="/legal#privacy"
            className="text-sm text-saffron-600 underline hover:text-saffron-700"
          >
            {t('settings.about_privacy_link')}
          </Link>
          <Link
            href="/legal#terms"
            className="text-sm text-saffron-600 underline hover:text-saffron-700"
          >
            {t('settings.about_terms_link')}
          </Link>
          <Link href="/#faq" className="text-sm text-saffron-600 underline hover:text-saffron-700">
            {t('settings.about_faq_link')}
          </Link>
        </div>
      </section>
    </div>
  );
}
