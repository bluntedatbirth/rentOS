'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';

export default function LoginPage() {
  const router = useRouter();
  const { user, profile, signInWithOtp, signInWithPassword } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'password' | 'magic_link'>('password');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect after successful sign-in
  useEffect(() => {
    if (user && profile) {
      const dest = profile.role === 'landlord' ? '/landlord/dashboard' : '/tenant/dashboard';
      router.push(dest);
    }
  }, [user, profile, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (mode === 'magic_link') {
      const { error: authError } = await signInWithOtp(email);
      if (authError) {
        setError(authError.message);
      } else {
        setSent(true);
      }
    } else {
      const { error: authError } = await signInWithPassword(email, password);
      if (authError) {
        setError(authError.message);
      }
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
            aria-label={locale === 'th' ? t('auth.switch_to_en') : t('auth.switch_to_th')}
            className="min-h-[44px] min-w-[44px] rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            {locale === 'th' ? t('auth.switch_to_en') : t('auth.switch_to_th')}
          </button>
        </div>

        {/* Beta disclaimer */}
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-800">{t('auth.beta_title')}</p>
          <p className="mt-0.5 text-xs text-amber-700">{t('auth.beta_description')}</p>
        </div>

        {sent ? (
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-lg font-semibold text-gray-900">{t('auth.check_email')}</h2>
            <p className="text-sm text-gray-600">{t('auth.check_email_description')}</p>
          </div>
        ) : (
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-lg font-semibold text-gray-900">{t('auth.welcome_back')}</h2>
            <p className="mb-6 text-sm text-gray-500">
              {mode === 'password'
                ? t('auth.welcome_back_password')
                : t('auth.welcome_back_description')}
            </p>

            <form onSubmit={handleSubmit}>
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
                className="mb-4 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />

              {mode === 'password' && (
                <>
                  <label
                    htmlFor="password"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    {t('auth.password')}
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('auth.password_placeholder')}
                    className="mb-4 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </>
              )}

              {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="min-h-[44px] w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {loading
                  ? t('auth.signing_in')
                  : mode === 'password'
                    ? t('auth.sign_in')
                    : t('auth.send_magic_link')}
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                setMode(mode === 'password' ? 'magic_link' : 'password');
                setError('');
              }}
              className="mt-3 w-full text-center text-sm text-blue-600 hover:text-blue-500"
            >
              {mode === 'password' ? t('auth.use_magic_link') : t('auth.use_password')}
            </button>

            <p className="mt-4 text-center text-sm text-gray-500">
              {t('auth.no_account')}{' '}
              <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-500">
                {t('app.signup')}
              </Link>
            </p>

            {/* Dev login — remove before production */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    setLoading(true);
                    const { error: err } = await signInWithPassword(
                      'landlord@rentos.dev',
                      'test123456'
                    );
                    if (err) setError(err.message);
                    setLoading(false);
                  }}
                  className="min-h-[44px] flex-1 rounded-lg border-2 border-dashed border-gray-300 px-3 py-2.5 text-sm font-medium text-gray-500 hover:border-blue-400 hover:text-blue-600"
                >
                  Dev: Landlord
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setLoading(true);
                    const { error: err } = await signInWithPassword(
                      'tenant@rentos.dev',
                      'test123456'
                    );
                    if (err) setError(err.message);
                    setLoading(false);
                  }}
                  className="min-h-[44px] flex-1 rounded-lg border-2 border-dashed border-gray-300 px-3 py-2.5 text-sm font-medium text-gray-500 hover:border-green-400 hover:text-green-600"
                >
                  Dev: Tenant
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
