'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';

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

const TYPE_LABEL_KEYS: Record<string, string> = {
  rent: 'payments.type_rent',
  utility: 'payments.type_utility',
  deposit: 'payments.type_deposit',
  penalty: 'payments.type_penalty',
};

export default function TenantPaymentsPage() {
  const { user } = useAuth();
  const { t } = useI18n();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      // Get tenant's active contract
      const { data: contracts } = await supabase
        .from('contracts')
        .select('id')
        .eq('tenant_id', user.id)
        .eq('status', 'active')
        .limit(1);

      const activeContract = contracts?.[0];

      if (activeContract) {
        const { data: paymentData } = await supabase
          .from('payments')
          .select('*')
          .eq('contract_id', activeContract.id)
          .order('due_date', { ascending: false });

        setPayments((paymentData ?? []) as Payment[]);
      }

      setLoading(false);
    };

    load();
  }, [user]);

  if (loading) return <LoadingSkeleton count={4} />;

  // Group: overdue first, pending, paid
  const overduePayments = payments.filter((p) => p.status === 'overdue');
  const pendingPayments = payments.filter((p) => p.status === 'pending');
  const paidPayments = payments.filter((p) => p.status === 'paid');
  const groupedPayments = [...overduePayments, ...pendingPayments, ...paidPayments];

  // Calculate totals
  const totalDue = [...overduePayments, ...pendingPayments].reduce((sum, p) => sum + p.amount, 0);

  const getDaysUntilDue = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="mb-6 text-xl font-bold text-gray-900">{t('payments.title')}</h2>

      {/* Summary card */}
      {totalDue > 0 && (
        <div className="mb-6 rounded-lg bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">{t('payments.total_due')}</p>
          <p className="text-2xl font-bold text-gray-900">฿{totalDue.toLocaleString()}</p>
          {overduePayments.length > 0 && (
            <p className="mt-1 text-xs font-medium text-red-600">
              {overduePayments.length} {t('payments.overdue')}
            </p>
          )}
        </div>
      )}

      {groupedPayments.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-gray-500">{t('payments.no_payments')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groupedPayments.map((payment) => {
            const isOverdue = payment.status !== 'paid' && new Date(payment.due_date) < new Date();
            const daysUntil = getDaysUntilDue(payment.due_date);
            const canPay = payment.status !== 'paid';

            return (
              <div key={payment.id}>
                <div
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
                    <StatusBadge status={isOverdue ? 'overdue' : payment.status} />
                  </div>

                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
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

                  {payment.notes && <p className="mt-1 text-sm text-gray-400">{payment.notes}</p>}

                  {/* Pay button for unpaid payments */}
                  {canPay && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowQR(showQR === payment.id ? null : payment.id);
                      }}
                      className={`mt-3 min-h-[44px] w-full rounded-lg px-4 py-2.5 text-sm font-medium ${
                        isOverdue
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {showQR === payment.id ? t('payments.hide_qr') : t('payments.pay_now')}
                    </button>
                  )}
                </div>

                {/* PromptPay QR Section */}
                {showQR === payment.id && (
                  <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <div className="text-center">
                      {/* PromptPay primary */}
                      <div className="mb-4">
                        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-600 px-3 py-1">
                          <span className="text-xs font-bold text-white">PromptPay</span>
                        </div>
                        {payment.promptpay_ref ? (
                          <>
                            {/* QR placeholder - shows PromptPay reference as scannable text */}
                            <div className="mx-auto mb-3 flex h-48 w-48 items-center justify-center rounded-lg border-2 border-dashed border-blue-300 bg-white">
                              <div className="text-center">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                  className="mx-auto mb-2 h-12 w-12 text-blue-400"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M3 4.875C3 3.839 3.84 3 4.875 3h4.5c1.036 0 1.875.84 1.875 1.875v4.5c0 1.036-.84 1.875-1.875 1.875h-4.5A1.875 1.875 0 013 9.375v-4.5zM4.875 4.5a.375.375 0 00-.375.375v4.5c0 .207.168.375.375.375h4.5a.375.375 0 00.375-.375v-4.5a.375.375 0 00-.375-.375h-4.5zM3 14.625c0-1.036.84-1.875 1.875-1.875h4.5c1.036 0 1.875.84 1.875 1.875v4.5c0 1.036-.84 1.875-1.875 1.875h-4.5A1.875 1.875 0 013 19.125v-4.5zM4.875 14.25a.375.375 0 00-.375.375v4.5c0 .207.168.375.375.375h4.5a.375.375 0 00.375-.375v-4.5a.375.375 0 00-.375-.375h-4.5zM12.75 4.875c0-1.036.84-1.875 1.875-1.875h4.5c1.036 0 1.875.84 1.875 1.875v4.5c0 1.036-.84 1.875-1.875 1.875h-4.5a1.875 1.875 0 01-1.875-1.875v-4.5zM14.625 4.5a.375.375 0 00-.375.375v4.5c0 .207.168.375.375.375h4.5a.375.375 0 00.375-.375v-4.5a.375.375 0 00-.375-.375h-4.5z"
                                    clipRule="evenodd"
                                  />
                                  <path d="M12.75 14.25a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H13.5a.75.75 0 01-.75-.75v-.008zM15.75 14.25a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H16.5a.75.75 0 01-.75-.75v-.008zM18.75 14.25a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H19.5a.75.75 0 01-.75-.75v-.008zM12.75 17.25a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H13.5a.75.75 0 01-.75-.75v-.008zM15.75 17.25a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H16.5a.75.75 0 01-.75-.75v-.008zM18.75 17.25a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H19.5a.75.75 0 01-.75-.75v-.008zM12.75 20.25a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H13.5a.75.75 0 01-.75-.75v-.008zM15.75 20.25a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H16.5a.75.75 0 01-.75-.75v-.008zM18.75 20.25a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H19.5a.75.75 0 01-.75-.75v-.008z" />
                                </svg>
                                <p className="text-xs text-blue-500">{t('payments.scan_qr')}</p>
                              </div>
                            </div>
                            <div className="rounded-lg bg-white px-3 py-2">
                              <p className="text-xs font-medium text-blue-700">
                                {t('payments.promptpay_ref')}
                              </p>
                              <p className="font-mono text-lg font-bold text-blue-900">
                                {payment.promptpay_ref}
                              </p>
                            </div>
                          </>
                        ) : (
                          <p className="text-sm text-gray-500">{t('payments.no_promptpay')}</p>
                        )}
                      </div>

                      {/* Bank transfer secondary */}
                      <div className="mb-3 border-t border-blue-200 pt-3">
                        <p className="mb-1 text-xs font-medium text-gray-600">
                          {t('payments.bank_transfer')}
                        </p>
                        <p className="text-xs text-gray-500">{t('payments.bank_transfer_desc')}</p>
                      </div>

                      {/* Amount reminder */}
                      <div className="rounded-lg bg-white px-4 py-2">
                        <p className="text-xs text-gray-500">{t('payments.amount')}</p>
                        <p className="text-xl font-bold text-gray-900">
                          ฿{payment.amount.toLocaleString()}
                        </p>
                      </div>

                      <p className="mt-3 text-xs text-gray-400">{t('payments.confirm_note')}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
