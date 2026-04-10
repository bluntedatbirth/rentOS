'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';
import { useToast } from '@/components/ui/ToastProvider';
import { createClient } from '@/lib/supabase/client';
import { StatusBadge } from '@/components/ui/StatusBadge';

import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

const supabase = createClient();

interface Penalty {
  id: string;
  contract_id: string;
  clause_id: string;
  description_th: string | null;
  description_en: string | null;
  calculated_amount: number | null;
  confirmed_amount: number | null;
  status: string;
  tenant_appeal_note: string | null;
  landlord_resolution_note: string | null;
  created_at: string;
}

export default function TenantPenaltiesPage() {
  const { user } = useAuth();
  const { t, locale, formatDate } = useI18n();
  const { toast } = useToast();
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [loading, setLoading] = useState(true);
  const [appealingId, setAppealingId] = useState<string | null>(null);
  const [appealNote, setAppealNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    if (!user) return;

    // Find tenant's active contract
    const { data: contracts } = await supabase
      .from('contracts')
      .select('id')
      .eq('tenant_id', user.id)
      .eq('status', 'active')
      .limit(1);

    const cid = (contracts?.[0] as { id: string } | undefined)?.id;
    if (!cid) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('penalties')
      .select('*')
      .eq('contract_id', cid)
      .order('created_at', { ascending: false });

    setPenalties((data ?? []) as Penalty[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAppeal = async (penaltyId: string) => {
    setError('');
    setSubmitting(true);

    const res = await fetch(`/api/penalties/${penaltyId}/appeal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_appeal_note: appealNote }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? t('auth.error'));
      toast.error(t('auth.error'));
    } else {
      setAppealingId(null);
      setAppealNote('');
      toast.success(t('penalties.appeal_submitted'));
      await loadData();
    }

    setSubmitting(false);
  };

  if (loading) return <LoadingSkeleton count={3} />;

  const canAppeal = (status: string) =>
    status === 'confirmed' || status === 'pending_landlord_review';

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="mb-6 text-xl font-bold text-charcoal-900">{t('tenant.penalties_title')}</h2>

      {penalties.length === 0 ? (
        <div className="rounded-lg bg-warm-50 p-8 text-center text-sm text-charcoal-500">
          {t('tenant.no_penalties')}
        </div>
      ) : (
        <div className="space-y-3">
          {penalties.map((p) => {
            const amount = p.confirmed_amount ?? p.calculated_amount ?? 0;
            const desc = locale === 'th' ? p.description_th : p.description_en;

            return (
              <div key={p.id} className="rounded-lg bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={p.status} />
                    {amount > 0 && (
                      <span className="text-sm font-medium text-red-600">
                        ฿{amount.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-charcoal-400">{formatDate(p.created_at)}</span>
                </div>

                {desc && <p className="mt-2 text-sm text-charcoal-700">{desc}</p>}

                <p className="mt-1 text-xs text-charcoal-400">
                  {t('contract.clause')}: {p.clause_id.toUpperCase()}
                </p>

                {p.tenant_appeal_note && (
                  <div className="mt-3 rounded-lg bg-saffron-50 p-3">
                    <p className="text-xs font-medium text-saffron-700">
                      {t('tenant.your_appeal')}
                    </p>
                    <p className="mt-1 text-sm text-charcoal-900">{p.tenant_appeal_note}</p>
                  </div>
                )}

                {p.landlord_resolution_note && (
                  <div className="mt-2 rounded-lg bg-green-50 p-3">
                    <p className="text-xs font-medium text-green-700">
                      {t('tenant.landlord_response')}
                    </p>
                    <p className="mt-1 text-sm text-green-900">{p.landlord_resolution_note}</p>
                  </div>
                )}

                {/* Appeal button / form */}
                {canAppeal(p.status) && !p.tenant_appeal_note && (
                  <>
                    {appealingId === p.id ? (
                      <div className="mt-3">
                        <textarea
                          value={appealNote}
                          onChange={(e) => setAppealNote(e.target.value)}
                          rows={3}
                          maxLength={2000}
                          placeholder={t('tenant.appeal_placeholder')}
                          className="block w-full rounded-lg border border-warm-200 px-3 py-2.5 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
                        />
                        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleAppeal(p.id)}
                            disabled={submitting || !appealNote.trim()}
                            className="min-h-[44px] rounded-lg bg-saffron-500 px-4 py-2 text-sm font-medium text-white hover:bg-saffron-600 disabled:opacity-50"
                          >
                            {submitting ? t('common.loading') : t('tenant.submit_appeal')}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAppealingId(null);
                              setAppealNote('');
                            }}
                            className="min-h-[44px] rounded-lg border border-warm-200 px-4 py-2 text-sm font-medium text-charcoal-700 hover:bg-warm-100"
                          >
                            {t('common.cancel')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAppealingId(p.id)}
                        className="mt-3 min-h-[44px] rounded-lg border border-saffron-300 px-4 py-2 text-sm font-medium text-saffron-600 hover:bg-saffron-50"
                      >
                        {t('tenant.appeal_penalty')}
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
