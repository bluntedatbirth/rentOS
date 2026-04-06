'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';

export default function SignupPage() {
  const { signUp } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'landlord' | 'tenant'>('landlord');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: authError } = await signUp(email, {
      role,
      full_name: fullName,
      phone,
    });

    if (authError) {
      setError(authError.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{t('app.title')}</h1>
          <button
            type="button"
            onClick={() => setLocale(locale === 'th' ? 'en' : 'th')}
            className="min-h-[44px] min-w-[44px] rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            {locale === 'th' ? t('auth.switch_to_en') : t('auth.switch_to_th')}
          </button>
        </div>

        {sent ? (
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-lg font-semibold text-gray-900">{t('auth.check_email')}</h2>
            <p className="text-sm text-gray-600">{t('auth.check_email_description')}</p>
          </div>
        ) : (
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-lg font-semibold text-gray-900">{t('auth.get_started')}</h2>
            <p className="mb-6 text-sm text-gray-500">{t('auth.get_started_description')}</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="role" className="mb-1 block text-sm font-medium text-gray-700">
                  {t('auth.role')}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('landlord')}
                    className={`min-h-[44px] rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                      role === 'landlord'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {t('auth.role_landlord')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('tenant')}
                    className={`min-h-[44px] rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                      role === 'tenant'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {t('auth.role_tenant')}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-gray-700">
                  {t('auth.full_name')}
                </label>
                <input
                  id="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t('auth.full_name_placeholder')}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="phone" className="mb-1 block text-sm font-medium text-gray-700">
                  {t('auth.phone')}
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t('auth.phone_placeholder')}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
                  {t('auth.email')}
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth.email_placeholder')}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="min-h-[44px] w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {loading ? t('auth.signing_in') : t('auth.create_account')}
              </button>
            </form>

            <p className="mt-4 text-center text-sm text-gray-500">
              {t('auth.have_account')}{' '}
              <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                {t('app.login')}
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
