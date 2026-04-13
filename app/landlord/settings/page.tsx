'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n/context';
import ProfileForm from '@/components/profile/ProfileForm';
import SecuritySettings from '@/components/security/SecuritySettings';

export default function LandlordSettingsPage() {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold text-charcoal-900">{t('settings.title')}</h1>

      {/* Section 1: Profile */}
      <section className="rounded-2xl border border-warm-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-charcoal-900">
          {t('settings.section_profile')}
        </h2>
        <ProfileForm />
      </section>

      {/* Section 2: Documents — link card fallback (DocumentsClient requires server-fetched props) */}
      <section className="rounded-2xl border border-warm-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-charcoal-900">
          {t('settings.section_documents')}
        </h2>
        <p className="mb-4 text-sm text-charcoal-500">{t('documents.title')}</p>
        <Link
          href="/landlord/documents"
          className="inline-flex min-h-[44px] items-center rounded-lg border border-saffron-300 px-4 py-2 text-sm font-medium text-saffron-600 hover:bg-saffron-50"
        >
          {t('settings.manage_documents')} →
        </Link>
      </section>

      {/* Section 3: Security */}
      <section className="rounded-2xl border border-warm-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-charcoal-900">
          {t('settings.section_security')}
        </h2>
        <SecuritySettings />
      </section>
    </div>
  );
}
