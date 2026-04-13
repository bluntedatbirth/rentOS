'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';

export default function TenantPairPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const [code, setCode] = useState(searchParams.get('code') ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Auto-redeem if code is in URL (from QR scan) when the user is signed in.
  // If the user is NOT signed in, forward them to /signup?pair=CODE so they can
  // create an account and auto-pair in one smooth flow.
  useEffect(() => {
    const urlCode = searchParams.get('code');
    if (!urlCode) return;
    if (authLoading) return;
    if (!user) {
      router.replace(`/signup?pair=${urlCode}`);
      return;
    }
    setCode(urlCode);
    handleRedeem(urlCode);
  }, [searchParams, user, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRedeem = async (redeemCode?: string) => {
    const finalCode = redeemCode ?? code;
    if (!finalCode || finalCode.length !== 8) {
      setError(t('pairing.invalid_code'));
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/pairing/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: finalCode.toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to pair');
      setSuccess(true);
      setTimeout(() => router.push('/tenant/dashboard'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
    setLoading(false);
  };

  return (
    <div className="mx-auto max-w-sm">
      <h2 className="mb-2 text-xl font-bold text-charcoal-900">{t('pairing.tenant_title')}</h2>
      <p className="mb-6 text-sm text-charcoal-500">{t('pairing.tenant_description')}</p>

      {success ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
          <p className="text-lg font-semibold text-green-900">{t('pairing.success')}</p>
          <p className="mt-1 text-sm text-green-700">{t('pairing.redirecting')}</p>
        </div>
      ) : (
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <label
            htmlFor="pairing-code"
            className="mb-2 block text-sm font-medium text-charcoal-700"
          >
            {t('pairing.enter_code')}
          </label>
          <input
            id="pairing-code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 8))}
            maxLength={8}
            placeholder="ABC12345"
            className="mb-4 block w-full rounded-lg border border-warm-200 px-4 py-3 text-center font-mono text-2xl font-bold tracking-widest text-charcoal-900 placeholder:text-charcoal-300 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
          />

          {code.length > 0 && code.length < 8 && (
            <p className="mb-2 text-xs text-charcoal-500">
              {t('pairing.code_length_hint').replace('{n}', String(8 - code.length))}
            </p>
          )}

          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

          <button
            type="button"
            onClick={() => handleRedeem()}
            disabled={loading || code.length !== 8}
            className="min-h-[44px] w-full rounded-lg bg-saffron-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-saffron-600 disabled:opacity-50"
          >
            {loading ? t('common.loading') : t('pairing.pair_button')}
          </button>
        </div>
      )}
    </div>
  );
}
