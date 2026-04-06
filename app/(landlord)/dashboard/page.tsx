'use client';

import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';

export default function LandlordDashboard() {
  const { profile } = useAuth();
  const { t } = useI18n();

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900">{t('dashboard.landlord_title')}</h2>
      <p className="mt-2 text-gray-600">
        {t('dashboard.welcome')}, {profile?.full_name ?? ''}
      </p>
    </div>
  );
}
