'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

export default function PairTenantPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { t } = useI18n();
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateCode = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/pairing/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract_id: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate code');
      setCode(data.code);
      setExpiresAt(data.expires_at);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
    setLoading(false);
  };

  // Build QR data URL using a public QR API
  const qrUrl = code
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
        `${typeof window !== 'undefined' ? window.location.origin : ''}/tenant/pair?code=${code}`
      )}`
    : null;

  if (!user) return <LoadingSkeleton count={2} />;

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href={`/landlord/contracts/${id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
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
      <h2 className="mb-2 text-xl font-bold text-gray-900">{t('pairing.title')}</h2>
      <p className="mb-6 text-sm text-gray-500">{t('pairing.description')}</p>

      {!code ? (
        <div className="rounded-lg bg-white p-8 text-center shadow-sm">
          <p className="mb-4 text-sm text-gray-600">{t('pairing.generate_prompt')}</p>
          <button
            type="button"
            onClick={generateCode}
            disabled={loading}
            className="min-h-[44px] rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? t('common.loading') : t('pairing.generate_button')}
          </button>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>
      ) : (
        <div className="rounded-lg bg-white p-6 text-center shadow-sm">
          {/* QR Code */}
          {qrUrl && (
            <div className="mb-4 flex justify-center">
              <img // eslint-disable-line @next/next/no-img-element
                src={qrUrl}
                alt="Pairing QR Code"
                className="h-48 w-48 rounded-lg"
              />
            </div>
          )}

          {/* Manual code */}
          <p className="mb-1 text-xs text-gray-500">{t('pairing.or_enter_code')}</p>
          <div className="mb-4 inline-block rounded-lg bg-gray-100 px-6 py-3">
            <span className="font-mono text-3xl font-bold tracking-widest text-gray-900">
              {code}
            </span>
          </div>

          {/* Expiry */}
          <p className="mb-4 text-xs text-gray-400">
            {t('pairing.expires_at')}: {expiresAt ? new Date(expiresAt).toLocaleTimeString() : '—'}
          </p>

          {/* Instructions */}
          <div className="rounded-lg bg-blue-50 p-4 text-left text-sm text-blue-800">
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
            className="mt-4 min-h-[44px] rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {t('pairing.regenerate')}
          </button>
        </div>
      )}
    </div>
  );
}
