'use client';

import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n/context';

export function ForgotPasswordLink() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const dialogRef = useRef<HTMLDivElement>(null);

  // ESC key handler + focus trap
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    // Focus the dialog when it opens
    dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

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
        className="mt-1 text-sm text-saffron-600 dark:text-saffron-400 hover:text-saffron-700 dark:hover:text-saffron-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 focus-visible:ring-offset-2 rounded"
      >
        {t('auth.forgot_password')}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="forgot-password-title"
            tabIndex={-1}
            className="w-full max-w-sm rounded-xl border border-warm-200 dark:border-white/10 bg-white dark:bg-charcoal-800 p-6 shadow-lg dark:shadow-2xl focus:outline-none"
          >
            <h3
              id="forgot-password-title"
              className="mb-1 text-base font-semibold text-charcoal-900 dark:text-white"
            >
              {t('auth.reset_password_title')}
            </h3>
            <p className="mb-4 text-sm text-charcoal-500 dark:text-white/60">
              {t('auth.reset_password_description')}
            </p>

            {status === 'success' ? (
              <p className="rounded-lg border border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10 px-4 py-3 text-sm text-green-800 dark:text-green-200">
                {t('auth.reset_password_success')}
              </p>
            ) : (
              <form onSubmit={handleSend} className="space-y-3">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth.email_placeholder')}
                  className="block w-full rounded-lg border border-warm-200 dark:border-white/10 bg-warm-50 dark:bg-white/5 px-3 py-2.5 text-sm text-charcoal-900 dark:text-white placeholder:text-charcoal-400 dark:placeholder:text-white/30 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
                />

                {status === 'error' && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {t('auth.reset_password_error')}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="min-h-[44px] w-full rounded-lg bg-saffron-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-saffron-600 focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:ring-offset-2 dark:focus:ring-offset-charcoal-800 disabled:opacity-50 transition-colors"
                >
                  {status === 'loading'
                    ? t('auth.reset_password_sending')
                    : t('auth.reset_password_send')}
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-3 w-full text-center text-sm text-charcoal-500 dark:text-white/50 hover:text-charcoal-700 dark:hover:text-white/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 focus-visible:ring-offset-2 rounded"
            >
              {t('auth.cancel')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
