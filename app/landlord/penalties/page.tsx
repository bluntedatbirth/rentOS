'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';
import { useToast } from '@/components/ui/ToastProvider';
import { createClient } from '@/lib/supabase/client';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import Link from 'next/link';

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

interface Contract {
  id: string;
  property_id: string;
  structured_clauses: StructuredClause[] | null;
  properties?: { name: string } | null;
  monthly_rent?: number | null;
  lease_start?: string | null;
  lease_end?: string | null;
}

interface StructuredClause {
  clause_id: string;
  penalty_defined: boolean;
  penalty_amount?: number;
  penalty_description?: string;
  thai_text?: string;
  english_text?: string;
  title_th?: string;
  title_en?: string;
  text_th?: string;
  text_en?: string;
}

interface CalculationResult {
  calculated_amount: number;
  calculation_basis_th: string;
  calculation_basis_en: string;
  severity: 'minor' | 'moderate' | 'severe';
}

const STATUS_ORDER: Record<string, number> = {
  pending_landlord_review: 0,
  appeal_under_review: 1,
  pending_tenant_appeal: 2,
  confirmed: 3,
  resolved: 4,
  waived: 5,
};

type FilterTab = 'all' | 'pending' | 'confirmed' | 'appealed' | 'resolved' | 'waived';

const FILTER_STATUS_MAP: Record<FilterTab, string[]> = {
  all: [],
  pending: ['pending_landlord_review'],
  confirmed: ['confirmed'],
  appealed: ['pending_tenant_appeal', 'appeal_under_review'],
  resolved: ['resolved'],
  waived: ['waived'],
};

export default function LandlordPenaltiesPage() {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [contractMap, setContractMap] = useState<Record<string, Contract>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // Filter tab state
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  // Modal workflow state
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState<1 | 2 | 3>(1);
  const [formContractId, setFormContractId] = useState('');
  const [formClauseId, setFormClauseId] = useState('');
  const [violationDesc, setViolationDesc] = useState('');
  const [calculating, setCalculating] = useState(false);
  const [calcResult, setCalcResult] = useState<CalculationResult | null>(null);
  const [editedAmount, setEditedAmount] = useState('');
  const [raising, setRaising] = useState(false);

  // Appeal resolution state
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveAction, setResolveAction] = useState<'uphold' | 'reduce' | 'waive' | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [reduceAmount, setReduceAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;

    const { data: contractsData } = await supabase
      .from('contracts')
      .select(
        'id, property_id, structured_clauses, monthly_rent, lease_start, lease_end, properties(name)'
      )
      .eq('landlord_id', user.id);

    const contractsList = (contractsData ?? []) as unknown as Contract[];
    setContracts(contractsList);

    const cMap: Record<string, Contract> = {};
    contractsList.forEach((c) => {
      cMap[c.id] = c;
    });
    setContractMap(cMap);

    if (contractsList.length === 0) {
      setLoading(false);
      return;
    }

    const contractIds = contractsList.map((c) => c.id);
    const { data: penaltiesData } = await supabase
      .from('penalties')
      .select('*')
      .in('contract_id', contractIds)
      .order('created_at', { ascending: false });

    const sorted = ((penaltiesData ?? []) as Penalty[]).sort((a, b) => {
      const orderA = STATUS_ORDER[a.status] ?? 99;
      const orderB = STATUS_ORDER[b.status] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    setPenalties(sorted);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle query params from contract page
  useEffect(() => {
    const contractId = searchParams.get('contract_id');
    const clauseId = searchParams.get('clause_id');
    if (contractId && clauseId) {
      setFormContractId(contractId);
      setFormClauseId(clauseId);
      setShowModal(true);
      setModalStep(1);
    }
  }, [searchParams]);

  const penaltyClauses = (() => {
    if (!formContractId) return [];
    const contract = contractMap[formContractId];
    if (!contract?.structured_clauses) return [];
    return contract.structured_clauses.filter((c) => c.penalty_defined);
  })();

  const resetModal = () => {
    setShowModal(false);
    setModalStep(1);
    setFormContractId('');
    setFormClauseId('');
    setViolationDesc('');
    setCalculating(false);
    setCalcResult(null);
    setEditedAmount('');
    setRaising(false);
  };

  const handleCalculate = async () => {
    if (!formContractId || !formClauseId || !violationDesc.trim()) return;
    setError('');
    setCalculating(true);
    setModalStep(2);

    try {
      const res = await fetch('/api/penalties/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract_id: formContractId,
          clause_id: formClauseId,
          violation_description: violationDesc,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? t('auth.error'));
        setModalStep(1);
      } else {
        const result: CalculationResult = await res.json();
        setCalcResult(result);
        setEditedAmount(String(result.calculated_amount));
        setModalStep(3);
      }
    } catch {
      setError(t('auth.error'));
      setModalStep(1);
    }

    setCalculating(false);
  };

  const handleConfirmRaise = async () => {
    if (!calcResult || !formContractId || !formClauseId) return;
    setError('');
    setRaising(true);

    const amount = Number(editedAmount);
    if (isNaN(amount) || amount < 0) {
      setError(t('penalties.invalid_amount'));
      setRaising(false);
      return;
    }

    const res = await fetch('/api/penalties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contract_id: formContractId,
        clause_id: formClauseId,
        calculated_amount: amount,
        description_th: calcResult.calculation_basis_th,
        description_en: calcResult.calculation_basis_en,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? t('auth.error'));
      toast.error(t('auth.error'));
    } else {
      resetModal();
      toast.success(t('penalties.raised_success'));
      await loadData();
    }

    setRaising(false);
  };

  const handleAction = async (penaltyId: string, action: 'confirm' | 'waive') => {
    setError('');
    setSubmitting(true);

    const res = await fetch(`/api/penalties/${penaltyId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? t('auth.error'));
      toast.error(t('auth.error'));
    } else {
      toast.success(t('penalties.action_success'));
      await loadData();
    }

    setSubmitting(false);
  };

  const handleAppealResolve = async (penaltyId: string) => {
    if (!resolveAction) return;
    setError('');
    setSubmitting(true);

    let body: Record<string, unknown> = {};

    if (resolveAction === 'uphold') {
      body = {
        action: 'resolve',
        landlord_resolution_note: resolutionNote || t('penalties.uphold_default_note'),
      };
    } else if (resolveAction === 'reduce') {
      const amt = Number(reduceAmount);
      if (isNaN(amt) || amt < 0) {
        setError(t('penalties.invalid_amount'));
        setSubmitting(false);
        return;
      }
      body = {
        action: 'resolve',
        confirmed_amount: amt,
        landlord_resolution_note: resolutionNote || t('penalties.reduce_default_note'),
      };
    } else if (resolveAction === 'waive') {
      body = {
        action: 'waive',
        landlord_resolution_note: resolutionNote || t('penalties.waive_default_note'),
      };
    }

    const res = await fetch(`/api/penalties/${penaltyId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? t('auth.error'));
      toast.error(t('auth.error'));
    } else {
      setResolvingId(null);
      setResolveAction(null);
      setResolutionNote('');
      setReduceAmount('');
      toast.success(t('penalties.appeal_resolved'));
      await loadData();
    }

    setSubmitting(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    const visible =
      activeFilter === 'all'
        ? penalties
        : penalties.filter((p) => FILTER_STATUS_MAP[activeFilter].includes(p.status));
    setSelectedIds(new Set(visible.map((p) => p.id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkAction = async (action: 'resolve' | 'waive') => {
    if (selectedIds.size === 0) return;
    setBulkSubmitting(true);
    setError('');

    const res = await fetch('/api/bulk/penalties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ids: Array.from(selectedIds) }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.reason ?? data.error ?? t('auth.error'));
      toast.error(t('auth.error'));
    } else {
      const data = await res.json();
      toast.success(t('bulk.action_success').replace('{count}', String(data.updated ?? 0)));
      clearSelection();
      await loadData();
    }

    setBulkSubmitting(false);
  };

  if (loading) return <LoadingSkeleton count={4} />;

  const getPropertyName = (contractId: string) => {
    const contract = contractMap[contractId];
    return contract?.properties?.name ?? contractId.slice(0, 8);
  };

  // Filter penalties
  const filteredPenalties =
    activeFilter === 'all'
      ? penalties
      : penalties.filter((p) => FILTER_STATUS_MAP[activeFilter].includes(p.status));

  // Count badges
  const statusCounts: Record<FilterTab, number> = {
    all: penalties.length,
    pending: penalties.filter((p) => FILTER_STATUS_MAP.pending.includes(p.status)).length,
    confirmed: penalties.filter((p) => FILTER_STATUS_MAP.confirmed.includes(p.status)).length,
    appealed: penalties.filter((p) => FILTER_STATUS_MAP.appealed.includes(p.status)).length,
    resolved: penalties.filter((p) => FILTER_STATUS_MAP.resolved.includes(p.status)).length,
    waived: penalties.filter((p) => FILTER_STATUS_MAP.waived.includes(p.status)).length,
  };

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: t('penalties.filter_all') },
    { key: 'pending', label: t('penalties.filter_pending') },
    { key: 'confirmed', label: t('penalties.filter_confirmed') },
    { key: 'appealed', label: t('penalties.filter_appealed') },
    { key: 'resolved', label: t('penalties.filter_resolved') },
    { key: 'waived', label: t('penalties.filter_waived') },
  ];

  const severityColors: Record<string, string> = {
    minor: 'bg-yellow-100 text-yellow-800',
    moderate: 'bg-orange-100 text-orange-800',
    severe: 'bg-red-100 text-red-800',
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{t('penalties.title')}</h2>
        <div className="flex items-center gap-2">
          <Link
            href="/landlord/penalties/rules"
            className="min-h-[44px] rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            {t('penalty_rules.nav_label')}
          </Link>
          <button
            type="button"
            onClick={() => {
              resetModal();
              setShowModal(true);
            }}
            className="min-h-[44px] rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {t('penalties.raise')}
          </button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      {/* Status filter tabs */}
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
            {statusCounts[tab.key] > 0 && (
              <span
                className={`ml-1.5 inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-bold ${
                  activeFilter === tab.key ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {statusCounts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Modal overlay */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">{t('penalties.raise')}</h3>
              <button
                type="button"
                onClick={resetModal}
                aria-label={t('common.cancel')}
                className="min-h-[44px] min-w-[44px] rounded-lg text-gray-400 hover:text-gray-600"
              >
                &times;
              </button>
            </div>

            {/* Step 1: Select contract, clause, describe violation */}
            {modalStep === 1 && (
              <div>
                {/* Contract select */}
                <div className="mb-3">
                  <label
                    htmlFor="pen-contract"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    {t('payments.select_contract')}
                  </label>
                  <select
                    id="pen-contract"
                    value={formContractId}
                    onChange={(e) => {
                      setFormContractId(e.target.value);
                      setFormClauseId('');
                    }}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">{t('payments.select_contract')}</option>
                    {contracts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.properties?.name ?? c.id.slice(0, 8)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Clause select */}
                {formContractId && (
                  <div className="mb-3">
                    <label
                      htmlFor="pen-clause"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      {t('penalties.select_clause')}
                    </label>
                    {penaltyClauses.length === 0 ? (
                      <p className="text-sm text-gray-500">{t('penalties.no_penalty_clauses')}</p>
                    ) : (
                      <select
                        id="pen-clause"
                        value={formClauseId}
                        onChange={(e) => setFormClauseId(e.target.value)}
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">{t('penalties.select_clause')}</option>
                        {penaltyClauses.map((c) => (
                          <option key={c.clause_id} value={c.clause_id}>
                            {c.clause_id.toUpperCase()} -{' '}
                            {c.thai_text?.slice(0, 60) ??
                              c.text_th?.slice(0, 60) ??
                              c.english_text?.slice(0, 60) ??
                              c.text_en?.slice(0, 60) ??
                              ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {/* Violation description */}
                {formClauseId && (
                  <div className="mb-4">
                    <label
                      htmlFor="pen-violation"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      {t('penalties.violation_description')}
                    </label>
                    <textarea
                      id="pen-violation"
                      value={violationDesc}
                      onChange={(e) => setViolationDesc(e.target.value)}
                      rows={4}
                      maxLength={5000}
                      placeholder={t('penalties.violation_placeholder')}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCalculate}
                    disabled={!formContractId || !formClauseId || !violationDesc.trim()}
                    className="min-h-[44px] rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {t('penalties.calculate')}
                  </button>
                  <button
                    type="button"
                    onClick={resetModal}
                    className="min-h-[44px] rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Loading / Calculating */}
            {modalStep === 2 && calculating && (
              <div className="flex flex-col items-center py-8">
                <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
                <p className="text-sm text-gray-600">{t('penalties.calculating')}</p>
              </div>
            )}

            {/* Step 3: Show results */}
            {modalStep === 3 && calcResult && (
              <div>
                {/* Severity badge */}
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">
                    {t('penalties.severity')}:
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      severityColors[calcResult.severity] ?? 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {calcResult.severity === 'minor'
                      ? t('penalties.severity_minor')
                      : calcResult.severity === 'moderate'
                        ? t('penalties.severity_moderate')
                        : t('penalties.severity_severe')}
                  </span>
                </div>

                {/* AI calculated amount */}
                <div className="mb-4 rounded-lg bg-blue-50 p-4">
                  <p className="mb-1 text-xs font-medium text-blue-700">
                    {t('penalties.ai_calculated')}
                  </p>
                  <p className="text-2xl font-bold text-blue-900">
                    &#3647;{calcResult.calculated_amount.toLocaleString()}
                  </p>
                </div>

                {/* Calculation basis */}
                <div className="mb-4">
                  <p className="mb-1 text-sm font-medium text-gray-700">
                    {t('penalties.calculation_basis')}
                  </p>
                  <p className="text-sm text-gray-600">
                    {locale === 'th'
                      ? calcResult.calculation_basis_th
                      : calcResult.calculation_basis_en}
                  </p>
                </div>

                {/* Editable amount */}
                <div className="mb-4">
                  <label
                    htmlFor="pen-edit-amount"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    {t('penalties.edit_amount')} (&#3647;)
                  </label>
                  <input
                    id="pen-edit-amount"
                    type="number"
                    min="0"
                    value={editedAmount}
                    onChange={(e) => setEditedAmount(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleConfirmRaise}
                    disabled={raising || !editedAmount}
                    className="min-h-[44px] rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {raising ? t('penalties.raising') : t('penalties.confirm_raise')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalStep(1)}
                    className="min-h-[44px] rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    {t('common.back')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bulk select bar */}
      {filteredPenalties.length > 0 && (
        <div className="mb-3 flex items-center gap-3">
          <button
            type="button"
            onClick={selectedIds.size > 0 ? clearSelection : selectAll}
            className="min-h-[44px] rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            {selectedIds.size > 0 ? t('bulk.deselect_all') : t('bulk.select_all')}
          </button>
          {selectedIds.size > 0 && (
            <span className="text-sm text-gray-500">
              {t('bulk.selected_count').replace('{count}', String(selectedIds.size))}
            </span>
          )}
        </div>
      )}

      {/* Penalties list */}
      {filteredPenalties.length === 0 ? (
        <div className="rounded-lg bg-gray-50 p-8 text-center text-sm text-gray-500">
          {t('penalties.no_penalties')}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPenalties.map((p) => {
            const amount = p.confirmed_amount ?? p.calculated_amount ?? 0;
            const desc = locale === 'th' ? p.description_th : p.description_en;
            const isPendingReview = p.status === 'pending_landlord_review';
            const isAppealReview =
              p.status === 'appeal_under_review' || p.status === 'pending_tenant_appeal';
            const isSelected = selectedIds.has(p.id);

            return (
              <div
                key={p.id}
                className={`rounded-lg bg-white p-4 shadow-sm transition-colors ${
                  isSelected ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={() => toggleSelect(p.id)}
                      aria-label={isSelected ? t('bulk.deselect') : t('bulk.select')}
                      className={`min-h-[24px] min-w-[24px] rounded border-2 transition-colors ${
                        isSelected
                          ? 'border-blue-600 bg-blue-600'
                          : 'border-gray-300 bg-white hover:border-blue-400'
                      } flex items-center justify-center`}
                    >
                      {isSelected && (
                        <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                          <path
                            d="M2 6l3 3 5-5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </button>
                    <StatusBadge status={p.status} />
                    {amount > 0 && (
                      <span className="text-sm font-medium text-red-600">
                        &#3647;{amount.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(p.created_at).toLocaleDateString()}
                  </span>
                </div>

                <p className="mt-1 text-xs text-gray-500">{getPropertyName(p.contract_id)}</p>

                {desc && <p className="mt-2 text-sm text-gray-600">{desc}</p>}

                <p className="mt-1 text-xs text-gray-400">
                  {t('contract.clause')}: {p.clause_id.toUpperCase()}
                </p>

                {/* Tenant appeal note */}
                {p.tenant_appeal_note && (
                  <div className="mt-3 rounded-lg bg-blue-50 p-3">
                    <p className="text-xs font-medium text-blue-700">{t('tenant.your_appeal')}</p>
                    <p className="mt-1 text-sm text-blue-900">{p.tenant_appeal_note}</p>
                  </div>
                )}

                {/* Landlord resolution note */}
                {p.landlord_resolution_note && (
                  <div className="mt-2 rounded-lg bg-green-50 p-3">
                    <p className="text-xs font-medium text-green-700">
                      {t('penalties.resolution_note')}
                    </p>
                    <p className="mt-1 text-sm text-green-900">{p.landlord_resolution_note}</p>
                  </div>
                )}

                {/* Actions for pending_landlord_review */}
                {isPendingReview && (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleAction(p.id, 'confirm')}
                      disabled={submitting}
                      className="min-h-[44px] rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {t('penalties.confirm')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAction(p.id, 'waive')}
                      disabled={submitting}
                      className="min-h-[44px] rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                    >
                      {t('penalties.waive')}
                    </button>
                  </div>
                )}

                {/* Appeal resolution: Uphold / Reduce / Waive */}
                {isAppealReview && (
                  <>
                    {resolvingId === p.id ? (
                      <div className="mt-3 space-y-3">
                        {/* Action buttons */}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setResolveAction('uphold')}
                            className={`min-h-[44px] rounded-lg px-4 py-2 text-sm font-medium ${
                              resolveAction === 'uphold'
                                ? 'bg-green-600 text-white'
                                : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {t('penalties.uphold')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setResolveAction('reduce')}
                            className={`min-h-[44px] rounded-lg px-4 py-2 text-sm font-medium ${
                              resolveAction === 'reduce'
                                ? 'bg-orange-600 text-white'
                                : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {t('penalties.reduce')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setResolveAction('waive')}
                            className={`min-h-[44px] rounded-lg px-4 py-2 text-sm font-medium ${
                              resolveAction === 'waive'
                                ? 'bg-red-600 text-white'
                                : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {t('penalties.waive')}
                          </button>
                        </div>

                        {/* Reduce amount input */}
                        {resolveAction === 'reduce' && (
                          <div>
                            <label
                              htmlFor="pen-reduce-amount"
                              className="mb-1 block text-sm font-medium text-gray-700"
                            >
                              {t('penalties.reduce_amount')} (&#3647;)
                            </label>
                            <input
                              id="pen-reduce-amount"
                              type="number"
                              min="0"
                              value={reduceAmount}
                              onChange={(e) => setReduceAmount(e.target.value)}
                              className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        )}

                        {/* Resolution note */}
                        {resolveAction && (
                          <>
                            <textarea
                              value={resolutionNote}
                              onChange={(e) => setResolutionNote(e.target.value)}
                              rows={3}
                              maxLength={2000}
                              placeholder={t('penalties.resolution_placeholder')}
                              className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleAppealResolve(p.id)}
                                disabled={
                                  submitting || (resolveAction === 'reduce' && !reduceAmount)
                                }
                                className="min-h-[44px] rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                              >
                                {t('penalties.resolve')}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setResolvingId(null);
                                  setResolveAction(null);
                                  setResolutionNote('');
                                  setReduceAmount('');
                                }}
                                className="min-h-[44px] rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                              >
                                {t('common.cancel')}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setResolvingId(p.id);
                          setResolveAction(null);
                          setResolutionNote('');
                          setReduceAmount('');
                        }}
                        className="mt-3 min-h-[44px] rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                      >
                        {t('penalties.resolve')}
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Floating bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg px-4 py-3 safe-area-inset-bottom">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <span className="text-sm font-medium text-gray-700">
              {t('bulk.selected_count').replace('{count}', String(selectedIds.size))}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleBulkAction('resolve')}
                disabled={bulkSubmitting}
                className="min-h-[44px] rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {t('bulk.resolve_selected')}
              </button>
              <button
                type="button"
                onClick={() => handleBulkAction('waive')}
                disabled={bulkSubmitting}
                className="min-h-[44px] rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                {t('bulk.waive_selected')}
              </button>
              <button
                type="button"
                onClick={clearSelection}
                aria-label={t('common.cancel')}
                className="min-h-[44px] min-w-[44px] rounded-lg text-gray-400 hover:text-gray-600"
              >
                &times;
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
