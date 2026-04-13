'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useTheme } from '@/lib/theme/context';
import { SocialLoginButtons } from '@/components/auth/SocialLoginButtons';
import { NeonButton } from '@/components/ui/neon-button';
import { formatPhone, stripPhone } from '@/lib/format/phone';
import { createClient } from '@/lib/supabase/client';
import dynamic from 'next/dynamic';

const CanvasRevealEffect = dynamic(
  () => import('@/components/ui/canvas-reveal-effect').then((mod) => mod.CanvasRevealEffect),
  { ssr: false }
);

function SignupPageInner() {
  const { signUp } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { resolvedTheme, mounted } = useTheme();

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
  const [showPassword, setShowPassword] = useState(false);

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
      // User-friendly messages for common cases
      if (authError.message === 'account_exists') {
        setError(t('auth.account_exists'));
      } else {
        setError(authError.message);
      }
      setLoading(false);
      return;
    }

    // If email confirmation is disabled in Supabase, the user already has a
    // session after signUp — redirect straight to the app.
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        if (isPairFlow) {
          router.replace(`/tenant/pair?code=${pairCode}`);
        } else {
          // Go to dashboard — middleware will auto-create profile if needed
          const dest = role === 'landlord' ? '/landlord/dashboard' : '/tenant/dashboard';
          router.replace(dest);
        }
        return;
      }
    } catch {
      // Session check failed — fall through to "Check Your Email"
    }

    // Email confirmation required — show "Check Your Email" screen
    setSent(true);
    setLoading(false);
  };

  const canvasColors: [number, number, number][] =
    resolvedTheme === 'dark'
      ? [
          [232, 167, 35], // saffron-500
          [196, 139, 25], // saffron-600
        ]
      : [[44, 44, 44]]; // charcoal dots on light

  return (
    <div className="flex min-h-screen items-center justify-center bg-warm-50 dark:bg-charcoal-900 px-4 relative overflow-hidden">
      {/* Canvas background */}
      <div className="absolute inset-0 z-0">
        {mounted && (
          <CanvasRevealEffect
            animationSpeed={3}
            containerClassName="bg-warm-50 dark:bg-charcoal-900"
            colors={canvasColors}
            dotSize={5}
            showGradient={false}
          />
        )}
        {/* Radial vignette — dark mode only */}
        <div className="hidden dark:block absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_30%,_rgba(26,26,26,0.8)_100%)]" />
      </div>

      {/* Content */}
      <div className="w-full max-w-sm relative z-10">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="text-2xl font-bold text-charcoal-900 dark:text-white hover:text-saffron-600 dark:hover:text-saffron-400 transition-colors"
          >
            {t('app.title')}
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageToggle variant="inline" />
          </div>
        </div>

        <div className="mb-4">
          <Link href="/" legacyBehavior passHref>
            <NeonButton variant="ghost" size="sm" neon={false} className="gap-1">
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
              {t('notfound.home_cta')}
            </NeonButton>
          </Link>
        </div>

        {/* Pair-flow banner: shown when tenant arrives from a landlord's QR code */}
        {isPairFlow && (
          <div className="mb-4 rounded-lg border border-saffron-200 dark:border-saffron-500/30 bg-saffron-50 dark:bg-saffron-500/10 px-4 py-3">
            <p className="text-sm font-semibold text-charcoal-900 dark:text-white">
              {t('auth.pair_banner_title')}
            </p>
            <p className="mt-0.5 text-xs text-charcoal-700 dark:text-white/60">
              {t('auth.pair_banner_description')}
            </p>
          </div>
        )}

        {/* Beta disclaimer */}
        <div className="mb-4 rounded-lg border border-amber-200 dark:border-saffron-500/30 bg-amber-50 dark:bg-saffron-500/10 backdrop-blur-sm px-4 py-3">
          <p className="text-sm font-medium text-amber-800 dark:text-saffron-300">
            {t('auth.beta_title')}
          </p>
          <p className="mt-0.5 text-xs text-amber-700 dark:text-saffron-200/70">
            {t('auth.beta_description')}
          </p>
        </div>

        {sent ? (
          <div className="rounded-xl border border-warm-200 dark:border-white/10 bg-white dark:bg-charcoal-800/60 p-6 shadow-sm dark:shadow-2xl dark:backdrop-blur-xl">
            <h2 className="mb-2 text-lg font-semibold text-charcoal-900 dark:text-white">
              {t('auth.check_email')}
            </h2>
            <p className="text-sm text-charcoal-500 dark:text-white/50">
              {t('auth.check_email_description')}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-warm-200 dark:border-white/10 bg-white dark:bg-charcoal-800/60 p-6 shadow-sm dark:shadow-2xl dark:backdrop-blur-xl">
            <h2 className="mb-1 text-lg font-semibold text-charcoal-900 dark:text-white">
              {t('auth.get_started')}
            </h2>
            <p className="mb-6 text-sm text-charcoal-500 dark:text-white/50">
              {t('auth.get_started_description')}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Role selector hidden in pair flow — role is locked to tenant */}
              {!isPairFlow && (
                <div>
                  <label
                    htmlFor="role"
                    className="mb-1 block text-sm font-medium text-charcoal-700 dark:text-white/70"
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
                          ? 'border-saffron-500 bg-saffron-50 dark:bg-saffron-500/15 text-saffron-700 dark:text-saffron-300'
                          : 'border-warm-200 dark:border-white/10 text-charcoal-700 dark:text-white/60 hover:bg-warm-50 dark:hover:bg-white/5'
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
                          ? 'border-saffron-500 bg-saffron-50 dark:bg-saffron-500/15 text-saffron-700 dark:text-saffron-300'
                          : 'border-warm-200 dark:border-white/10 text-charcoal-700 dark:text-white/60 hover:bg-warm-50 dark:hover:bg-white/5'
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
                  className="mb-1 block text-sm font-medium text-charcoal-700 dark:text-white/70"
                >
                  {t('auth.full_name')} <span className="text-red-500">*</span>
                </label>
                <input
                  id="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t('auth.full_name_placeholder')}
                  className="block w-full rounded-lg border border-warm-200 dark:border-white/10 bg-warm-50 dark:bg-white/5 px-3 py-2.5 text-sm text-charcoal-900 dark:text-white placeholder:text-charcoal-400 dark:placeholder:text-white/30 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
                />
              </div>

              {/* Phone hidden in pair flow — tenant can add it later in their profile */}
              {!isPairFlow && (
                <div>
                  <label
                    htmlFor="phone"
                    className="mb-1 block text-sm font-medium text-charcoal-700 dark:text-white/70"
                  >
                    {t('auth.phone')}
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    placeholder={t('auth.phone_placeholder')}
                    className="block w-full rounded-lg border border-warm-200 dark:border-white/10 bg-warm-50 dark:bg-white/5 px-3 py-2.5 text-sm text-charcoal-900 dark:text-white placeholder:text-charcoal-400 dark:placeholder:text-white/30 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="mb-1 block text-sm font-medium text-charcoal-700 dark:text-white/70"
                >
                  {t('auth.email')} <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth.email_placeholder')}
                  className="block w-full rounded-lg border border-warm-200 dark:border-white/10 bg-warm-50 dark:bg-white/5 px-3 py-2.5 text-sm text-charcoal-900 dark:text-white placeholder:text-charcoal-400 dark:placeholder:text-white/30 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1 block text-sm font-medium text-charcoal-700 dark:text-white/70"
                >
                  {t('auth.password')}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('auth.password_placeholder')}
                    className="block w-full rounded-lg border border-warm-200 dark:border-white/10 bg-warm-50 dark:bg-white/5 px-3 py-2.5 pr-10 text-sm text-charcoal-900 dark:text-white placeholder:text-charcoal-400 dark:placeholder:text-white/30 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400 dark:text-white/40 hover:text-charcoal-600 dark:hover:text-white/60 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-4.5 h-4.5"
                      >
                        <path
                          fillRule="evenodd"
                          d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.029 10.029 0 003.3-4.38 1.651 1.651 0 000-1.185A10.004 10.004 0 009.999 3a9.956 9.956 0 00-4.744 1.194L3.28 2.22zM7.752 6.69l1.092 1.092a2.5 2.5 0 013.374 3.373l1.092 1.092a4 4 0 00-5.558-5.558z"
                          clipRule="evenodd"
                        />
                        <path d="M10.748 13.93l2.523 2.523A9.987 9.987 0 0110 17c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 012.838-4.826L6.29 8.17a4 4 0 005.458 5.758z" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-4.5 h-4.5"
                      >
                        <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                        <path
                          fillRule="evenodd"
                          d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-charcoal-400 dark:text-white/40">
                  {t('auth.password_hint')}
                </p>
              </div>

              {/* Consent checkbox */}
              <label className="flex items-start gap-2 text-sm text-charcoal-700 dark:text-white/70">
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
                    className="text-saffron-600 dark:text-saffron-400 underline hover:text-saffron-700 dark:hover:text-saffron-300"
                  >
                    {t('auth.consent_tos_link')}
                  </a>{' '}
                  {t('auth.consent_and')}{' '}
                  <a
                    href="/legal#privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-saffron-600 dark:text-saffron-400 underline hover:text-saffron-700 dark:hover:text-saffron-300"
                  >
                    {t('auth.consent_privacy_link')}
                  </a>{' '}
                  <span className="text-red-500">*</span>
                </span>
              </label>

              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={loading || !consented}
                className="min-h-[44px] w-full rounded-lg bg-gradient-to-r from-saffron-600 to-saffron-500 px-4 py-2.5 text-sm font-medium text-white hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:ring-offset-2 focus:ring-offset-warm-50 dark:focus:ring-offset-charcoal-900 disabled:opacity-50 transition-all"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    {t('auth.signing_in')}
                  </span>
                ) : (
                  t('auth.create_account')
                )}
              </button>
            </form>

            <SocialLoginButtons
              mode="signup"
              role={role}
              pairCode={isPairFlow ? pairCode : undefined}
              disabled={loading}
            />

            <p className="mt-4 text-center text-sm text-charcoal-500 dark:text-white/50">
              {t('auth.have_account')}{' '}
              <Link
                href="/login"
                className="font-medium text-saffron-600 dark:text-saffron-400 hover:text-saffron-700 dark:hover:text-saffron-300"
              >
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
