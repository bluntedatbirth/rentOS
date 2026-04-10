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

interface Contract {
  id: string;
  property_id: string;
  monthly_rent: number | null;
  properties: { name: string } | null;
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

export default function LandlordPaymentsPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [contractMap, setContractMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [completedExpanded, setCompletedExpanded] = useState(false);

  // Form state
  const [formContractId, setFormContractId] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formType, setFormType] = useState<'rent' | 'utility' | 'deposit' | 'penalty'>('rent');
  const [formNotes, setFormNotes] = useState('');

  useEffect(() => {
    if (!user) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function loadData() {
    setLoading(true);

    // Load landlord's active contracts with property names + monthly_rent (used
    // as the default amount when landlord records a new rent payment)
    const { data: contractData } = await supabase
      .from('contracts')
      .select('id, property_id, monthly_rent, properties(name)')
      .eq('landlord_id', user!.id)
      .eq('status', 'active');

    const activeContracts = (contractData ?? []) as unknown as Contract[];
    setContracts(activeContracts);

    const cMap: Record<string, string> = {};
    activeContracts.forEach((c) => {
      cMap[c.id] = c.properties?.name ?? c.id.slice(0, 8);
    });
    setContractMap(cMap);

    // Load all payments for landlord's contracts
    if (activeContracts.length > 0) {
      const contractIds = activeContracts.map((c) => c.id);
      const { data: paymentData } = await supabase
        .from('payments')
        .select(
          'id, contract_id, amount, due_date, paid_date, payment_type, status, promptpay_ref, notes, claimed_by, claimed_at, claimed_note'
        )
        .in('contract_id', contractIds)
        .order('due_date', { ascending: false });

      setPayments((paymentData ?? []) as unknown as Payment[]);
    } else {
      setPayments([]);
    }

    setLoading(false);
    setHasLoaded(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formContractId || !formAmount || !formDueDate) return;
    setCreating(true);

    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contract_id: formContractId,
        amount: parseFloat(formAmount),
        due_date: formDueDate,
        payment_type: formType,
        notes: formNotes || undefined,
      }),
    });

    if (res.ok) {
      setShowForm(false);
      setFormContractId('');
      setFormAmount('');
      setFormDueDate('');
      setFormType('rent');
      setFormNotes('');
      toast.success(t('payments.created_success'));
      await loadData();
    } else {
      toast.error(t('auth.error'));
    }

    setCreating(false);
  }

  async function handleConfirmPayment(paymentId: string) {
    setConfirmingId(paymentId);
    const res = await fetch(`/api/payments/${paymentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'paid' }),
    });

    if (res.ok) {
      toast.success(t('payments.confirmed_success'));
      await loadData();
    } else {
      toast.error(t('auth.error'));
    }
    setConfirmingId(null);
  }

  // Only show the full-page skeleton on initial load; subsequent refreshes
  // (after create / confirm) keep the existing list visible while refetching.
  if (loading && !hasLoaded) return <LoadingSkeleton count={6} />;

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

  const allEmpty =
    duePayments.length === 0 && futurePayments.length === 0 && completedPayments.length === 0;

  const renderPaymentCard = (payment: Payment) => {
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
            {/* Confirm button: only when within the payable window */}
            {payment.status !== 'paid' &&
              (isPayableWindow(payment) ? (
                <button
                  type="button"
                  onClick={() => handleConfirmPayment(payment.id)}
                  disabled={confirmingId === payment.id}
                  className={`min-h-[44px] rounded-lg px-3 py-2 text-xs font-medium text-white disabled:opacity-50 ${
                    isClaimed
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {confirmingId === payment.id
                    ? t('common.loading')
                    : isClaimed
                      ? t('payments.confirm_claim')
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
            {t('payments.due_date')}: {payment.due_date}
          </span>
          {payment.paid_date && (
            <span>
              {t('payments.paid_date')}: {payment.paid_date}
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

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-charcoal-900">{t('payments.title')}</h2>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="min-h-[44px] rounded-lg bg-saffron-500 px-4 py-2 text-sm font-medium text-white hover:bg-saffron-600"
        >
          {t('payments.create')}
        </button>
      </div>

      {/* Create payment form */}
      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 rounded-lg bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="pay-contract"
                className="mb-1 block text-sm font-medium text-charcoal-700"
              >
                {t('payments.select_contract')}
              </label>
              <select
                id="pay-contract"
                value={formContractId}
                onChange={(e) => {
                  const id = e.target.value;
                  setFormContractId(id);
                  // Pre-fill amount with contract's monthly_rent when selecting
                  // a contract for a rent payment. Editable — landlord can adjust
                  // for partial payments, late fees, etc.
                  const selected = contracts.find((c) => c.id === id);
                  if (selected?.monthly_rent != null && formType === 'rent' && !formAmount) {
                    setFormAmount(String(selected.monthly_rent));
                  }
                }}
                required
                className="min-h-[44px] w-full rounded-lg border border-warm-200 px-3 py-2 text-sm"
              >
                <option value="">{t('payments.select_contract')}</option>
                {contracts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.properties?.name ?? c.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="pay-amount"
                className="mb-1 block text-sm font-medium text-charcoal-700"
              >
                {t('payments.amount')} ({t('common.thb')})
              </label>
              <input
                id="pay-amount"
                type="number"
                min="0"
                step="0.01"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                required
                className="min-h-[44px] w-full rounded-lg border border-warm-200 px-3 py-2 text-sm"
                placeholder="0.00"
              />
            </div>
            <div>
              <label
                htmlFor="pay-due-date"
                className="mb-1 block text-sm font-medium text-charcoal-700"
              >
                {t('payments.due_date')}
              </label>
              <input
                id="pay-due-date"
                type="date"
                value={formDueDate}
                onChange={(e) => setFormDueDate(e.target.value)}
                required
                className="min-h-[44px] w-full rounded-lg border border-warm-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="pay-type"
                className="mb-1 block text-sm font-medium text-charcoal-700"
              >
                {t('payments.type')}
              </label>
              <select
                id="pay-type"
                value={formType}
                onChange={(e) => setFormType(e.target.value as typeof formType)}
                className="min-h-[44px] w-full rounded-lg border border-warm-200 px-3 py-2 text-sm"
              >
                <option value="rent">{t('payments.type_rent')}</option>
                <option value="utility">{t('payments.type_utility')}</option>
                <option value="deposit">{t('payments.type_deposit')}</option>
                <option value="penalty">{t('payments.type_penalty')}</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="pay-notes"
                className="mb-1 block text-sm font-medium text-charcoal-700"
              >
                {t('payments.notes')}
              </label>
              <input
                id="pay-notes"
                type="text"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="min-h-[44px] w-full rounded-lg border border-warm-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={creating}
              className="min-h-[44px] rounded-lg bg-saffron-500 px-4 py-2 text-sm font-medium text-white hover:bg-saffron-600 disabled:opacity-50"
            >
              {creating ? t('payments.creating') : t('payments.create')}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="min-h-[44px] rounded-lg border border-warm-200 px-4 py-2 text-sm font-medium text-charcoal-700 hover:bg-warm-50"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      )}

      {/* No payments at all */}
      {allEmpty ? (
        <div className="rounded-lg bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-charcoal-500">{t('payments.no_payments_yet')}</p>
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
