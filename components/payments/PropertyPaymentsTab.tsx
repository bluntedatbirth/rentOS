'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { useToast } from '@/components/ui/ToastProvider';
import { formatDisplayDate } from '@/lib/format/date';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState, IconReceiptMid } from '@/components/ui/EmptyState';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PaymentRecord {
  id: string;
  contract_id: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  payment_type: 'rent' | 'utility' | 'deposit' | 'penalty';
  status: 'pending' | 'paid' | 'overdue';
  promptpay_ref: string | null;
  notes: string | null;
  claimed_by: string | null;
  claimed_at: string | null;
  claimed_note: string | null;
}

export interface ContractForPayments {
  id: string;
  property_id: string;
  monthly_rent: number | null;
  properties: { name: string } | null;
}

// ---------------------------------------------------------------------------
// Helpers (extracted verbatim from app/landlord/payments/page.tsx)
// ---------------------------------------------------------------------------

type PaymentBucket = 'due' | 'future' | 'completed';

function categorisePayment(payment: PaymentRecord): PaymentBucket {
  if (payment.status === 'paid') return 'completed';
  if (payment.status === 'overdue') return 'due';
  // claimed payments stay in Due until landlord confirms
  if (payment.claimed_at != null) return 'due';
  // pending: check if within 7 days
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDaysOut = new Date(today);
  sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);
  const due = new Date(payment.due_date);
  if (due <= sevenDaysOut) return 'due';
  return 'future';
}

function isPayableWindow(payment: PaymentRecord): boolean {
  if (payment.payment_type === 'penalty') return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thirtyDaysOut = new Date(today);
  thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);
  const due = new Date(payment.due_date);
  // Anything up to and including 30 days ahead is payable. Overdue is also payable.
  return due <= thirtyDaysOut;
}

const TYPE_LABEL_KEYS: Record<string, string> = {
  rent: 'payments.type_rent',
  utility: 'payments.type_utility',
  deposit: 'payments.type_deposit',
  penalty: 'payments.type_penalty',
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PropertyPaymentsTabProps {
  contracts: ContractForPayments[];
  payments: PaymentRecord[];
  propertyName?: string;
  /** Called after a successful mark-as-paid so the parent can refetch. */
  onPaymentConfirmed?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PropertyPaymentsTab({
  contracts,
  payments: initialPayments,
  onPaymentConfirmed,
}: PropertyPaymentsTabProps) {
  const { t } = useI18n();
  const { toast } = useToast();

  const [payments, setPayments] = useState<PaymentRecord[]>(initialPayments);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [completedExpanded, setCompletedExpanded] = useState(false);

  // Build a map of contract id → display label (property name or id prefix)
  const contractMap: Record<string, string> = {};
  contracts.forEach((c) => {
    contractMap[c.id] = c.properties?.name ?? c.id.slice(0, 8);
  });

  // -------------------------------------------------------------------
  // Mark-as-paid handler (PATCH to existing API route — DO NOT touch)
  // Double-confirm preserved verbatim from original page.
  // -------------------------------------------------------------------
  async function handleConfirmPayment(paymentId: string) {
    setConfirmingId(paymentId);
    const res = await fetch(`/api/payments/${paymentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'paid' }),
    });

    if (res.ok) {
      toast.success(t('payments.confirmed_success'));
      // Optimistically update local state
      setPayments((prev) =>
        prev.map((p) =>
          p.id === paymentId
            ? { ...p, status: 'paid' as const, paid_date: new Date().toISOString().slice(0, 10) }
            : p
        )
      );
      onPaymentConfirmed?.();
    } else {
      toast.error(t('auth.error'));
    }
    setConfirmingId(null);
  }

  // -------------------------------------------------------------------
  // "Confirm Received" handler — for claimed payments only.
  // Calls POST /api/payments/[id]/confirm which:
  //   • sets status → 'paid', stamps confirmed_by + paid_date
  //   • is idempotent (double-click safe)
  //   • notifies the tenant
  // Optimistic update: row flips to paid immediately; reverts on error.
  // -------------------------------------------------------------------
  async function handleConfirmReceived(paymentId: string) {
    // Optimistically mark paid so double-clicks are visually blocked.
    const todayStr = new Date().toISOString().slice(0, 10);
    setPayments((prev) =>
      prev.map((p) =>
        p.id === paymentId ? { ...p, status: 'paid' as const, paid_date: todayStr } : p
      )
    );
    setConfirmingId(paymentId);

    try {
      const res = await fetch(`/api/payments/${paymentId}/confirm`, { method: 'POST' });

      if (res.ok) {
        toast.success(t('payments.confirmed_success'));
        onPaymentConfirmed?.();
      } else {
        // Revert optimistic update on failure.
        setPayments((prev) =>
          prev.map((p) =>
            p.id === paymentId ? { ...p, status: 'pending' as const, paid_date: null } : p
          )
        );
        toast.error(t('auth.error'));
      }
    } catch {
      // Network error — revert.
      setPayments((prev) =>
        prev.map((p) =>
          p.id === paymentId ? { ...p, status: 'pending' as const, paid_date: null } : p
        )
      );
      toast.error(t('auth.error'));
    } finally {
      setConfirmingId(null);
    }
  }

  // -------------------------------------------------------------------
  // Bucket + sort (identical logic to original page)
  // -------------------------------------------------------------------
  const duePayments = payments
    .filter((p) => categorisePayment(p) === 'due')
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  const futurePayments = payments
    .filter((p) => categorisePayment(p) === 'future')
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  const completedPayments = payments
    .filter((p) => categorisePayment(p) === 'completed')
    .sort((a, b) => {
      const aDate = a.paid_date ?? a.due_date;
      const bDate = b.paid_date ?? b.due_date;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });

  const allEmpty =
    duePayments.length === 0 && futurePayments.length === 0 && completedPayments.length === 0;

  // -------------------------------------------------------------------
  // renderPaymentCard (extracted verbatim from original page)
  // -------------------------------------------------------------------
  const renderPaymentCard = (payment: PaymentRecord) => {
    const isOverdue = payment.status !== 'paid' && new Date(payment.due_date) < new Date();
    // A payment is "awaiting confirmation" when the tenant has clicked
    // "I paid" but the landlord hasn't confirmed receipt yet.
    const isClaimed = payment.status !== 'paid' && payment.claimed_at != null;

    return (
      <div
        key={payment.id}
        className={`rounded-lg bg-white p-4 shadow-sm ${
          isClaimed ? 'border-l-4 border-amber-500' : isOverdue ? 'border-l-4 border-red-500' : ''
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusBadge
              status={payment.payment_type}
              label={t(TYPE_LABEL_KEYS[payment.payment_type] ?? payment.payment_type)}
            />
            <span className="text-lg font-semibold text-charcoal-900">
              ฿{payment.amount.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={isOverdue ? 'overdue' : payment.status} />
            {payment.status !== 'paid' &&
              (isClaimed ? (
                /* Claimed payment: green "Confirm Received" button.
                   Uses the dedicated /confirm route which is idempotent
                   and notifies the tenant. Always shown (no payable-window
                   restriction) so the landlord can confirm as soon as the
                   tenant marks the payment. */
                <button
                  type="button"
                  aria-label={t('payments.confirm_received')}
                  onClick={() => void handleConfirmReceived(payment.id)}
                  disabled={confirmingId === payment.id}
                  className="min-h-[44px] rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {confirmingId === payment.id
                    ? t('common.loading')
                    : t('payments.confirm_received')}
                </button>
              ) : isPayableWindow(payment) ? (
                /* Non-claimed payment within the payable window: standard confirm. */
                <button
                  type="button"
                  onClick={() => {
                    if (!window.confirm(t('payments.mark_paid_confirm'))) return;
                    void handleConfirmPayment(payment.id);
                  }}
                  disabled={confirmingId === payment.id}
                  className="min-h-[44px] rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {confirmingId === payment.id
                    ? t('common.loading')
                    : t('payments.confirm_payment')}
                </button>
              ) : (
                <span className="text-xs text-charcoal-400">
                  {t('payments.v2_not_yet_payable')}
                </span>
              ))}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-charcoal-500">
          {/* Tenant/contract identifier */}
          <span className="font-medium text-charcoal-700">
            {contractMap[payment.contract_id] ?? '\u2014'}
          </span>
          <span>
            {t('payments.due_date')}: {formatDisplayDate(payment.due_date)}
          </span>
          {payment.paid_date && (
            <span>
              {t('payments.paid_date')}: {formatDisplayDate(payment.paid_date)}
            </span>
          )}
        </div>
        {isClaimed && (
          <div className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <p className="font-medium">{t('payments.tenant_claimed')}</p>
            {payment.claimed_note && <p className="mt-0.5">{payment.claimed_note}</p>}
          </div>
        )}
        {payment.notes && <p className="mt-1 text-sm text-charcoal-400">{payment.notes}</p>}
      </div>
    );
  };

  // -------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------
  if (allEmpty) {
    return (
      <EmptyState
        icon={<IconReceiptMid size={48} />}
        heading={t('empty.payments.landlord.heading')}
        context={t('empty.payments.landlord.context')}
        nextStep={t('empty.payments.landlord.next_step')}
      />
    );
  }

  // -------------------------------------------------------------------
  // Three-bucket layout (Due / Future / Completed)
  // -------------------------------------------------------------------
  return (
    <div>
      {/* Due section — expanded by default */}
      <div className="mb-8">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-charcoal-500">
          {t('payments.section_due')}
        </h3>
        {duePayments.length === 0 ? (
          <p className="text-sm text-charcoal-400">{t('payments.no_payments_due')}</p>
        ) : (
          <div className="space-y-3">{duePayments.map(renderPaymentCard)}</div>
        )}
      </div>

      {/* Future section — expanded by default */}
      <div className="mb-8">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-charcoal-500">
          {t('payments.section_future')}
        </h3>
        {futurePayments.length === 0 ? (
          <p className="text-sm text-charcoal-400">{t('payments.no_future_payments')}</p>
        ) : (
          <div className="space-y-3">{futurePayments.map(renderPaymentCard)}</div>
        )}
      </div>

      {/* Completed section — collapsed by default */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-charcoal-500">
            {t('payments.section_completed')}
          </h3>
          {completedPayments.length > 0 && (
            <button
              type="button"
              onClick={() => setCompletedExpanded((prev) => !prev)}
              className="text-xs font-medium text-saffron-600 hover:text-saffron-800"
            >
              {completedExpanded
                ? `${t('payments.hide_completed')} ▴`
                : `${t('payments.show_completed').replace('{}', String(completedPayments.length))} ▾`}
            </button>
          )}
        </div>
        {completedPayments.length > 0 && completedExpanded && (
          <div className="space-y-3">{completedPayments.map(renderPaymentCard)}</div>
        )}
      </div>
    </div>
  );
}
