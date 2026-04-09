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
      <h1 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h1>

      {/* Section 1: Profile */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          {t('settings.profile_section')}
        </h2>
        <ProfileForm />
      </section>

      {/* Section 2: Notification Preferences */}
      <section className="rounded-lg bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          {t('settings.notifications_section')}
        </h2>
        <p className="mt-1 text-sm text-gray-500">{t('settings.notifications_description')}</p>
        <Link
          href="/landlord/notifications"
          className="mt-3 inline-flex min-h-[44px] items-center rounded-lg border border-blue-300 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
        >
          {t('settings.go_to_notifications')}
        </Link>
      </section>

      {/* Section 3: Tier Display */}
      <section className="rounded-lg bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">{t('settings.tier_section')}</h2>
        <div className="mt-3 flex items-center gap-3">
          <span className="text-sm text-gray-600">{t('settings.current_tier')}:</span>
          {tier === 'pro' ? (
            <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
              {t('settings.tier_pro')}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600">
              {t('settings.tier_free')}
            </span>
          )}
        </div>
        <div className="mt-3">
          {tier === 'pro' ? (
            <p className="text-sm font-medium text-blue-600">{t('settings.pro_active')}</p>
          ) : (
            <button
              type="button"
              disabled
              title={t('settings.upgrade_coming_soon')}
              className="min-h-[44px] rounded-lg bg-gray-300 px-4 py-2 text-sm font-medium text-gray-500 cursor-not-allowed"
            >
              {t('settings.upgrade')}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
