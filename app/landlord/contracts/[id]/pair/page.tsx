'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
const QRCodeSVG = dynamic(() => import('qrcode.react').then((mod) => mod.QRCodeSVG), {
  ssr: false,
});
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';
import { createClient } from '@/lib/supabase/client';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

const supabase = createClient();

export default function PairTenantPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { t } = useI18n();
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch contract to get property_id
  useEffect(() => {
    if (!user || !id) return;
    void supabase
      .from('contracts')
      .select('property_id')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) setPropertyId(data.property_id as string);
      });
  }, [user, id]);

  const generateCode = async () => {
    if (!propertyId) {
      setError('Property not found for this contract');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/pairing/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate code');
      setCode(data.code);
      setExpiresAt(data.expires_at ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
    setLoading(false);
  };

  // Build the pairing URL for the QR code — generated entirely client-side.
  // Points to /signup so unauthenticated tenants land directly in account creation
  // with the code pre-filled. Already-authenticated tenants are forwarded by the
  // signup page to /tenant/pair?code=… for immediate auto-redeem.
  const qrValue = code
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/signup?pair=${code}`
    : null;

  if (!user) return <LoadingSkeleton count={2} />;

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href={`/landlord/contracts/${id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-charcoal-500 dark:text-white/50 hover:text-charcoal-700 dark:hover:text-white/70"
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
        {t('nav.contracts')}
      </Link>
      <h2 className="mb-2 text-xl font-bold text-charcoal-900 dark:text-white">
        {t('pairing.title')}
      </h2>
      <p className="mb-6 text-sm text-charcoal-500 dark:text-white/50">
        {t('pairing.description')}
      </p>

      {!code ? (
        <div className="rounded-lg bg-white dark:bg-charcoal-800 p-8 text-center shadow-sm">
          <p className="mb-4 text-sm text-charcoal-600 dark:text-white/60">
            {t('pairing.generate_prompt')}
          </p>
          <button
            type="button"
            onClick={generateCode}
            disabled={loading}
            className="min-h-[44px] rounded-lg bg-saffron-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-saffron-600 disabled:opacity-50"
          >
            {loading ? t('common.loading') : t('pairing.generate_button')}
          </button>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>
      ) : (
        <div className="rounded-lg bg-white dark:bg-charcoal-800 p-6 text-center shadow-sm">
          {/* QR Code — rendered entirely client-side, no external requests */}
          {qrValue && (
            <div className="mb-4 flex justify-center">
              <QRCodeSVG value={qrValue} size={192} className="rounded-lg" />
            </div>
          )}

          {/* Manual code */}
          <p className="mb-1 text-xs text-charcoal-500 dark:text-white/50">
            {t('pairing.or_enter_code')}
          </p>
          <div className="mb-4 inline-block rounded-lg bg-warm-100 dark:bg-white/5 px-6 py-3">
            <span className="font-mono text-3xl font-bold tracking-widest text-charcoal-900 dark:text-white">
              {code}
            </span>
          </div>

          {/* Expiry */}
          <p className="mb-4 text-xs text-charcoal-400 dark:text-white/40">
            {t('pairing.expires_at')}: {expiresAt ? new Date(expiresAt).toLocaleTimeString() : '—'}
          </p>

          {/* Instructions */}
          <div className="rounded-lg bg-saffron-50 p-4 text-left text-sm text-saffron-800">
            <p className="mb-2 font-semibold">{t('pairing.instructions_title')}</p>
            <ol className="list-inside list-decimal space-y-1 text-xs">
              <li>{t('pairing.step_1')}</li>
              <li>{t('pairing.step_2')}</li>
              <li>{t('pairing.step_3')}</li>
            </ol>
          </div>

          <button
            type="button"
            onClick={generateCode}
            className="mt-4 min-h-[44px] rounded-lg border border-warm-300 dark:border-white/15 px-4 py-2 text-sm font-medium text-charcoal-700 dark:text-white/70 hover:bg-warm-50 dark:hover:bg-white/5"
          >
            {t('pairing.regenerate')}
          </button>
        </div>
      )}
    </div>
  );
}
