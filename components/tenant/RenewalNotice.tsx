'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { formatDisplayDate } from '@/lib/format/date';

interface RenewalNoticeProps {
  contract: {
    id: string;
    renewed_from: string | null;
    renewal_changes: Record<string, { old: unknown; new: unknown }> | null;
    lease_start: string | null;
    lease_end: string | null;
    monthly_rent: number | null;
    security_deposit: number | null;
    status: string;
  };
  onResponded?: () => void;
}

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (key === 'lease_start' || key === 'lease_end') {
    return formatDisplayDate(value as string);
  }
  if ((key === 'monthly_rent' || key === 'security_deposit') && typeof value === 'number') {
    return `฿${value.toLocaleString()}`;
  }
  return String(value);
}

function labelForKey(key: string, t: (k: string) => string): string {
  const map: Record<string, string> = {
    monthly_rent: t('renewal.monthly_rent'),
    security_deposit: t('renewal.security_deposit'),
    lease_start: t('renewal.new_lease_start'),
    lease_end: t('renewal.new_lease_end'),
    contract_text: t('renewal.contract_text'),
  };
  return map[key] ?? key.replace(/_/g, ' ');
}

export function RenewalNotice({ contract, onResponded }: RenewalNoticeProps) {
  const { t } = useI18n();
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [declineLoading, setDeclineLoading] = useState(false);
  const [result, setResult] = useState<'accepted' | 'declined' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Only show when this is a renewal contract that's still pending
  if (!contract.renewed_from || contract.status !== 'pending') return null;

  async function respond(accept: boolean) {
    if (accept) {
      setAcceptLoading(true);
    } else {
      const confirmed = window.confirm(t('renewal.decline_confirm'));
      if (!confirmed) return;
      setDeclineLoading(true);
    }
    setError(null);

    try {
      const res = await fetch(`/api/contracts/${contract.id}/renew-respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accept }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? 'Request failed');
      }
      setResult(accept ? 'accepted' : 'declined');
      onResponded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setAcceptLoading(false);
      setDeclineLoading(false);
    }
  }

  const hasChanges = contract.renewal_changes && Object.keys(contract.renewal_changes).length > 0;

  if (result) {
    return (
      <div
        className={`mb-6 rounded-lg p-4 shadow-sm ring-1 ${
          result === 'accepted' ? 'bg-green-50 ring-green-200' : 'bg-gray-50 ring-gray-200'
        }`}
      >
        <p
          className={`text-sm font-medium ${
            result === 'accepted' ? 'text-green-800' : 'text-gray-700'
          }`}
        >
          {result === 'accepted' ? t('renewal.accepted') : t('renewal.declined')}
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-lg bg-blue-50 p-4 shadow-sm ring-1 ring-blue-200">
      {/* Header */}
      <div className="mb-4 flex items-start gap-3">
        <span className="mt-0.5 text-xl leading-none">📋</span>
        <div>
          <p className="text-sm font-semibold text-blue-900">{t('renewal.tenant_title')}</p>
          <p className="mt-0.5 text-sm text-blue-700">{t('renewal.tenant_message')}</p>
        </div>
      </div>

      {/* Proposed terms */}
      <div className="mb-4 grid grid-cols-1 gap-3 rounded-lg bg-white p-3 ring-1 ring-blue-100 sm:grid-cols-2">
        <div>
          <p className="text-xs text-gray-500">{t('renewal.lease_period')}</p>
          <p className="text-sm font-medium text-gray-900">
            {contract.lease_start ? formatDisplayDate(contract.lease_start) : '—'} →{' '}
            {contract.lease_end ? formatDisplayDate(contract.lease_end) : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">{t('renewal.monthly_rent')}</p>
          <p className="text-sm font-medium text-gray-900">
            {contract.monthly_rent ? `฿${contract.monthly_rent.toLocaleString()}` : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">{t('renewal.security_deposit')}</p>
          <p className="text-sm font-medium text-gray-900">
            {contract.security_deposit ? `฿${contract.security_deposit.toLocaleString()}` : '—'}
          </p>
        </div>
      </div>

      {/* Changes diff */}
      {hasChanges ? (
        <div className="mb-4 rounded-lg bg-white p-3 ring-1 ring-blue-100">
          <p className="mb-2 text-xs font-semibold text-gray-700">{t('renewal.changes_title')}</p>
          <div className="space-y-2">
            {Object.entries(contract.renewal_changes!)
              .filter(([key]) => key !== 'summary')
              .map(([key, diff]) => (
                <div key={key} className="flex items-center gap-2 text-sm">
                  <span className="min-w-[120px] text-xs text-gray-500">{labelForKey(key, t)}</span>
                  {key === 'contract_text' ? (
                    <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {t('renewal.clauses_updated')}
                    </span>
                  ) : (
                    <>
                      <span className="rounded bg-red-50 px-2 py-0.5 text-xs text-red-700 line-through">
                        {formatValue(key, diff.old)}
                      </span>
                      <span className="text-xs text-gray-400">→</span>
                      <span className="rounded bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                        {formatValue(key, diff.new)}
                      </span>
                    </>
                  )}
                </div>
              ))}
          </div>
        </div>
      ) : (
        <div className="mb-4 rounded-lg bg-white p-3 ring-1 ring-blue-100">
          <p className="text-sm text-gray-500">{t('renewal.no_changes')}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => respond(true)}
          disabled={acceptLoading || declineLoading}
          className="min-h-[44px] rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
        >
          {acceptLoading ? `${t('common.loading')}` : t('renewal.accept')}
        </button>
        <button
          type="button"
          onClick={() => respond(false)}
          disabled={acceptLoading || declineLoading}
          className="min-h-[44px] rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          {declineLoading ? `${t('common.loading')}` : t('renewal.decline')}
        </button>
      </div>
    </div>
  );
}
