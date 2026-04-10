'use client';

import { useState } from 'react';

export function ForgotPasswordLink() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    try {
      const res = await fetch('/api/auth/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        setStatus('error');
        return;
      }

      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setStatus('idle');
          setEmail('');
        }}
        className="mt-1 text-sm text-saffron-600 hover:text-saffron-700"
      >
        Forgot password?
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-sm rounded-lg border border-warm-200 bg-white p-6 shadow-lg">
            <h3 className="mb-1 text-base font-semibold text-charcoal-900">Reset your password</h3>
            <p className="mb-4 text-sm text-charcoal-500">
              Enter your email and we&apos;ll send you a reset link.
            </p>

            {status === 'success' ? (
              <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                If that email exists, we sent a reset link.
              </p>
            ) : (
              <form onSubmit={handleSend} className="space-y-3">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="block w-full rounded-lg border border-warm-200 bg-warm-50 px-3 py-2.5 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
                />

                {status === 'error' && (
                  <p className="text-sm text-red-600">Something went wrong. Please try again.</p>
                )}

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="min-h-[44px] w-full rounded-lg bg-saffron-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-saffron-600 focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {status === 'loading' ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-3 w-full text-center text-sm text-charcoal-500 hover:text-charcoal-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
