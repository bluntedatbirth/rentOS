'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) {
      setInvalid(true);
      return;
    }

    const params = new URLSearchParams(hash.replace(/^#/, ''));
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const type = params.get('type');

    if (!accessToken || !refreshToken || type !== 'recovery') {
      setInvalid(true);
      return;
    }

    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error: sessionError }) => {
        if (sessionError) {
          console.error('[reset-password] setSession failed', sessionError);
          setInvalid(true);
        } else {
          setReady(true);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      router.push('/login?msg=password_reset_success');
    }, 2000);
  };

  if (invalid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-warm-50 px-4">
        <div className="w-full max-w-sm rounded-lg border border-warm-200 bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold text-charcoal-900">Link expired</h2>
          <p className="mb-4 text-sm text-charcoal-700">
            This reset link is invalid or expired. Please request a new one.
          </p>
          <Link
            href="/login"
            className="text-sm font-medium text-saffron-600 hover:text-saffron-700"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-warm-50 px-4">
        <p className="text-sm text-charcoal-500">Verifying link…</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-warm-50 px-4">
        <div className="w-full max-w-sm rounded-lg border border-green-200 bg-green-50 p-6 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold text-green-900">Password updated</h2>
          <p className="text-sm text-green-800">
            Your password has been changed. Redirecting you to sign in…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-warm-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-charcoal-900">RentOS</h1>
        </div>

        <div className="rounded-lg border border-warm-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold text-charcoal-900">Choose a new password</h2>
          <p className="mb-6 text-sm text-charcoal-500">
            Enter and confirm your new password below.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-charcoal-700"
              >
                New password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="block w-full rounded-lg border border-warm-200 bg-warm-50 px-3 py-2.5 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
              />
            </div>

            <div>
              <label htmlFor="confirm" className="mb-1 block text-sm font-medium text-charcoal-700">
                Confirm password
              </label>
              <input
                id="confirm"
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat your new password"
                className="block w-full rounded-lg border border-warm-200 bg-warm-50 px-3 py-2.5 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="min-h-[44px] w-full rounded-lg bg-saffron-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-saffron-600 focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
