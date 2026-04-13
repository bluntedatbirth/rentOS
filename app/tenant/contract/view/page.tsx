'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';
import { createClient } from '@/lib/supabase/client';
import { ContractClauseCard } from '@/components/landlord/ContractClauseCard';
import { useAutoDismissNotifications } from '@/lib/hooks/useAutoDismissNotifications';

const supabase = createClient();
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { RenewalNotice } from '@/components/tenant/RenewalNotice';
import type { StructuredClause } from '@/lib/supabase/types';
import { formatDisplayDate } from '@/lib/format/date';

interface ContractDetail {
  id: string;
  status: string;
  lease_start: string | null;
  lease_end: string | null;
  monthly_rent: number | null;
  security_deposit: number | null;
  structured_clauses: StructuredClause[] | null;
  raw_text_th: string | null;
  renewed_from: string | null;
  renewal_changes: Record<string, { old: unknown; new: unknown }> | null;
  properties: { name: string; address: string | null } | null;
  // Companion-app pivot: nullable when tenant created this row without a paired landlord
  landlord_id: string | null;
  property_name: string | null;
  due_day: number | null;
  notes: string | null;
}

interface AddLeaseForm {
  property_name: string;
  lease_start: string;
  lease_end: string;
  monthly_rent: string;
  due_day: string;
  notes: string;
}

export default function TenantContractViewPage() {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [originalClauses, setOriginalClauses] = useState<StructuredClause[] | null>(null);
  const [loading, setLoading] = useState(true);
  const clauseLang: 'th' | 'en' = locale === 'en' ? 'en' : 'th';

  // Add-lease modal state
  const [showAddLeaseModal, setShowAddLeaseModal] = useState(false);
  const [addLeaseForm, setAddLeaseForm] = useState<AddLeaseForm>({
    property_name: '',
    lease_start: '',
    lease_end: '',
    monthly_rent: '',
    due_day: '',
    notes: '',
  });
  const [addLeaseSubmitting, setAddLeaseSubmitting] = useState(false);
  const [addLeaseError, setAddLeaseError] = useState<string | null>(null);
  const [addLeaseSuccess, setAddLeaseSuccess] = useState(false);

  const handleAddLeaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLeaseSubmitting(true);
    setAddLeaseError(null);

    const body: Record<string, unknown> = {
      property_name: addLeaseForm.property_name,
    };
    if (addLeaseForm.lease_start) body.lease_start = addLeaseForm.lease_start;
    if (addLeaseForm.lease_end) body.lease_end = addLeaseForm.lease_end;
    if (addLeaseForm.monthly_rent) body.monthly_rent = Number(addLeaseForm.monthly_rent);
    if (addLeaseForm.due_day) body.due_day = Number(addLeaseForm.due_day);
    if (addLeaseForm.notes) body.notes = addLeaseForm.notes;

    try {
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setAddLeaseError((err as { error?: string }).error ?? 'Failed to save lease');
        setAddLeaseSubmitting(false);
        return;
      }

      setAddLeaseSuccess(true);
      setShowAddLeaseModal(false);
      // Reload to show the new contract
      window.location.reload();
    } catch {
      setAddLeaseError('Network error. Please try again.');
      setAddLeaseSubmitting(false);
    }
  };

  // Auto-dismiss renewal notifications when tenant visits contract view
  useAutoDismissNotifications({ types: ['lease_renewal_offer', 'lease_expiry'] });

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      // T-BUG-01: Prioritized multi-step query — active → awaiting_signature → pending
      // Prevents a newer pending-renewal row from shadowing the tenant's active contract.
      const selectCols =
        'id, status, lease_start, lease_end, monthly_rent, security_deposit, structured_clauses, raw_text_th, renewed_from, renewal_changes, landlord_id, property_name, due_day, notes, properties(name, address)';

      let c: ContractDetail | null = null;

      // Step 1: active (landlord-paired rows first — excludes tenant-owned rows via IS NOT NULL)
      const { data: activeData } = await supabase
        .from('contracts')
        .select(selectCols)
        .eq('tenant_id', user.id)
        .not('landlord_id', 'is', null)
        .eq('status', 'active')
        .limit(1);
      c = (activeData?.[0] as unknown as ContractDetail) ?? null;

      // Step 2: awaiting_signature (if no active paired)
      if (!c) {
        const { data: awaitingData } = await supabase
          .from('contracts')
          .select(selectCols)
          .eq('tenant_id', user.id)
          .not('landlord_id', 'is', null)
          .eq('status', 'awaiting_signature')
          .limit(1);
        c = (awaitingData?.[0] as unknown as ContractDetail) ?? null;
      }

      // Step 3: pending (if no active or awaiting_signature)
      if (!c) {
        const { data: pendingData } = await supabase
          .from('contracts')
          .select(selectCols)
          .eq('tenant_id', user.id)
          .not('landlord_id', 'is', null)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1);
        c = (pendingData?.[0] as unknown as ContractDetail) ?? null;
      }

      // Step 4: tenant-owned (no paired landlord) — companion-app pivot path.
      // Only falls through to this if there is no paired contract at all.
      if (!c) {
        const { data: tenantOwnedData } = await supabase
          .from('contracts')
          .select(selectCols)
          .eq('tenant_id', user.id)
          .is('landlord_id', null)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1);
        c = (tenantOwnedData?.[0] as unknown as ContractDetail) ?? null;
      }

      // T-BUG-05: Discard stale response if component unmounted or effect re-ran
      if (cancelled) return;

      setContract(c);

      // If this is a renewal with text changes, fetch original contract's structured clauses for comparison
      if (c?.renewed_from && c.renewal_changes?.contract_text) {
        const { data: origData } = await supabase
          .from('contracts')
          .select('structured_clauses')
          .eq('id', c.renewed_from)
          .single();
        const origClauses =
          (origData as unknown as { structured_clauses: StructuredClause[] | null })
            ?.structured_clauses ?? null;
        setOriginalClauses(origClauses);

        // Auto-reparse: if renewal's structured_clauses are identical to original
        // (created before reparse logic existed), trigger a reparse now
        const newClauses = c.structured_clauses ?? [];
        if (origClauses && newClauses.length > 0 && origClauses.length === newClauses.length) {
          const identical = newClauses.every(
            (nc, i) =>
              nc.clause_id === origClauses[i]?.clause_id && nc.text_th === origClauses[i]?.text_th
          );
          if (identical) {
            // Clauses are byte-for-byte identical — reparse in background
            fetch(`/api/contracts/${c.id}/reparse`, { method: 'POST' })
              .then((res) => (res.ok ? res.json() : null))
              .then((result) => {
                if (result?.success) {
                  // Reload to show fresh clauses
                  window.location.reload();
                }
              })
              .catch(() => {
                /* silent — non-critical */
              });
          }
        }
      }

      if (!cancelled) setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Build a map of original clause content by ID for per-clause diff comparison
  const originalClauseMap = useMemo(() => {
    if (!originalClauses) return null;
    const m = new Map<string, string>();
    for (const c of originalClauses) {
      // Use Thai text for comparison (canonical source)
      m.set(c.clause_id.toLowerCase(), c.text_th);
    }
    return m;
  }, [originalClauses]);

  if (loading) return <LoadingSkeleton count={4} />;

  if (!contract) {
    return (
      <div className="py-12 text-center">
        <p className="mb-6 text-charcoal-500">{t('tenant.no_contract')}</p>
        <button
          type="button"
          onClick={() => setShowAddLeaseModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-saffron-500 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-saffron-600 focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:ring-offset-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path
              fillRule="evenodd"
              d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
          {t('tenant.add_lease_button')}
        </button>

        {/* Add Lease Modal */}
        {showAddLeaseModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <h2 className="mb-4 text-lg font-bold text-charcoal-900">
                {t('tenant.add_lease_title')}
              </h2>
              <form onSubmit={handleAddLeaseSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-charcoal-700">
                    {t('tenant.add_lease_property_name')}
                    <span className="ml-1 text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={addLeaseForm.property_name}
                    onChange={(e) =>
                      setAddLeaseForm((f) => ({ ...f, property_name: e.target.value }))
                    }
                    className="w-full rounded-lg border border-warm-200 px-3 py-2 text-sm text-charcoal-900 focus:border-saffron-400 focus:outline-none focus:ring-1 focus:ring-saffron-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-charcoal-700">
                      {t('tenant.add_lease_start')}
                    </label>
                    <input
                      type="date"
                      value={addLeaseForm.lease_start}
                      onChange={(e) =>
                        setAddLeaseForm((f) => ({ ...f, lease_start: e.target.value }))
                      }
                      className="w-full rounded-lg border border-warm-200 px-3 py-2 text-sm text-charcoal-900 focus:border-saffron-400 focus:outline-none focus:ring-1 focus:ring-saffron-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-charcoal-700">
                      {t('tenant.add_lease_end')}
                    </label>
                    <input
                      type="date"
                      value={addLeaseForm.lease_end}
                      onChange={(e) =>
                        setAddLeaseForm((f) => ({ ...f, lease_end: e.target.value }))
                      }
                      className="w-full rounded-lg border border-warm-200 px-3 py-2 text-sm text-charcoal-900 focus:border-saffron-400 focus:outline-none focus:ring-1 focus:ring-saffron-400"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-charcoal-700">
                      {t('tenant.add_lease_rent')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={addLeaseForm.monthly_rent}
                      onChange={(e) =>
                        setAddLeaseForm((f) => ({ ...f, monthly_rent: e.target.value }))
                      }
                      className="w-full rounded-lg border border-warm-200 px-3 py-2 text-sm text-charcoal-900 focus:border-saffron-400 focus:outline-none focus:ring-1 focus:ring-saffron-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-charcoal-700">
                      {t('tenant.add_lease_due_day')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={addLeaseForm.due_day}
                      onChange={(e) => setAddLeaseForm((f) => ({ ...f, due_day: e.target.value }))}
                      className="w-full rounded-lg border border-warm-200 px-3 py-2 text-sm text-charcoal-900 focus:border-saffron-400 focus:outline-none focus:ring-1 focus:ring-saffron-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-charcoal-700">
                    {t('tenant.add_lease_notes')}
                  </label>
                  <textarea
                    rows={3}
                    value={addLeaseForm.notes}
                    onChange={(e) => setAddLeaseForm((f) => ({ ...f, notes: e.target.value }))}
                    className="w-full rounded-lg border border-warm-200 px-3 py-2 text-sm text-charcoal-900 focus:border-saffron-400 focus:outline-none focus:ring-1 focus:ring-saffron-400"
                  />
                </div>

                {addLeaseError && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                    {addLeaseError}
                  </p>
                )}
                {addLeaseSuccess && (
                  <p className="rounded-lg bg-sage-50 px-3 py-2 text-sm text-sage-700">
                    {t('tenant.add_lease_success')}
                  </p>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddLeaseModal(false)}
                    className="flex-1 rounded-lg border border-warm-200 px-4 py-2 text-sm font-medium text-charcoal-700 hover:bg-warm-50"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={addLeaseSubmitting}
                    className="flex-1 rounded-lg bg-saffron-500 px-4 py-2 text-sm font-semibold text-white hover:bg-saffron-600 disabled:opacity-50"
                  >
                    {addLeaseSubmitting ? '…' : t('tenant.add_lease_submit')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  const clauses = contract.structured_clauses ?? [];
  const isRenewalWithTextChanges = !!(
    contract.renewed_from && contract.renewal_changes?.contract_text
  );
  // Companion-app pivot: tenant-owned rows have no landlord — OCR/clauses are hidden.
  const isTenantOwned = contract.landlord_id === null;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <h2 className="text-xl font-bold text-charcoal-900">{t('tenant.my_contract')}</h2>
        <StatusBadge status={contract.status} />
      </div>

      {/* Property info — show from FK join (paired) or free-text property_name (tenant-owned) */}
      {contract.properties ? (
        <div className="mb-4 rounded-lg bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-charcoal-900">{contract.properties.name}</p>
          {contract.properties.address && (
            <p className="mt-1 text-xs text-charcoal-500">{contract.properties.address}</p>
          )}
        </div>
      ) : contract.property_name ? (
        <div className="mb-4 rounded-lg bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-charcoal-900">{contract.property_name}</p>
        </div>
      ) : null}

      {/* Renewal notice — shows if this is a pending renewal offer */}
      <RenewalNotice contract={contract} onResponded={() => window.location.reload()} />

      {/* Contract summary */}
      <div className="mb-6 grid grid-cols-2 gap-4 rounded-lg bg-white p-4 shadow-sm sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-1">
          <p className="text-xs text-charcoal-500">{t('contract.lease_period')}</p>
          <p className="break-all text-sm font-medium text-charcoal-900">
            {contract.lease_start ? formatDisplayDate(contract.lease_start) : '—'} →{' '}
            {contract.lease_end ? formatDisplayDate(contract.lease_end) : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-charcoal-500">{t('contract.monthly_rent')}</p>
          <p className="text-sm font-medium text-charcoal-900">
            {contract.monthly_rent ? `฿${contract.monthly_rent.toLocaleString()}` : '—'}
          </p>
        </div>
        {!isTenantOwned && (
          <div>
            <p className="text-xs text-charcoal-500">{t('contract.security_deposit')}</p>
            <p className="text-sm font-medium text-charcoal-900">
              {contract.security_deposit ? `฿${contract.security_deposit.toLocaleString()}` : '—'}
            </p>
          </div>
        )}
        {!isTenantOwned && (
          <div>
            <p className="text-xs text-charcoal-500">{t('contract.clauses')}</p>
            <p className="text-sm font-medium text-charcoal-900">{clauses.length}</p>
          </div>
        )}
        {isTenantOwned && contract.due_day && (
          <div>
            <p className="text-xs text-charcoal-500">{t('tenant.add_lease_due_day')}</p>
            <p className="text-sm font-medium text-charcoal-900">{contract.due_day}</p>
          </div>
        )}
      </div>

      {/* Tenant-owned notes */}
      {isTenantOwned && contract.notes && (
        <div className="mb-6 rounded-lg bg-white p-4 shadow-sm">
          <p className="text-xs text-charcoal-500">{t('tenant.add_lease_notes')}</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-charcoal-800">{contract.notes}</p>
        </div>
      )}

      {/* Extracted clauses — only for paired (landlord-uploaded) contracts */}
      {!isTenantOwned && (
        <>
          {/* Extracted clauses */}
          {clauses.length === 0 ? (
            <div className="rounded-lg bg-warm-50 p-8 text-center text-sm text-charcoal-500">
              {t('contract.no_clauses')}
            </div>
          ) : (
            <div className="space-y-3">
              {clauses.map((clause) => {
                // For renewals with text changes, highlight modified/new clauses
                const isNew =
                  isRenewalWithTextChanges && clause.clause_id.toLowerCase().startsWith('nc');
                const origText = originalClauseMap?.get(clause.clause_id.toLowerCase());
                const isChanged =
                  isRenewalWithTextChanges && originalClauseMap
                    ? origText === undefined
                      ? !isNew // clause ID not in original and not NC → modified
                      : origText.trim() !== clause.text_th.trim()
                    : false;
                const highlighted = isChanged || isNew;

                if (highlighted) {
                  // Render highlighted clause card with saffron styling
                  return (
                    <div
                      key={clause.clause_id}
                      className="rounded-lg bg-saffron-50 p-4 shadow-sm ring-2 ring-saffron-200"
                    >
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-saffron-700">
                          {clause.clause_id.toUpperCase()}
                        </span>
                        <span className="rounded-full bg-saffron-100 px-2 py-0.5 text-xs font-medium text-saffron-700">
                          {isNew ? t('renewal.new_clause') : t('renewal.modified_clause')}
                        </span>
                        {clause.category && (
                          <span className="rounded-full bg-saffron-100/50 px-2 py-0.5 text-xs font-medium text-saffron-600">
                            {clause.category}
                          </span>
                        )}
                      </div>
                      <h3 className="mb-1 text-sm font-semibold text-charcoal-900">
                        {clauseLang === 'en'
                          ? (clause.title_en ?? clause.title_th)
                          : clause.title_th}
                      </h3>
                      <p className="whitespace-pre-wrap text-sm text-charcoal-800">
                        {clauseLang === 'en' ? (clause.text_en ?? clause.text_th) : clause.text_th}
                      </p>
                    </div>
                  );
                }

                // Normal clause card
                return (
                  <ContractClauseCard
                    key={clause.clause_id}
                    clause={clause}
                    showLang={clauseLang}
                  />
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
