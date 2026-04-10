'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';
import { SocialProviderIcon } from './SocialProviderIcon';

interface SocialLoginButtonsProps {
  mode: 'login' | 'signup';
  role?: 'landlord' | 'tenant';
  pairCode?: string;
  disabled?: boolean;
}

type ActiveProvider = 'google' | 'facebook' | 'apple';

export function SocialLoginButtons({
  mode: _mode,
  role,
  pairCode,
  disabled,
}: SocialLoginButtonsProps) {
  const { signInWithOAuth } = useAuth();
  const { t } = useI18n();
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [loadingProvider, setLoadingProvider] = useState<ActiveProvider | null>(null);

  const handleOAuth = async (provider: ActiveProvider) => {
    if (disabled || loadingProvider) return;
    setOauthError(null);
    setLoadingProvider(provider);
    try {
      const { error } = await signInWithOAuth(provider, { role, pairCode });
      if (error) {
        setOauthError(error.message);
        setLoadingProvider(null);
      }
      // On success Supabase redirects the browser — no need to clear loadingProvider
    } catch (err) {
      setOauthError(err instanceof Error ? err.message : t('auth.error'));
      setLoadingProvider(null);
    }
  };

  const activeProviders: { provider: ActiveProvider; labelKey: string }[] = [
    { provider: 'google', labelKey: 'auth.continue_with_google' },
    { provider: 'facebook', labelKey: 'auth.continue_with_facebook' },
    { provider: 'apple', labelKey: 'auth.continue_with_apple' },
  ];

  const isAllDisabled = !!disabled || !!loadingProvider;

  return (
    <div className="mt-6">
      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-warm-200" />
        <span className="text-sm text-charcoal-500">{t('auth.or_continue_with')}</span>
        <div className="h-px flex-1 bg-warm-200" />
      </div>

      {oauthError && <p className="mt-3 text-sm text-red-600">{oauthError}</p>}

      {/* Button grid: 1 col on mobile, 2×2 on md+ */}
      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
        {activeProviders.map(({ provider, labelKey }) => (
          <button
            key={provider}
            type="button"
            onClick={() => handleOAuth(provider)}
            disabled={isAllDisabled}
            className="flex min-h-[44px] w-full items-center gap-3 rounded-lg border border-warm-200 bg-white px-4 py-2.5 text-sm font-medium text-charcoal-900 transition-colors hover:border-saffron-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <SocialProviderIcon provider={provider} size={24} />
            <span className="flex-1 text-center">{t(labelKey)}</span>
          </button>
        ))}

        {/* LINE — visual-only stub, unconditionally disabled */}
        <button
          type="button"
          disabled
          aria-disabled="true"
          tabIndex={-1}
          title={t('auth.line_coming_soon_tooltip')}
          className="flex min-h-[44px] w-full cursor-not-allowed items-center gap-3 rounded-lg border border-warm-200 bg-white px-4 py-2.5 text-sm font-medium text-charcoal-900 opacity-60"
          onClick={(e) => e.preventDefault()}
        >
          <SocialProviderIcon provider="line" size={24} />
          <span className="flex-1 text-center">{t('auth.continue_with_line')}</span>
          <span className="ml-2 inline-flex items-center rounded-full bg-warm-100 px-2 py-0.5 text-xs text-charcoal-500">
            {t('auth.line_coming_soon')}
          </span>
        </button>
      </div>
    </div>
  );
}
