'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';
import { useToast } from '@/components/ui/ToastProvider';
import { createClient } from '@/lib/supabase/client';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { formatDisplayDate } from '@/lib/format/date';

const supabase = createClient();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

type BillCategory = 'rent' | 'electric' | 'water' | 'internet' | 'phone' | 'insurance' | 'other';

interface TenantBillPayment {
  id: string;
  bill_id: string;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue';
  paid_date: string | null;
}

interface TenantBill {
  id: string;
  tenant_id: string;
  name: string;
  amount: number;
  due_day: number;
  is_recurring: boolean;
  category: BillCategory;
  status: 'active' | 'paused' | 'deleted';
  created_at: string;
  current_payment: TenantBillPayment | null;
}

type PaymentBucket = 'due' | 'future' | 'completed';

// ---------------------------------------------------------------------------
// Helpers — contract payments
// ---------------------------------------------------------------------------

function categorisePayment(payment: Payment): PaymentBucket {
  if (payment.status === 'paid') return 'completed';
  if (payment.status === 'overdue') return 'due';
  if (payment.claimed_at != null) return 'due';
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
  return due <= thirtyDaysOut;
}

const TYPE_LABEL_KEYS: Record<string, string> = {
  rent: 'payments.type_rent',
  utility: 'payments.type_utility',
  deposit: 'payments.type_deposit',
  penalty: 'payments.type_penalty',
};

// ---------------------------------------------------------------------------
// Helpers — bills
// ---------------------------------------------------------------------------

const CATEGORY_ICONS: Record<BillCategory, string> = {
  rent: '🏠',
  electric: '⚡',
  water: '💧',
  internet: '📶',
  phone: '📱',
  insurance: '🛡️',
  other: '📄',
};

const BILL_PRESETS: { category: BillCategory; nameKey: string }[] = [
  { category: 'rent', nameKey: 'bills.category_rent' },
  { category: 'electric', nameKey: 'bills.category_electric' },
  { category: 'water', nameKey: 'bills.category_water' },
  { category: 'internet', nameKey: 'bills.category_internet' },
  { category: 'phone', nameKey: 'bills.category_phone' },
];

// ---------------------------------------------------------------------------
// Add Bill Modal
// ---------------------------------------------------------------------------

interface AddBillModalProps {
  onClose: () => void;
  onSaved: () => void;
  prefillName?: string;
  prefillCategory?: BillCategory;
}

function AddBillModal({
  onClose,
  onSaved,
  prefillName = '',
  prefillCategory = 'other',
}: AddBillModalProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const backdropRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(prefillName);
  const [amount, setAmount] = useState('');
  const [dueDay, setDueDay] = useState('1');
  const [category, setCategory] = useState<BillCategory>(prefillCategory);
  const [saving, setSaving] = useState(false);

  // Focus first input on mount
  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    const parsedDay = parseInt(dueDay, 10);
    if (
      !name.trim() ||
      isNaN(parsedAmount) ||
      parsedAmount <= 0 ||
      isNaN(parsedDay) ||
      parsedDay < 1 ||
      parsedDay > 31
    )
      return;

    setSaving(true);
    try {
      const res = await fetch('/api/tenant-bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          amount: parsedAmount,
          due_day: parsedDay,
          category,
        }),
      });
      if (res.ok) {
        toast.success(t('bills.add_success'));
        onSaved();
        onClose();
      } else {
        toast.error(t('bills.add_error'));
      }
    } catch {
      toast.error(t('bills.add_error'));
    } finally {
      setSaving(false);
    }
  };

  const BILL_CATEGORIES: BillCategory[] = [
    'rent',
    'electric',
    'water',
    'internet',
    'phone',
    'insurance',
    'other',
  ];
  const categoryKeyMap: Record<BillCategory, string> = {
    rent: 'bills.category_rent',
    electric: 'bills.category_electric',
    water: 'bills.category_water',
    internet: 'bills.category_internet',
    phone: 'bills.category_phone',
    insurance: 'bills.category_insurance',
    other: 'bills.category_other',
  };

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('bills.modal_title')}
    >
      <div className="w-full max-w-md bg-white dark:bg-charcoal-800 rounded-2xl p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-charcoal-900 dark:text-white">
            {t('bills.modal_title')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('bills.modal_close')}
            className="rounded-lg p-1.5 text-charcoal-400 dark:text-white/40 hover:bg-warm-100 dark:hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-charcoal-700 dark:text-white/70 mb-1">
              {t('bills.name_label')}
            </label>
            <input
              ref={firstInputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('bills.name_placeholder')}
              required
              className="w-full rounded-lg border border-warm-200 dark:border-white/10 bg-white dark:bg-charcoal-800 px-3 py-2 text-sm text-charcoal-900 dark:text-white placeholder:text-charcoal-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-saffron-400"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-charcoal-700 dark:text-white/70 mb-1">
              {t('bills.amount_label')}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-charcoal-500 dark:text-white/50 pointer-events-none">
                ฿
              </span>
              <input
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full rounded-lg border border-warm-200 dark:border-white/10 bg-white dark:bg-charcoal-800 pl-7 pr-3 py-2 text-sm text-charcoal-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-saffron-400"
              />
            </div>
          </div>

          {/* Due day + Category row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-charcoal-700 dark:text-white/70 mb-1">
                {t('bills.due_day_label')}
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                placeholder={t('bills.due_day_placeholder')}
                required
                className="w-full rounded-lg border border-warm-200 dark:border-white/10 bg-white dark:bg-charcoal-800 px-3 py-2 text-sm text-charcoal-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-saffron-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal-700 dark:text-white/70 mb-1">
                {t('bills.category_label')}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as BillCategory)}
                className="w-full rounded-lg border border-warm-200 dark:border-white/10 bg-white dark:bg-charcoal-800 px-3 py-2 text-sm text-charcoal-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-saffron-400"
              >
                {BILL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_ICONS[cat]} {t(categoryKeyMap[cat])}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[42px] rounded-xl border border-warm-200 dark:border-white/10 text-sm font-medium text-charcoal-700 dark:text-white/70 hover:bg-warm-100 dark:hover:bg-white/10 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 min-h-[42px] rounded-xl bg-saffron-500 hover:bg-saffron-600 text-sm font-semibold text-white transition-colors disabled:opacity-50"
            >
              {saving ? t('bills.saving') : t('bills.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function TenantPaymentsPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();

  // Contract payments state
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activeContract, setActiveContract] = useState<ActiveContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [activeClaimId, setActiveClaimId] = useState<string | null>(null);
  const [claimNote, setClaimNote] = useState('');
  const [completedExpanded, setCompletedExpanded] = useState(false);

  // Bills state
  const [bills, setBills] = useState<TenantBill[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalPrefillName, setModalPrefillName] = useState('');
  const [modalPrefillCategory, setModalPrefillCategory] = useState<BillCategory>('other');
  const [payingBillId, setPayingBillId] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;

    // Run both fetches in parallel
    const [contractResult, billsResult] = await Promise.all([
      supabase
        .from('contracts')
        .select('id, monthly_rent, lease_start, lease_end, properties(name)')
        .eq('tenant_id', user.id)
        .eq('status', 'active')
        .limit(1),
      fetch('/api/tenant-bills').then((r) => (r.ok ? r.json() : [])),
    ]);

    // Handle contract + payments
    const raw = contractResult.data?.[0];
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

    // Handle bills
    setBills(Array.isArray(billsResult) ? (billsResult as TenantBill[]) : []);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ---------------------------------------------------------------------------
  // Contract payment actions
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Bill actions
  // ---------------------------------------------------------------------------

  const handleBillPay = async (bill: TenantBill, undo: boolean) => {
    setPayingBillId(bill.id);
    try {
      const res = await fetch(`/api/tenant-bills/${bill.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ undo }),
      });
      if (res.ok) {
        toast.success(undo ? t('bills.undo_success') : t('bills.pay_success'));
        await load();
      } else {
        toast.error(t('bills.pay_error'));
      }
    } catch {
      toast.error(t('bills.pay_error'));
    } finally {
      setPayingBillId(null);
    }
  };

  const openAddModal = (prefillName = '', prefillCategory: BillCategory = 'other') => {
    setModalPrefillName(prefillName);
    setModalPrefillCategory(prefillCategory);
    setShowAddModal(true);
  };

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

  if (loading) return <LoadingSkeleton count={4} />;

  // ---------------------------------------------------------------------------
  // Derive contract payment buckets
  // ---------------------------------------------------------------------------

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

  const totalDue = duePayments.reduce((sum, p) => sum + p.amount, 0);
  const overdueCount = duePayments.filter((p) => p.status === 'overdue').length;
  const contractPaymentsEmpty =
    duePayments.length === 0 && futurePayments.length === 0 && completedPayments.length === 0;

  const getDaysUntilDue = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  // ---------------------------------------------------------------------------
  // Render contract payment card
  // ---------------------------------------------------------------------------

  const renderPaymentCard = (payment: Payment) => {
    const isOverdue = payment.status !== 'paid' && new Date(payment.due_date) < new Date();
    const daysUntil = getDaysUntilDue(payment.due_date);
    const isClaimed = payment.status !== 'paid' && payment.claimed_at != null;
    const isClaimable = payment.status !== 'paid' && !isClaimed;

    return (
      <div
        key={payment.id}
        className={`rounded-xl bg-white dark:bg-charcoal-800 border border-warm-200 dark:border-white/10 p-4 shadow-sm dark:shadow-black/20 ${
          isClaimed ? 'border-l-4 border-amber-500' : isOverdue ? 'border-l-4 border-red-500' : ''
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusBadge
              status={payment.payment_type}
              label={t(TYPE_LABEL_KEYS[payment.payment_type] ?? payment.payment_type)}
            />
            <span className="text-lg font-semibold text-charcoal-900 dark:text-white">
              ฿{payment.amount.toLocaleString()}
            </span>
          </div>
          <StatusBadge status={isOverdue ? 'overdue' : payment.status} />
        </div>

        <div className="mt-2 flex flex-wrap gap-4 text-sm text-charcoal-500 dark:text-white/50">
          <span>
            {t('payments.due_date')}: {formatDisplayDate(payment.due_date)}
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
              {t('payments.paid_date')}:{' '}
              {payment.paid_date ? formatDisplayDate(payment.paid_date) : ''}
            </span>
          )}
        </div>

        {payment.notes && (
          <p className="mt-1 text-sm text-charcoal-400 dark:text-white/40">{payment.notes}</p>
        )}

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

        {isClaimed && (
          <div className="mt-3 rounded-md bg-amber-100 dark:bg-amber-500/15 px-3 py-2 text-xs text-amber-800 dark:text-amber-400">
            <p className="font-medium">{t('payments.claim_pending_confirmation')}</p>
            {payment.claimed_note && (
              <p className="mt-0.5 italic">&ldquo;{payment.claimed_note}&rdquo;</p>
            )}
          </div>
        )}

        {isClaimable && activeClaimId !== payment.id && (
          <div className="mt-3">
            {isPayableWindow(payment) ? (
              <button
                type="button"
                onClick={() => {
                  setActiveClaimId(payment.id);
                  setClaimNote('');
                }}
                className="min-h-[36px] rounded-lg border border-saffron-500 bg-white dark:bg-charcoal-800 px-3 py-1.5 text-xs font-semibold text-saffron-700 hover:bg-saffron-50"
              >
                {t('payments.claim_paid')}
              </button>
            ) : (
              <span className="text-xs text-charcoal-400 dark:text-white/40">
                {t('payments.v2_not_yet_payable')}
              </span>
            )}
          </div>
        )}

        {isClaimable && activeClaimId === payment.id && isPayableWindow(payment) && (
          <div className="mt-3 rounded-md bg-saffron-50 p-3">
            <p className="mb-2 text-xs text-charcoal-900 dark:text-white">
              {t('payments.claim_paid_prompt')}
            </p>
            <input
              type="text"
              value={claimNote}
              onChange={(e) => setClaimNote(e.target.value)}
              placeholder={t('payments.claim_note_placeholder')}
              className="mb-2 w-full rounded-md border border-saffron-200 bg-white dark:bg-charcoal-800 dark:text-white dark:border-white/10 px-2 py-1.5 text-xs"
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
                className="min-h-[36px] rounded-lg border border-warm-200 dark:border-white/10 px-3 py-1.5 text-xs font-medium text-charcoal-700 dark:text-white/70 hover:bg-warm-100 dark:hover:bg-white/10"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Render bill card
  // ---------------------------------------------------------------------------

  const renderBillCard = (bill: TenantBill) => {
    const isPaid = bill.current_payment?.status === 'paid';
    const isProcessing = payingBillId === bill.id;
    const icon = CATEGORY_ICONS[bill.category] ?? '📄';
    const dueDayLabel = t('bills.due_on').replace('{}', String(bill.due_day));

    return (
      <div
        key={bill.id}
        className="bg-white dark:bg-charcoal-800 rounded-xl border border-warm-200 dark:border-white/10 shadow-sm dark:shadow-black/20 p-4"
      >
        <div className="flex items-start justify-between gap-3">
          {/* Left: icon + info */}
          <div className="flex items-start gap-3 min-w-0">
            <span className="text-2xl leading-none mt-0.5 flex-shrink-0" aria-hidden="true">
              {icon}
            </span>
            <div className="min-w-0">
              <p className="font-medium text-charcoal-900 dark:text-white truncate">{bill.name}</p>
              <p className="text-charcoal-700 dark:text-white/70 text-sm">
                ฿{bill.amount.toLocaleString()}
              </p>
              <p className="text-sm text-charcoal-500 dark:text-white/50">{dueDayLabel}</p>
            </div>
          </div>

          {/* Right: status / action */}
          <div className="flex-shrink-0 flex items-center">
            {isPaid ? (
              <div className="flex items-center gap-2">
                <span className="text-sage-600 dark:text-sage-400 text-sm font-medium flex items-center gap-1">
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {t('bills.paid_check')}
                </span>
                <button
                  type="button"
                  onClick={() => handleBillPay(bill, true)}
                  disabled={isProcessing}
                  className="text-xs text-charcoal-400 dark:text-white/40 hover:text-charcoal-600 dark:hover:text-white/60 underline underline-offset-2 disabled:opacity-50"
                >
                  {isProcessing ? t('bills.marking') : t('bills.undo_paid')}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleBillPay(bill, false)}
                disabled={isProcessing}
                className="bg-saffron-500 hover:bg-saffron-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {isProcessing ? t('bills.marking') : t('bills.mark_paid')}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Empty state (no contract, no bills)
  // ---------------------------------------------------------------------------

  const nothingAtAll = !activeContract && bills.length === 0;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="mb-6 text-xl font-bold text-charcoal-900 dark:text-white">
        {t('payments.title')}
      </h2>

      {/* ── Global empty state ── */}
      {nothingAtAll && (
        <div className="rounded-xl bg-white dark:bg-charcoal-800 border border-warm-200 dark:border-white/10 p-8 text-center shadow-sm dark:shadow-black/20 mb-6">
          <p className="text-base font-semibold text-charcoal-700 dark:text-white/70">
            {t('payments.no_active_lease')}
          </p>
          {t('payments.no_active_lease_hint') && (
            <p className="mt-1 text-sm text-charcoal-500 dark:text-white/50">
              {t('payments.no_active_lease_hint')}
            </p>
          )}
        </div>
      )}

      {/* ── Contract Payments section ── */}
      {activeContract && (
        <section className="mb-10">
          <h3 className="text-lg font-semibold text-charcoal-900 dark:text-white mb-4">
            {t('bills.contract_section_title')}
          </h3>

          {/* Contract context block */}
          <div className="mb-6 rounded-xl bg-white dark:bg-charcoal-800 border border-warm-200 dark:border-white/10 p-4 shadow-sm dark:shadow-black/20">
            {activeContract.property_name && (
              <div className="mb-2">
                <p className="text-xs text-charcoal-500 dark:text-white/50">
                  {t('payments.your_property')}
                </p>
                <p className="text-sm font-semibold text-charcoal-900 dark:text-white">
                  {activeContract.property_name}
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              <div>
                <p className="text-xs text-charcoal-500 dark:text-white/50">
                  {t('payments.total_due')}
                </p>
                <p className="text-sm font-semibold text-charcoal-900 dark:text-white">
                  ฿{activeContract.monthly_rent.toLocaleString()}
                  {t('payments.per_month')}
                </p>
              </div>
              <div>
                <p className="text-xs text-charcoal-500 dark:text-white/50">
                  {t('payments.lease_period')}
                </p>
                <p className="text-sm font-semibold text-charcoal-900 dark:text-white">
                  {formatDisplayDate(activeContract.lease_start)} →{' '}
                  {formatDisplayDate(activeContract.lease_end)}
                </p>
              </div>
            </div>
          </div>

          {contractPaymentsEmpty ? (
            <div className="rounded-xl bg-white dark:bg-charcoal-800 border border-warm-200 dark:border-white/10 p-8 text-center shadow-sm dark:shadow-black/20">
              <p className="text-base font-semibold text-charcoal-700 dark:text-white/70">
                {t('payments.no_payments_yet_heading')}
              </p>
              <p className="mt-1 text-sm text-charcoal-500 dark:text-white/50">
                {t('payments.no_payments_yet_desc')}
              </p>
            </div>
          ) : (
            <>
              {/* Total due summary card */}
              {totalDue > 0 && (
                <div className="mb-6 rounded-xl bg-white dark:bg-charcoal-800 border border-warm-200 dark:border-white/10 p-4 shadow-sm dark:shadow-black/20">
                  <p className="text-xs text-charcoal-500 dark:text-white/50">
                    {t('payments.total_due')}
                  </p>
                  <p className="text-2xl font-bold text-charcoal-900 dark:text-white">
                    ฿{totalDue.toLocaleString()}
                  </p>
                  {overdueCount > 0 && (
                    <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                      {overdueCount} {t('payments.overdue')}
                    </p>
                  )}
                </div>
              )}

              {/* Due */}
              <div className="mb-8">
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-charcoal-500 dark:text-white/50">
                  {t('payments.section_due')}
                </h4>
                {duePayments.length === 0 ? (
                  <p className="text-sm text-charcoal-400 dark:text-white/40">
                    {t('payments.no_payments_due')}
                  </p>
                ) : (
                  <div className="space-y-3">{duePayments.map(renderPaymentCard)}</div>
                )}
              </div>

              {/* Future */}
              <div className="mb-8">
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-charcoal-500 dark:text-white/50">
                  {t('payments.section_future')}
                </h4>
                {futurePayments.length === 0 ? (
                  <p className="text-sm text-charcoal-400 dark:text-white/40">
                    {t('payments.no_future_payments')}
                  </p>
                ) : (
                  <div className="space-y-3">{futurePayments.map(renderPaymentCard)}</div>
                )}
              </div>

              {/* Completed — collapsed by default */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-charcoal-500 dark:text-white/50">
                    {t('payments.section_completed')}
                  </h4>
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
                {completedPayments.length > 0 && completedExpanded && (
                  <div className="space-y-3">{completedPayments.map(renderPaymentCard)}</div>
                )}
              </div>
            </>
          )}
        </section>
      )}

      {/* ── My Bills section ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-charcoal-900 dark:text-white">
            {t('bills.section_title')}
          </h3>
          <button
            type="button"
            onClick={() => openAddModal()}
            className="flex items-center gap-1.5 bg-saffron-500 hover:bg-saffron-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
            {t('bills.add_bill')}
          </button>
        </div>

        {/* Quick preset pills */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <span className="text-sm text-charcoal-500 dark:text-white/50">
            {t('bills.presets_label')}
          </span>
          {BILL_PRESETS.map((preset) => (
            <button
              key={preset.category}
              type="button"
              onClick={() => openAddModal(t(preset.nameKey), preset.category)}
              className="bg-warm-100 dark:bg-white/5 text-charcoal-700 dark:text-white/70 rounded-full px-3 py-1 text-sm hover:bg-warm-200 dark:hover:bg-white/10 transition-colors"
            >
              {CATEGORY_ICONS[preset.category]} {t(preset.nameKey)}
            </button>
          ))}
        </div>

        {/* Bill cards */}
        {bills.length === 0 ? (
          <div className="rounded-xl bg-white dark:bg-charcoal-800 border border-warm-200 dark:border-white/10 p-8 text-center shadow-sm dark:shadow-black/20">
            <p className="text-sm text-charcoal-500 dark:text-white/50">{t('bills.empty_state')}</p>
          </div>
        ) : (
          <div className="space-y-3">{bills.map(renderBillCard)}</div>
        )}
      </section>

      {/* ── Add Bill Modal ── */}
      {showAddModal && (
        <AddBillModal
          prefillName={modalPrefillName}
          prefillCategory={modalPrefillCategory}
          onClose={() => setShowAddModal(false)}
          onSaved={() => {
            void load();
          }}
        />
      )}
    </div>
  );
}
