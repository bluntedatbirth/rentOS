'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { SocialLoginButtons } from '@/components/auth/SocialLoginButtons';
import { ForgotPasswordLink } from './components/ForgotPasswordLink';

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, signInWithOtp, signInWithPassword } = useAuth();
  const { t } = useI18n();
  const urlError = searchParams.get('error');
  const urlMsg = searchParams.get('msg');
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
    <div className="flex min-h-screen items-center justify-center bg-warm-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="text-2xl font-bold text-charcoal-900 hover:text-saffron-600 transition-colors"
          >
            {t('app.title')}
          </Link>
          <LanguageToggle variant="inline" />
        </div>
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-charcoal-500 hover:text-saffron-600 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="h-3.5 w-3.5"
            >
              <path
                fillRule="evenodd"
                d="M9.78 4.22a.75.75 0 010 1.06L7.06 8l2.72 2.72a.75.75 0 11-1.06 1.06L5.22 8.53a.75.75 0 010-1.06l3.5-3.5a.75.75 0 011.06 0z"
                clipRule="evenodd"
              />
            </svg>
            Back to home
          </Link>
        </div>

        {/* Beta disclaimer */}
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-800">{t('auth.beta_title')}</p>
          <p className="mt-0.5 text-xs text-amber-700">{t('auth.beta_description')}</p>
        </div>

        {/* URL-driven banners */}
        {urlError === 'oauth_failed' && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
            <p className="text-sm text-amber-800">
              Google sign-in didn&apos;t complete. Please try again or sign up with email.
            </p>
          </div>
        )}
        {urlError === 'missing_code' && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
            <p className="text-sm text-amber-800">Authentication link expired or invalid.</p>
          </div>
        )}
        {urlMsg === 'password_reset_success' && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
            <p className="text-sm text-green-800">
              Password updated. Sign in with your new password.
            </p>
          </div>
        )}

        {sent ? (
          <div className="rounded-lg border border-warm-200 bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-lg font-semibold text-charcoal-900">
              {t('auth.check_email')}
            </h2>
            <p className="text-sm text-charcoal-700">{t('auth.check_email_description')}</p>
          </div>
        ) : (
          <div className="rounded-lg border border-warm-200 bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-lg font-semibold text-charcoal-900">
              {t('auth.welcome_back')}
            </h2>
            <p className="mb-6 text-sm text-charcoal-500">
              {mode === 'password'
                ? t('auth.welcome_back_password')
                : t('auth.welcome_back_description')}
            </p>

            <form onSubmit={handleSubmit}>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-charcoal-700">
                {t('auth.email')}
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.email_placeholder')}
                className="mb-4 block w-full rounded-lg border border-warm-200 bg-warm-50 px-3 py-2.5 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
              />

              {mode === 'password' && (
                <>
                  <label
                    htmlFor="password"
                    className="mb-1 block text-sm font-medium text-charcoal-700"
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
                    className="mb-1 block w-full rounded-lg border border-warm-200 bg-warm-50 px-3 py-2.5 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
                  />
                  <div className="mb-3">
                    <ForgotPasswordLink />
                  </div>
                </>
              )}

              {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="min-h-[44px] w-full rounded-lg bg-saffron-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-saffron-600 focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:ring-offset-2 disabled:opacity-50"
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
              className="mt-3 w-full text-center text-sm text-saffron-600 hover:text-saffron-700"
            >
              {mode === 'password' ? t('auth.use_magic_link') : t('auth.use_password')}
            </button>

            <SocialLoginButtons mode="login" disabled={loading} />

            <p className="mt-4 text-center text-sm text-charcoal-500">
              {t('auth.no_account')}{' '}
              <Link href="/signup" className="font-medium text-saffron-600 hover:text-saffron-700">
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
                  className="min-h-[44px] flex-1 rounded-lg border border-warm-200 bg-warm-100 px-3 py-2.5 text-sm font-medium text-charcoal-600 hover:border-saffron-400 hover:text-saffron-600"
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
                  className="min-h-[44px] flex-1 rounded-lg border border-warm-200 bg-warm-100 px-3 py-2.5 text-sm font-medium text-charcoal-600 hover:border-saffron-400 hover:text-saffron-600"
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

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}
