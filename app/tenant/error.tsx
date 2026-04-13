'use client';

import { useEffect } from 'react';
import { useI18n } from '@/lib/i18n/context';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function TenantError({ error, reset }: ErrorProps) {
  const { t } = useI18n();

  useEffect(() => {
    console.error('[TenantError]', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md w-full rounded-xl border border-warm-200 dark:border-white/10 bg-white dark:bg-charcoal-800 p-8 text-center shadow-sm dark:shadow-black/20">
        <div className="mb-4 flex justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-warm-100 dark:bg-white/5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-7 w-7 text-charcoal-400 dark:text-white/40"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        </div>
        <h1 className="mb-2 text-lg font-semibold text-charcoal-900 dark:text-white">
          {t('error.title')}
        </h1>
        <p className="mb-6 text-sm text-charcoal-500 dark:text-white/50">
          {t('error.description')}
        </p>
        <button
          onClick={reset}
          className="rounded-lg bg-saffron-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-saffron-600 focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:ring-offset-2"
        >
          {t('error.try_again')}
        </button>
      </div>
    </div>
  );
}
