'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { SocialLoginButtons } from '@/components/auth/SocialLoginButtons';
import { formatPhone, stripPhone } from '@/lib/format/phone';
import { createClient } from '@/lib/supabase/client';

function SignupPageInner() {
  const { signUp } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Pair code from QR scan: when present, signup is locked to tenant role
  // and triggers auto-pair on success.
  const pairCode = (searchParams.get('pair') || '').toUpperCase();
  const isPairFlow = pairCode.length === 6;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'landlord' | 'tenant'>(isPairFlow ? 'tenant' : 'landlord');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [consented, setConsented] = useState(false);

  // If user is already authenticated and arrives with a pair code, skip signup entirely
  useEffect(() => {
    if (!isPairFlow) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled && data.session) {
        router.replace(`/tenant/pair?code=${pairCode}`);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPairFlow, pairCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!consented) {
      setError(t('auth.consent_required_error'));
      return;
    }

    if (password && password.length < 8) {
      setError(t('auth.password_min_length'));
      return;
    }

    setLoading(true);

    const { error: authError } = await signUp(
      email,
      {
        role,
        full_name: fullName,
        phone: stripPhone(phone),
        // Stash the pair code in user metadata so the auth callback can
        // redirect the new tenant straight into /tenant/pair after email confirm.
        ...(isPairFlow ? { pair_code: pairCode } : {}),
      },
      password || undefined
    );

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // If email confirmation is disabled in Supabase, the user already has a
    // session after signUp — redeem the code immediately to skip the round-trip.
    if (isPairFlow) {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        router.replace(`/tenant/pair?code=${pairCode}`);
        return;
      }
    }

    setSent(true);
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-warm-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-charcoal-900">{t('app.title')}</h1>
          <LanguageToggle variant="inline" />
        </div>

        {/* Pair-flow banner: shown when tenant arrives from a landlord's QR code */}
        {isPairFlow && (
          <div className="mb-4 rounded-lg border border-saffron-200 bg-saffron-50 px-4 py-3">
            <p className="text-sm font-semibold text-charcoal-900">{t('auth.pair_banner_title')}</p>
            <p className="mt-0.5 text-xs text-charcoal-700">{t('auth.pair_banner_description')}</p>
          </div>
        )}

        {/* Beta disclaimer */}
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-800">{t('auth.beta_title')}</p>
          <p className="mt-0.5 text-xs text-amber-700">{t('auth.beta_description')}</p>
        </div>

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
              {t('auth.get_started')}
            </h2>
            <p className="mb-6 text-sm text-charcoal-500">{t('auth.get_started_description')}</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Role selector hidden in pair flow — role is locked to tenant */}
              {!isPairFlow && (
                <div>
                  <label
                    htmlFor="role"
                    className="mb-1 block text-sm font-medium text-charcoal-700"
                  >
                    {t('auth.role')}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole('landlord')}
                      aria-pressed={role === 'landlord'}
                      className={`min-h-[44px] rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                        role === 'landlord'
                          ? 'border-saffron-500 bg-saffron-50 text-saffron-700'
                          : 'border-warm-200 text-charcoal-700 hover:bg-warm-50'
                      }`}
                    >
                      {t('auth.role_landlord')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('tenant')}
                      aria-pressed={role === 'tenant'}
                      className={`min-h-[44px] rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                        role === 'tenant'
                          ? 'border-saffron-500 bg-saffron-50 text-saffron-700'
                          : 'border-warm-200 text-charcoal-700 hover:bg-warm-50'
                      }`}
                    >
                      {t('auth.role_tenant')}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label
                  htmlFor="fullName"
                  className="mb-1 block text-sm font-medium text-charcoal-700"
                >
                  {t('auth.full_name')}
                </label>
                <input
                  id="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t('auth.full_name_placeholder')}
                  className="block w-full rounded-lg border border-warm-200 bg-warm-50 px-3 py-2.5 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
                />
              </div>

              {/* Phone hidden in pair flow — tenant can add it later in their profile */}
              {!isPairFlow && (
                <div>
                  <label
                    htmlFor="phone"
                    className="mb-1 block text-sm font-medium text-charcoal-700"
                  >
                    {t('auth.phone')}
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    placeholder={t('auth.phone_placeholder')}
                    className="block w-full rounded-lg border border-warm-200 bg-warm-50 px-3 py-2.5 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
                  />
                </div>
              )}

              <div>
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
                  className="block w-full rounded-lg border border-warm-200 bg-warm-50 px-3 py-2.5 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1 block text-sm font-medium text-charcoal-700"
                >
                  {t('auth.password')}
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.password_placeholder')}
                  className="block w-full rounded-lg border border-warm-200 bg-warm-50 px-3 py-2.5 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
                />
                <p className="mt-1 text-xs text-charcoal-400">{t('auth.password_hint')}</p>
              </div>

              {/* Consent checkbox */}
              <label className="flex items-start gap-2 text-sm text-charcoal-700">
                <input
                  type="checkbox"
                  checked={consented}
                  onChange={(e) => setConsented(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-warm-300 accent-saffron-500"
                />
                <span>
                  {t('auth.consent_prefix')}{' '}
                  <a
                    href="/legal#terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-saffron-600 underline hover:text-saffron-700"
                  >
                    {t('auth.consent_tos_link')}
                  </a>{' '}
                  {t('auth.consent_and')}{' '}
                  <a
                    href="/legal#privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-saffron-600 underline hover:text-saffron-700"
                  >
                    {t('auth.consent_privacy_link')}
                  </a>
                </span>
              </label>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={loading || !consented}
                className="min-h-[44px] w-full rounded-lg bg-saffron-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-saffron-600 focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {loading ? t('auth.signing_in') : t('auth.create_account')}
              </button>
            </form>

            <SocialLoginButtons
              mode="signup"
              role={role}
              pairCode={isPairFlow ? pairCode : undefined}
              disabled={loading}
            />

            <p className="mt-4 text-center text-sm text-charcoal-500">
              {t('auth.have_account')}{' '}
              <Link href="/login" className="font-medium text-saffron-600 hover:text-saffron-700">
                {t('app.login')}
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupPageInner />
    </Suspense>
  );
}
