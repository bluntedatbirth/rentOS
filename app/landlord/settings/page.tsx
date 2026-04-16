'use client';

import { useI18n } from '@/lib/i18n/context';
import { useAuth } from '@/lib/supabase/useAuth';
import ProfileForm from '@/components/profile/ProfileForm';
import SecuritySettings from '@/components/security/SecuritySettings';

export default function LandlordSettingsPage() {
  const { t } = useI18n();
  const { signOut } = useAuth();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold text-charcoal-900 dark:text-white">
        {t('settings.title')}
      </h1>

      {/* Section 1: Profile */}
      <section className="rounded-2xl border border-warm-200 dark:border-white/10 bg-white dark:bg-charcoal-800 p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-charcoal-900 dark:text-white">
          {t('settings.section_profile')}
        </h2>
        <ProfileForm />
      </section>

      {/* Section 2: Security */}
      <section className="rounded-2xl border border-warm-200 dark:border-white/10 bg-white dark:bg-charcoal-800 p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-charcoal-900 dark:text-white">
          {t('settings.section_security')}
        </h2>
        <SecuritySettings />
      </section>

      {/* Log out — always visible; header button is hidden on mobile */}
      <section className="rounded-2xl border border-warm-200 dark:border-white/10 bg-white dark:bg-charcoal-800 p-6 shadow-sm">
        <button
          type="button"
          onClick={signOut}
          className="min-h-[44px] w-full rounded-lg border border-warm-300 dark:border-white/15 px-4 py-2 text-sm font-medium text-charcoal-700 dark:text-white/70 hover:bg-warm-100 dark:hover:bg-white/10 sm:w-auto"
        >
          {t('nav.logout')}
        </button>
      </section>
    </div>
  );
}
