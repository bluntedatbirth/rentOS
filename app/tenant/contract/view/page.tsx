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
}

export default function TenantContractViewPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [originalClauses, setOriginalClauses] = useState<StructuredClause[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLang, setShowLang] = useState<'th' | 'en'>('th');

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
        'id, status, lease_start, lease_end, monthly_rent, security_deposit, structured_clauses, raw_text_th, renewed_from, renewal_changes, properties(name, address)';

      let c: ContractDetail | null = null;

      // Step 1: active
      const { data: activeData } = await supabase
        .from('contracts')
        .select(selectCols)
        .eq('tenant_id', user.id)
        .eq('status', 'active')
        .limit(1);
      c = (activeData?.[0] as unknown as ContractDetail) ?? null;

      // Step 2: awaiting_signature (if no active)
      if (!c) {
        const { data: awaitingData } = await supabase
          .from('contracts')
          .select(selectCols)
          .eq('tenant_id', user.id)
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
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1);
        c = (pendingData?.[0] as unknown as ContractDetail) ?? null;
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
    return <div className="py-12 text-center text-charcoal-500">{t('tenant.no_contract')}</div>;
  }

  const clauses = contract.structured_clauses ?? [];
  const isRenewalWithTextChanges = !!(
    contract.renewed_from && contract.renewal_changes?.contract_text
  );

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <h2 className="text-xl font-bold text-charcoal-900">{t('tenant.my_contract')}</h2>
        <StatusBadge status={contract.status} />
      </div>

      {/* Property info */}
      {contract.properties && (
        <div className="mb-4 rounded-lg bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-charcoal-900">{contract.properties.name}</p>
          {contract.properties.address && (
            <p className="mt-1 text-xs text-charcoal-500">{contract.properties.address}</p>
          )}
        </div>
      )}

      {/* Renewal notice — shows if this is a pending renewal offer */}
      <RenewalNotice contract={contract} onResponded={() => window.location.reload()} />

      {/* Contract summary */}
      <div className="mb-6 grid grid-cols-2 gap-4 rounded-lg bg-white p-4 shadow-sm sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-1">
          <p className="text-xs text-charcoal-500">{t('contract.lease_period')}</p>
          <p className="break-all text-sm font-medium text-charcoal-900">
            {contract.lease_start ?? '—'} → {contract.lease_end ?? '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-charcoal-500">{t('contract.monthly_rent')}</p>
          <p className="text-sm font-medium text-charcoal-900">
            {contract.monthly_rent ? `฿${contract.monthly_rent.toLocaleString()}` : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-charcoal-500">{t('contract.security_deposit')}</p>
          <p className="text-sm font-medium text-charcoal-900">
            {contract.security_deposit ? `฿${contract.security_deposit.toLocaleString()}` : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-charcoal-500">{t('contract.clauses')}</p>
          <p className="text-sm font-medium text-charcoal-900">{clauses.length}</p>
        </div>
      </div>

      {/* Language toggle */}
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setShowLang('th')}
          className={`min-h-[44px] rounded-lg px-4 py-2 text-sm font-medium ${
            showLang === 'th'
              ? 'bg-saffron-500 text-white'
              : 'bg-warm-100 text-charcoal-700 hover:bg-warm-200'
          }`}
        >
          {t('contract.thai')}
        </button>
        <button
          type="button"
          onClick={() => setShowLang('en')}
          className={`min-h-[44px] rounded-lg px-4 py-2 text-sm font-medium ${
            showLang === 'en'
              ? 'bg-saffron-500 text-white'
              : 'bg-warm-100 text-charcoal-700 hover:bg-warm-200'
          }`}
        >
          {t('contract.english')}
        </button>
      </div>

      {/* Clauses */}
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
                    {showLang === 'th' ? clause.title_th : clause.title_en}
                  </h3>
                  <p className="whitespace-pre-wrap text-sm text-charcoal-800">
                    {showLang === 'th' ? clause.text_th : clause.text_en}
                  </p>
                </div>
              );
            }

            // Normal clause card
            return (
              <ContractClauseCard key={clause.clause_id} clause={clause} showLang={showLang} />
            );
          })}
        </div>
      )}
    </div>
  );
}
