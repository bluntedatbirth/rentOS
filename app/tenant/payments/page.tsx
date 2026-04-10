'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';
import { useToast } from '@/components/ui/ToastProvider';

import { createClient } from '@/lib/supabase/client';
import { StatusBadge } from '@/components/ui/StatusBadge';

import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

const supabase = createClient();

interface Payment {
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

interface ActiveContract {
  id: string;
  monthly_rent: number;
  lease_start: string;
  lease_end: string;
  property_name: string | null;
}

type PaymentBucket = 'due' | 'future' | 'completed';

function categorisePayment(payment: Payment): PaymentBucket {
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

function isPayableWindow(payment: Payment): boolean {
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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function TenantPaymentsPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [activeContract, setActiveContract] = useState<ActiveContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [activeClaimId, setActiveClaimId] = useState<string | null>(null);
  const [claimNote, setClaimNote] = useState('');
  const [completedExpanded, setCompletedExpanded] = useState(false);

  const load = async () => {
    if (!user) return;
    // Get tenant's active contract with property join
    const { data: contracts } = await supabase
      .from('contracts')
      .select('id, monthly_rent, lease_start, lease_end, properties(name)')
      .eq('tenant_id', user.id)
      .eq('status', 'active')
      .limit(1);

    const raw = contracts?.[0];

    if (raw) {
      const propertiesData = raw.properties as { name: string } | { name: string }[] | null;
      const propertyName =
        propertiesData == null
          ? null
          : Array.isArray(propertiesData)
            ? (propertiesData[0]?.name ?? null)
            : propertiesData.name;

      const contract: ActiveContract = {
        id: raw.id as string,
        monthly_rent: raw.monthly_rent as number,
        lease_start: raw.lease_start as string,
        lease_end: raw.lease_end as string,
        property_name: propertyName,
      };
      setActiveContract(contract);

      const { data: paymentData } = await supabase
        .from('payments')
        .select(
          'id, contract_id, amount, due_date, paid_date, payment_type, status, promptpay_ref, notes, claimed_by, claimed_at, claimed_note'
        )
        .eq('contract_id', contract.id)
        .order('due_date', { ascending: false });

      setPayments((paymentData ?? []) as unknown as Payment[]);
    } else {
      setActiveContract(null);
      setPayments([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const submitClaim = async (paymentId: string) => {
    setClaimingId(paymentId);
    try {
      const res = await fetch(`/api/payments/${paymentId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: claimNote || undefined }),
      });
      if (res.ok) {
        toast.success(t('payments.claim_sent'));
        setActiveClaimId(null);
        setClaimNote('');
        await load();
      } else {
        toast.error(t('auth.error'));
      }
    } catch {
      toast.error(t('auth.error'));
    } finally {
      setClaimingId(null);
    }
  };

  if (loading) return <LoadingSkeleton count={4} />;

  // Categorise into three buckets
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

  // Total due: sum from Due section only
  const totalDue = duePayments.reduce((sum, p) => sum + p.amount, 0);
  const overdueCount = duePayments.filter((p) => p.status === 'overdue').length;

  const allEmpty =
    duePayments.length === 0 && futurePayments.length === 0 && completedPayments.length === 0;

  const getDaysUntilDue = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const renderPaymentCard = (payment: Payment) => {
    const isOverdue = payment.status !== 'paid' && new Date(payment.due_date) < new Date();
    const daysUntil = getDaysUntilDue(payment.due_date);
    const isClaimed = payment.status !== 'paid' && payment.claimed_at != null;
    const isClaimable = payment.status !== 'paid' && !isClaimed;

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
          <StatusBadge status={isOverdue ? 'overdue' : payment.status} />
        </div>

        <div className="mt-2 flex flex-wrap gap-4 text-sm text-charcoal-500">
          <span>
            {t('payments.due_date')}: {payment.due_date}
          </span>
          {payment.status !== 'paid' && !isOverdue && daysUntil >= 0 && (
            <span className={daysUntil <= 3 ? 'text-amber-600 font-medium' : ''}>
              {daysUntil === 0
                ? t('payments.due_today')
                : `${daysUntil} ${t('create_contract.days')}`}
            </span>
          )}
          {payment.paid_date && (
            <span>
              {t('payments.paid_date')}: {payment.paid_date}
            </span>
          )}
        </div>

        {payment.notes && <p className="mt-1 text-sm text-charcoal-400">{payment.notes}</p>}

        {/* Download Receipt button — only on paid rows */}
        {payment.status === 'paid' && (
          <a
            href={`/api/payments/${payment.id}/receipt`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex min-h-[36px] items-center rounded-lg border border-saffron-500 px-3 py-1.5 text-xs font-semibold text-saffron-700 hover:bg-saffron-50"
          >
            {t('payments.download_receipt')}
          </a>
        )}

        {/* "Already claimed" banner — waiting for landlord confirmation */}
        {isClaimed && (
          <div className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <p className="font-medium">{t('payments.claim_pending_confirmation')}</p>
            {payment.claimed_note && (
              <p className="mt-0.5 italic">&ldquo;{payment.claimed_note}&rdquo;</p>
            )}
          </div>
        )}

        {/* "I've paid this" button — only on unpaid, unclaimed rows within the payable window */}
        {isClaimable && activeClaimId !== payment.id && (
          <div className="mt-3">
            {isPayableWindow(payment) ? (
              <button
                type="button"
                onClick={() => {
                  setActiveClaimId(payment.id);
                  setClaimNote('');
                }}
                className="min-h-[36px] rounded-lg border border-saffron-500 bg-white px-3 py-1.5 text-xs font-semibold text-saffron-700 hover:bg-saffron-50"
              >
                {t('payments.claim_paid')}
              </button>
            ) : (
              <span className="text-xs text-charcoal-400">{t('payments.v2_not_yet_payable')}</span>
            )}
          </div>
        )}

        {/* Inline claim form — only shown when within the payable window */}
        {isClaimable && activeClaimId === payment.id && isPayableWindow(payment) && (
          <div className="mt-3 rounded-md bg-saffron-50 p-3">
            <p className="mb-2 text-xs text-charcoal-900">{t('payments.claim_paid_prompt')}</p>
            <input
              type="text"
              value={claimNote}
              onChange={(e) => setClaimNote(e.target.value)}
              placeholder={t('payments.claim_note_placeholder')}
              className="mb-2 w-full rounded-md border border-saffron-200 bg-white px-2 py-1.5 text-xs"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => submitClaim(payment.id)}
                disabled={claimingId === payment.id}
                className="min-h-[36px] rounded-lg bg-saffron-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-saffron-600 disabled:opacity-50"
              >
                {claimingId === payment.id ? t('common.loading') : t('payments.claim_paid')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveClaimId(null);
                  setClaimNote('');
                }}
                className="min-h-[36px] rounded-lg border border-warm-200 px-3 py-1.5 text-xs font-medium text-charcoal-700 hover:bg-warm-100"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="mb-6 text-xl font-bold text-charcoal-900">{t('payments.title')}</h2>

      {/* No active lease state */}
      {!activeContract ? (
        <div className="rounded-lg bg-white p-8 text-center shadow-sm">
          <p className="text-base font-semibold text-charcoal-700">
            {t('payments.no_active_lease')}
          </p>
          <p className="mt-1 text-sm text-charcoal-500">{t('payments.no_active_lease_hint')}</p>
        </div>
      ) : (
        <>
          {/* Contract context block */}
          <div className="mb-6 rounded-lg bg-white p-4 shadow-sm">
            {activeContract.property_name && (
              <div className="mb-2">
                <p className="text-xs text-charcoal-500">{t('payments.your_property')}</p>
                <p className="text-sm font-semibold text-charcoal-900">
                  {activeContract.property_name}
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              <div>
                <p className="text-xs text-charcoal-500">{t('payments.total_due')}</p>
                <p className="text-sm font-semibold text-charcoal-900">
                  ฿{activeContract.monthly_rent.toLocaleString()}
                  {t('payments.per_month')}
                </p>
              </div>
              <div>
                <p className="text-xs text-charcoal-500">{t('payments.lease_period')}</p>
                <p className="text-sm font-semibold text-charcoal-900">
                  {formatDate(activeContract.lease_start)} → {formatDate(activeContract.lease_end)}
                </p>
              </div>
            </div>
          </div>

          {/* No payments at all */}
          {allEmpty ? (
            <div className="rounded-lg bg-white p-8 text-center shadow-sm">
              <p className="text-sm font-medium text-charcoal-500">
                {t('payments.no_payments_yet')}
              </p>
            </div>
          ) : (
            <>
              {/* Total due summary card — from Due section only */}
              {totalDue > 0 && (
                <div className="mb-6 rounded-lg bg-white p-4 shadow-sm">
                  <p className="text-xs text-charcoal-500">{t('payments.total_due')}</p>
                  <p className="text-2xl font-bold text-charcoal-900">
                    ฿{totalDue.toLocaleString()}
                  </p>
                  {overdueCount > 0 && (
                    <p className="mt-1 text-xs font-medium text-red-600">
                      {overdueCount} {t('payments.overdue')}
                    </p>
                  )}
                </div>
              )}

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
                      className="text-xs font-medium text-saffron-600 hover:text-saffron-700"
                    >
                      {completedExpanded
                        ? `${t('payments.hide_completed')} ▴`
                        : `${t('payments.show_completed').replace('{}', String(completedPayments.length))} ▾`}
                    </button>
                  )}
                </div>
                {completedPayments.length === 0 ? null : completedExpanded ? (
                  <div className="space-y-3">{completedPayments.map(renderPaymentCard)}</div>
                ) : null}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
