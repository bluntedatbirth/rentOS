'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Click-through email verification page.
 *
 * Email links point here instead of directly to Supabase's /auth/v1/verify.
 * This prevents Gmail/Outlook link scanners from consuming the single-use
 * token before the user clicks — scanners load this page (GET) but can't
 * click the button.
 *
 * URL: /auth/confirm?token_hash=...&type=signup|magiclink|email_change
 */
function ConfirmInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'ready' | 'verifying' | 'success' | 'error'>('ready');
  const [errorMsg, setErrorMsg] = useState('');

  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as
    | 'signup'
    | 'magiclink'
    | 'email_change'
    | 'recovery'
    | null;

  // If no token, show error
  useEffect(() => {
    if (!tokenHash || !type) {
      setStatus('error');
      setErrorMsg('Invalid or missing verification link.');
    }
  }, [tokenHash, type]);

  const handleVerify = async () => {
    if (!tokenHash || !type) return;
    setStatus('verifying');

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      });

      if (error) {
        setStatus('error');
        setErrorMsg(
          error.message.includes('expired')
            ? 'This link has expired. Please sign up again or request a new link.'
            : error.message
        );
        return;
      }

      setStatus('success');
      // Short delay so user sees success state, then redirect
      setTimeout(() => {
        router.replace('/landlord/dashboard');
      }, 1500);
    } catch {
      setStatus('error');
      setErrorMsg('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-warm-50 dark:bg-charcoal-900 px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-2xl font-bold text-charcoal-900 dark:text-white">RentOS</h1>

        <div className="rounded-xl border border-warm-200 dark:border-white/10 bg-white dark:bg-charcoal-800/60 p-6 shadow-sm dark:shadow-2xl">
          {status === 'ready' && (
            <>
              <h2 className="mb-2 text-lg font-semibold text-charcoal-900 dark:text-white">
                Verify your email
              </h2>
              <p className="mb-6 text-sm text-charcoal-500 dark:text-white/50">
                Click the button below to confirm your email and access your account.
              </p>
              <button
                onClick={handleVerify}
                className="min-h-[44px] w-full rounded-lg bg-gradient-to-r from-saffron-600 to-saffron-500 px-4 py-2.5 text-sm font-medium text-white hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:ring-offset-2 transition-all"
              >
                Verify & Sign In
              </button>
            </>
          )}

          {status === 'verifying' && (
            <div className="flex flex-col items-center py-4">
              <svg
                className="animate-spin h-8 w-8 text-saffron-500 mb-3"
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
              <p className="text-sm text-charcoal-500 dark:text-white/50">Verifying...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center py-4">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-500/20">
                <svg
                  className="h-6 w-6 text-green-600 dark:text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mb-1 text-lg font-semibold text-charcoal-900 dark:text-white">
                Email verified!
              </h2>
              <p className="text-sm text-charcoal-500 dark:text-white/50">
                Redirecting to your dashboard...
              </p>
            </div>
          )}

          {status === 'error' && (
            <>
              <div className="mb-4 flex flex-col items-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/20">
                  <svg
                    className="h-6 w-6 text-red-600 dark:text-red-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h2 className="mb-1 text-lg font-semibold text-charcoal-900 dark:text-white">
                  Verification failed
                </h2>
                <p className="text-sm text-center text-charcoal-500 dark:text-white/50">
                  {errorMsg}
                </p>
              </div>
              <a
                href="/signup"
                className="block min-h-[44px] w-full rounded-lg border border-warm-200 dark:border-white/10 bg-warm-50 dark:bg-white/5 px-4 py-2.5 text-center text-sm font-medium text-charcoal-700 dark:text-white/70 hover:bg-warm-100 dark:hover:bg-white/10 transition-colors"
              >
                Back to Sign Up
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense>
      <ConfirmInner />
    </Suspense>
  );
}
