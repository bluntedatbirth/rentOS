'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';

export default function ProfileForm() {
  const { profile, loading } = useAuth();
  const { t, locale, setLocale } = useI18n();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [language, setLanguage] = useState<'th' | 'en'>('th');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setLanguage((profile.language as 'th' | 'en') || 'th');
    }
  }, [profile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          phone,
          language,
        }),
      });

      if (res.ok) {
        setSaved(true);
        // Also update the i18n locale to match the saved preference
        if (language !== locale) {
          setLocale(language);
        }
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      // Silently fail for now
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('profile.title')}</h1>

      <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
        {/* Full Name */}
        <div>
          <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
            {t('profile.full_name')}
          </label>
          <input
            id="full_name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="min-h-[44px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            {t('profile.phone')}
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="min-h-[44px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Language Preference */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('profile.language')}
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setLanguage('th')}
              aria-pressed={language === 'th'}
              className={`min-h-[44px] flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                language === 'th'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t('auth.switch_to_th')}
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              aria-pressed={language === 'en'}
              className={`min-h-[44px] flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                language === 'en'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t('auth.switch_to_en')}
            </button>
          </div>
        </div>

        {/* Account Type (read-only) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('profile.account_type')}
          </label>
          <div className="min-h-[44px] flex items-center rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
            {profile?.role === 'landlord' ? t('auth.role_landlord') : t('auth.role_tenant')}
          </div>
        </div>

        {/* Save Button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="min-h-[44px] w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? t('profile.saving') : t('common.save')}
        </button>

        {/* Success message */}
        {saved && (
          <p className="text-center text-sm font-medium text-green-600">{t('profile.saved')}</p>
        )}
      </div>
    </div>
  );
}
