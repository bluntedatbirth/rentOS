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
}

interface Contract {
  id: string;
  property_id: string;
  properties: { name: string } | null;
}

const TYPE_LABEL_KEYS: Record<string, string> = {
  rent: 'payments.type_rent',
  utility: 'payments.type_utility',
  deposit: 'payments.type_deposit',
  penalty: 'payments.type_penalty',
};

type FilterTab = 'all' | 'pending' | 'paid' | 'overdue';

export default function LandlordPaymentsPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [contractMap, setContractMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  // Form state
  const [formContractId, setFormContractId] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formType, setFormType] = useState<'rent' | 'utility' | 'deposit' | 'penalty'>('rent');
  const [formPromptpay, setFormPromptpay] = useState('');
  const [formNotes, setFormNotes] = useState('');

  useEffect(() => {
    if (!user) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function loadData() {
    setLoading(true);

    // Load landlord's active contracts with property names
    const { data: contractData } = await supabase
      .from('contracts')
      .select('id, property_id, properties(name)')
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
        .select('*')
        .in('contract_id', contractIds)
        .order('due_date', { ascending: false });

      setPayments((paymentData ?? []) as Payment[]);
    } else {
      setPayments([]);
    }

    setLoading(false);
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
        promptpay_ref: formPromptpay || undefined,
        notes: formNotes || undefined,
      }),
    });

    if (res.ok) {
      setShowForm(false);
      setFormContractId('');
      setFormAmount('');
      setFormDueDate('');
      setFormType('rent');
      setFormPromptpay('');
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

  // Filter payments
  const getFilteredPayments = () => {
    let filtered = payments;
    switch (activeFilter) {
      case 'pending':
        filtered = payments.filter((p) => p.status === 'pending');
        break;
      case 'paid':
        filtered = payments.filter((p) => p.status === 'paid');
        break;
      case 'overdue':
        filtered = payments.filter(
          (p) =>
            p.status === 'overdue' || (p.status === 'pending' && new Date(p.due_date) < new Date())
        );
        break;
    }
    // Sort: overdue first, pending, paid
    return filtered.sort((a, b) => {
      const order = { overdue: 0, pending: 1, paid: 2 };
      const aIsOverdue = a.status !== 'paid' && new Date(a.due_date) < new Date();
      const bIsOverdue = b.status !== 'paid' && new Date(b.due_date) < new Date();
      const aOrder = aIsOverdue ? 0 : (order[a.status] ?? 1);
      const bOrder = bIsOverdue ? 0 : (order[b.status] ?? 1);
      if (aOrder !== bOrder) return aOrder - bOrder;
      return new Date(b.due_date).getTime() - new Date(a.due_date).getTime();
    });
  };

  const filteredPayments = getFilteredPayments();

  // Filter tab counts
  const counts: Record<FilterTab, number> = {
    all: payments.length,
    pending: payments.filter((p) => p.status === 'pending').length,
    paid: payments.filter((p) => p.status === 'paid').length,
    overdue: payments.filter(
      (p) => p.status === 'overdue' || (p.status === 'pending' && new Date(p.due_date) < new Date())
    ).length,
  };

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: t('penalties.filter_all') },
    { key: 'pending', label: t('penalties.filter_pending') },
    { key: 'paid', label: t('payments.status_paid') },
    { key: 'overdue', label: t('payments.overdue') },
  ];

  if (loading) return <LoadingSkeleton count={6} />;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{t('payments.title')}</h2>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="min-h-[44px] rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {t('payments.create')}
        </button>
      </div>

      {/* Filter tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveFilter(tab.key)}
            className={`min-h-[36px] whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeFilter === tab.key
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
            {counts[tab.key] > 0 && (
              <span
                className={`ml-1.5 inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-bold ${
                  activeFilter === tab.key
                    ? 'bg-white/20 text-white'
                    : tab.key === 'overdue'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-200 text-gray-600'
                }`}
              >
                {counts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Create payment form */}
      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 rounded-lg bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="pay-contract"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                {t('payments.select_contract')}
              </label>
              <select
                id="pay-contract"
                value={formContractId}
                onChange={(e) => setFormContractId(e.target.value)}
                required
                className="min-h-[44px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
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
              <label htmlFor="pay-amount" className="mb-1 block text-sm font-medium text-gray-700">
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
                className="min-h-[44px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="0.00"
              />
            </div>
            <div>
              <label
                htmlFor="pay-due-date"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                {t('payments.due_date')}
              </label>
              <input
                id="pay-due-date"
                type="date"
                value={formDueDate}
                onChange={(e) => setFormDueDate(e.target.value)}
                required
                className="min-h-[44px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="pay-type" className="mb-1 block text-sm font-medium text-gray-700">
                {t('payments.type')}
              </label>
              <select
                id="pay-type"
                value={formType}
                onChange={(e) => setFormType(e.target.value as typeof formType)}
                className="min-h-[44px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="rent">{t('payments.type_rent')}</option>
                <option value="utility">{t('payments.type_utility')}</option>
                <option value="deposit">{t('payments.type_deposit')}</option>
                <option value="penalty">{t('payments.type_penalty')}</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="pay-promptpay"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                {t('payments.promptpay_ref')}
              </label>
              <input
                id="pay-promptpay"
                type="text"
                value={formPromptpay}
                onChange={(e) => setFormPromptpay(e.target.value)}
                className="min-h-[44px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder={t('payments.promptpay_placeholder')}
              />
            </div>
            <div>
              <label htmlFor="pay-notes" className="mb-1 block text-sm font-medium text-gray-700">
                {t('payments.notes')}
              </label>
              <input
                id="pay-notes"
                type="text"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="min-h-[44px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={creating}
              className="min-h-[44px] rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? t('payments.creating') : t('payments.create')}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="min-h-[44px] rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      )}

      {/* Payments list */}
      {filteredPayments.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-gray-500">{t('payments.no_payments')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPayments.map((payment) => {
            const isOverdue = payment.status !== 'paid' && new Date(payment.due_date) < new Date();
            return (
              <div
                key={payment.id}
                className={`rounded-lg bg-white p-4 shadow-sm ${
                  isOverdue ? 'border-l-4 border-red-500' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <StatusBadge
                      status={payment.payment_type}
                      label={t(TYPE_LABEL_KEYS[payment.payment_type] ?? payment.payment_type)}
                    />
                    <span className="text-lg font-semibold text-gray-900">
                      ฿{payment.amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={isOverdue ? 'overdue' : payment.status} />
                    {payment.status !== 'paid' && (
                      <button
                        type="button"
                        onClick={() => handleConfirmPayment(payment.id)}
                        disabled={confirmingId === payment.id}
                        className="min-h-[44px] rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        {confirmingId === payment.id
                          ? t('common.loading')
                          : t('payments.confirm_payment')}
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
                  <span>{contractMap[payment.contract_id] ?? '\u2014'}</span>
                  <span>
                    {t('payments.due_date')}: {payment.due_date}
                  </span>
                  {payment.paid_date && (
                    <span>
                      {t('payments.paid_date')}: {payment.paid_date}
                    </span>
                  )}
                </div>
                {payment.promptpay_ref && (
                  <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1">
                    <span className="text-xs font-medium text-blue-700">PromptPay:</span>
                    <span className="font-mono text-xs text-blue-900">{payment.promptpay_ref}</span>
                  </div>
                )}
                {payment.notes && <p className="mt-1 text-sm text-gray-400">{payment.notes}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
