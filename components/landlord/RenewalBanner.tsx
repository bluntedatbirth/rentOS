'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/context';

interface PendingRenewal {
  id: string;
  status: string;
  lease_start: string | null;
  lease_end: string | null;
  monthly_rent: number | null;
}

interface RenewalBannerProps {
  contract: {
    id: string;
    lease_end: string | null;
    status: string;
  };
  /** If a pending/awaiting_signature renewal exists for this contract, pass it here */
  pendingRenewal?: PendingRenewal | null;
  onRenewed?: () => void;
}

function getDaysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function RenewalBanner({ contract, pendingRenewal, onRenewed }: RenewalBannerProps) {
  const { t } = useI18n();
  const [withdrawing, setWithdrawing] = useState(false);
  const [activating, setActivating] = useState(false);
  const [withdrawn, setWithdrawn] = useState(false);

  // If a renewal was just withdrawn, hide the pending banner and fall through to the normal expiry banner
  const hasPending = !!pendingRenewal && !withdrawn;

  // Show "awaiting signature" state — tenant accepted, landlord must confirm physical signing
  if (hasPending && pendingRenewal!.status === 'awaiting_signature') {
    const handleActivate = async () => {
      if (!confirm(t('renewal.activate_confirm'))) return;
      setActivating(true);
      try {
        const res = await fetch(`/api/contracts/${pendingRenewal!.id}/activate`, {
          method: 'POST',
        });
        if (res.ok) {
          onRenewed?.();
        }
      } catch {
        // ignore
      } finally {
        setActivating(false);
      }
    };

    return (
      <div className="mb-6 rounded-lg bg-indigo-50 p-4 shadow-sm ring-1 ring-indigo-200">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-xl leading-none">✍️</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-indigo-900">
              {t('renewal.awaiting_signature_title')}
            </p>
            <p className="mt-0.5 text-sm text-indigo-800">
              {t('renewal.awaiting_signature_message')}
            </p>
            {pendingRenewal!.lease_end && (
              <p className="mt-1 text-xs text-indigo-600">
                {t('renewal.new_lease_end')}: {pendingRenewal!.lease_end}
                {pendingRenewal!.monthly_rent &&
                  ` · ฿${pendingRenewal!.monthly_rent.toLocaleString()}/mo`}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleActivate}
            disabled={activating}
            className="min-h-[44px] inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {activating ? t('common.loading') : t('renewal.mark_signed')}
          </button>
        </div>
      </div>
    );
  }

  // Show "renewal pending" state when a pending renewal exists (awaiting tenant response)
  if (hasPending && pendingRenewal!.status === 'pending') {
    const handleWithdraw = async () => {
      if (!confirm(t('renewal.withdraw_confirm'))) return;
      setWithdrawing(true);
      try {
        const res = await fetch(`/api/contracts/${pendingRenewal!.id}/renew`, {
          method: 'DELETE',
        });
        if (res.ok) {
          setWithdrawn(true);
          onRenewed?.();
        }
      } catch {
        // ignore
      } finally {
        setWithdrawing(false);
      }
    };

    return (
      <div className="mb-6 rounded-lg bg-blue-50 p-4 shadow-sm ring-1 ring-blue-200">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-xl leading-none">📨</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-900">{t('renewal.pending_title')}</p>
            <p className="mt-0.5 text-sm text-blue-800">{t('renewal.pending_message')}</p>
            {pendingRenewal!.lease_end && (
              <p className="mt-1 text-xs text-blue-600">
                {t('renewal.new_lease_end')}: {pendingRenewal!.lease_end}
                {pendingRenewal!.monthly_rent &&
                  ` · ฿${pendingRenewal!.monthly_rent.toLocaleString()}/mo`}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleWithdraw}
            disabled={withdrawing}
            className="min-h-[44px] inline-flex items-center rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            {withdrawing ? t('renewal.withdrawing') : t('renewal.withdraw')}
          </button>
        </div>
      </div>
    );
  }

  // Normal expiry banner — only show for active contracts near expiry
  if (!contract.lease_end || contract.status !== 'active') return null;

  const daysUntil = getDaysUntil(contract.lease_end);
  if (daysUntil > 30 || daysUntil < 0) return null;

  const bannerMessage = t('renewal.banner_message').replace('{days}', String(daysUntil));

  return (
    <div className="mb-6 rounded-lg bg-amber-50 p-4 shadow-sm ring-1 ring-amber-200">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-xl leading-none">📅</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-900">{t('renewal.banner_title')}</p>
          <p className="mt-0.5 text-sm text-amber-800">{bannerMessage}</p>
        </div>
        <Link
          href={`/landlord/contracts/${contract.id}/renew`}
          className="min-h-[44px] inline-flex items-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
        >
          {t('renewal.renew_contract')}
        </Link>
      </div>
    </div>
  );
}
