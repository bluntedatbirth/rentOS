'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';
import { useToast } from '@/components/ui/ToastProvider';
import { createClient } from '@/lib/supabase/client';
import { PdfPreview } from '@/components/landlord/PdfPreview';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { ProRibbon } from '@/components/ui/ProRibbon';
import type { StructuredClause } from '@/lib/supabase/types';

const supabase = createClient();

interface ContractData {
  id: string;
  property_id: string;
  tenant_id: string | null;
  landlord_id: string;
  lease_start: string | null;
  lease_end: string | null;
  monthly_rent: number | null;
  security_deposit: number | null;
  structured_clauses: StructuredClause[] | null;
  raw_text_th: string | null;
  translated_text_en: string | null;
  status: string;
  properties: { name: string } | null;
}

interface AnalysisResult {
  risks: Array<{
    clause_id: string;
    severity: 'low' | 'medium' | 'high';
    description_en: string;
    description_th: string;
    suggested_text_th: string | null;
    suggested_text_en: string | null;
  }>;
  missing_clauses: Array<{
    title_en: string;
    title_th: string;
    clause_text_en: string;
    clause_text_th: string;
    reason_en: string;
    reason_th: string;
  }>;
  summary_en: string;
  summary_th: string;
}

/** Add one year to a yyyy-mm-dd string */
function addYears(dateStr: string, years: number): string {
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

type ContractLang = 'th' | 'en' | 'bilingual';

/** Detect the language format of the contract from its structured clauses */
function detectContractLang(contract: ContractData): ContractLang {
  const clauses = contract.structured_clauses;
  if (!clauses || clauses.length === 0) {
    if (contract.raw_text_th && contract.translated_text_en) return 'bilingual';
    if (contract.translated_text_en && !contract.raw_text_th) return 'en';
    return 'th';
  }
  const hasTh = clauses.some((c) => c.text_th?.trim());
  const hasEn = clauses.some((c) => c.text_en?.trim());
  if (hasTh && hasEn) return 'bilingual';
  if (hasEn) return 'en';
  return 'th';
}

function reconstructContractText(contract: ContractData, lang: ContractLang): string {
  if (contract.structured_clauses && contract.structured_clauses.length > 0) {
    return contract.structured_clauses
      .map((c) => {
        if (lang === 'th') return `[${c.clause_id}] ${c.title_th}\n${c.text_th}`;
        if (lang === 'en') return `[${c.clause_id}] ${c.title_en}\n${c.text_en}`;
        return `[${c.clause_id}] ${c.title_th}\n${c.text_th}\n\n${c.title_en}\n${c.text_en}`;
      })
      .join('\n\n---\n\n');
  }
  if (lang === 'en') return contract.translated_text_en ?? '';
  if (lang === 'th') return contract.raw_text_th ?? '';
  // bilingual fallback
  const th = contract.raw_text_th ?? '';
  const en = contract.translated_text_en ?? '';
  return th && en ? `${th}\n\n---\n\n${en}` : th || en;
}

const SEVERITY_STYLES: Record<
  'high' | 'medium' | 'low',
  { card: string; badge: string; dot: string }
> = {
  high: {
    card: 'border-red-200 bg-red-50',
    badge: 'bg-red-100 text-red-800 border border-red-200',
    dot: 'bg-red-500',
  },
  medium: {
    card: 'border-yellow-200 bg-yellow-50',
    badge: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    dot: 'bg-yellow-500',
  },
  low: {
    card: 'border-green-200 bg-green-50',
    badge: 'bg-green-100 text-green-800 border border-green-200',
    dot: 'bg-green-500',
  },
};

export default function ContractRenewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const { toast } = useToast();

  // Contract loading
  const [contract, setContract] = useState<ContractData | null>(null);
  const [contractLang, setContractLang] = useState<ContractLang>('bilingual');
  const [loading, setLoading] = useState(true);

  // Form state
  const [leaseStart, setLeaseStart] = useState('');
  const [leaseEnd, setLeaseEnd] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [securityDeposit, setSecurityDeposit] = useState('');
  const [contractText, setContractText] = useState('');

  // AI analysis state
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  // Maps clause index → appended text (for undo support)
  const [addedClauses, setAddedClauses] = useState<Map<number, string>>(new Map());
  // Maps risk index → original clause text before fix was applied (for undo)
  const [appliedFixes, setAppliedFixes] = useState<Map<number, string>>(new Map());
  // Track which clause rating button is currently flashing (for scroll-to animation)
  const [flashingClause, setFlashingClause] = useState<string | null>(null);

  // Ref for the contract textarea (used for scroll-to-clause)
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Send state
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [sendError, setSendError] = useState('');

  // Mobile preview toggle
  const [showPreview, setShowPreview] = useState(false);
  // Terms editing toggle — collapsed (summary) by default
  const [editingTerms, setEditingTerms] = useState(false);

  // Load contract on mount
  useEffect(() => {
    if (!user || !id) return;
    const load = async () => {
      const { data } = await supabase
        .from('contracts')
        .select(
          'id, property_id, tenant_id, landlord_id, lease_start, lease_end, monthly_rent, security_deposit, structured_clauses, raw_text_th, translated_text_en, status, properties(name)'
        )
        .eq('id', id)
        .single();

      if (data) {
        const c = data as ContractData;
        setContract(c);

        const lang = detectContractLang(c);
        setContractLang(lang);

        // Default dates: exact 1-year extension from previous contract
        // New start = previous end, new end = previous end + 1 year
        const today = new Date().toISOString().slice(0, 10);
        const _prevStart = c.lease_start ?? today;
        const prevEnd = c.lease_end ?? addYears(today, 1);
        const defaultStart = prevEnd;
        const defaultEnd = addYears(prevEnd, 1);

        setLeaseStart(defaultStart);
        setLeaseEnd(defaultEnd);
        setMonthlyRent(c.monthly_rent?.toString() ?? '');
        setSecurityDeposit(c.security_deposit?.toString() ?? '');
        setContractText(reconstructContractText(c, lang));
      }
      setLoading(false);
    };
    load();
  }, [user, id]);

  const runAnalysis = useCallback(async () => {
    setAnalysisLoading(true);
    setAnalysisError('');
    try {
      const res = await fetch(`/api/contracts/${id}/analyze`, { method: 'POST' });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? 'Analysis failed');
      }
      const data = (await res.json()) as AnalysisResult;
      setAnalysis(data);
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setAnalysisLoading(false);
    }
  }, [id]);

  const addClauseToContract = useCallback(
    (mc: AnalysisResult['missing_clauses'][number], idx: number) => {
      const ncLabel = `NC${idx + 1}`;
      // Build clause text matching the contract's language format
      let appended: string;
      if (contractLang === 'th') {
        appended = `\n\n---\n\n[${ncLabel}] ${mc.title_th}\n${mc.clause_text_th}`;
      } else if (contractLang === 'en') {
        appended = `\n\n---\n\n[${ncLabel}] ${mc.title_en}\n${mc.clause_text_en}`;
      } else {
        appended = `\n\n---\n\n[${ncLabel}] ${mc.title_th}\n${mc.clause_text_th}\n\n${mc.title_en}\n${mc.clause_text_en}`;
      }
      setContractText((prev) => prev + appended);
      setAddedClauses((prev) => {
        const next = new Map(prev);
        next.set(idx, appended);
        return next;
      });

      // Scroll textarea to the bottom where the clause was appended
      setTimeout(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          textarea.focus();
          const text = textarea.value;
          const pos = text.lastIndexOf(`[${ncLabel}]`);
          if (pos !== -1) {
            textarea.setSelectionRange(pos, text.length);
            textarea.scrollTop = textarea.scrollHeight;
          }
        }, 400);
      }, 100);
    },
    [contractLang]
  );

  const undoClause = useCallback((idx: number) => {
    setAddedClauses((prev) => {
      const appended = prev.get(idx);
      if (appended === undefined) return prev;
      setContractText((text) => {
        const pos = text.lastIndexOf(appended);
        if (pos === -1) return text;
        return text.slice(0, pos) + text.slice(pos + appended.length);
      });
      const next = new Map(prev);
      next.delete(idx);
      return next;
    });
  }, []);

  /** Scroll the textarea to show the clause matching clauseId and flash the button */
  const scrollToClause = useCallback((clauseId: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const text = textarea.value;
    const textLower = text.toLowerCase();
    const idLower = clauseId.toLowerCase();
    // Search for [c5] bracket format first, then fallback patterns
    const searchTerms = [
      `[${idLower}]`,
      idLower,
      idLower.replace(/^c(\d+)$/, 'ข้อ $1'),
      idLower.replace(/^c(\d+)$/, 'clause $1'),
    ];

    let found = -1;
    for (const term of searchTerms) {
      const idx = textLower.indexOf(term);
      if (idx !== -1) {
        found = idx;
        break;
      }
    }

    if (found !== -1) {
      // Scroll the textarea element into view first (for mobile)
      textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Small delay so the scroll-into-view finishes before we focus
      setTimeout(() => {
        textarea.focus();
        // Find end of the section (next "---" separator or end of text)
        const nextSep = text.indexOf('\n\n---\n\n', found);
        const end = nextSep !== -1 ? nextSep : text.length;
        textarea.setSelectionRange(found, end);

        // Scroll textarea internally so the found position is visible
        const lineHeight = 20;
        const linesBefore = text.slice(0, found).split('\n').length - 1;
        textarea.scrollTop = Math.max(0, linesBefore * lineHeight - 60);
      }, 400);
    }

    // Flash the clause badge
    setFlashingClause(clauseId);
    setTimeout(() => setFlashingClause(null), 1200);
  }, []);

  /** Apply a suggested fix: replace the clause's text in the contract */
  const applyRiskFix = useCallback(
    (risk: AnalysisResult['risks'][number], riskIdx: number) => {
      if (!risk.suggested_text_th && !risk.suggested_text_en) return;
      if (risk.clause_id === 'general') return;

      // Find the clause in structured_clauses to get the original text
      const clause = contract?.structured_clauses?.find(
        (c) => c.clause_id.toLowerCase() === risk.clause_id.toLowerCase()
      );
      if (!clause) return;

      // Guard: required text fields must be present
      if (contractLang === 'th' && !clause.text_th) {
        toast.error(t('renewal.apply_fix_clause_missing'));
        return;
      }
      if (contractLang === 'en' && !clause.text_en) {
        toast.error(t('renewal.apply_fix_clause_missing'));
        return;
      }
      if (
        contractLang === 'bilingual' &&
        (!clause.text_th || !clause.text_en || !clause.title_en)
      ) {
        toast.error(t('renewal.apply_fix_clause_missing'));
        return;
      }

      // Build the original clause body based on contract language
      let originalBody: string;
      let replacementBody: string;
      if (contractLang === 'th') {
        originalBody = clause.text_th;
        replacementBody = risk.suggested_text_th ?? clause.text_th;
      } else if (contractLang === 'en') {
        originalBody = clause.text_en;
        replacementBody = risk.suggested_text_en ?? clause.text_en;
      } else {
        originalBody = `${clause.text_th}\n\n${clause.title_en}\n${clause.text_en}`;
        const newTh = risk.suggested_text_th ?? clause.text_th;
        const newEn = risk.suggested_text_en ?? clause.text_en;
        replacementBody = `${newTh}\n\n${clause.title_en}\n${newEn}`;
      }

      // Save original for undo
      setAppliedFixes((fixes) => {
        const next = new Map(fixes);
        next.set(riskIdx, originalBody);
        return next;
      });

      // Replace in contract text — guard against clause not found in current text
      setContractText((prev) => {
        const pos = prev.indexOf(originalBody);
        if (pos === -1) {
          toast.error(t('renewal.apply_fix_not_found'));
          return prev;
        }
        return prev.slice(0, pos) + replacementBody + prev.slice(pos + originalBody.length);
      });

      // Scroll to the updated clause
      setTimeout(() => scrollToClause(risk.clause_id), 200);
    },
    [contract, contractLang, scrollToClause, t, toast]
  );

  /** Undo a previously applied risk fix */
  const undoRiskFix = useCallback(
    (risk: AnalysisResult['risks'][number], riskIdx: number) => {
      const originalBody = appliedFixes.get(riskIdx);
      if (!originalBody) return;

      const clause = contract?.structured_clauses?.find(
        (c) => c.clause_id.toLowerCase() === risk.clause_id.toLowerCase()
      );
      if (!clause) return;

      setContractText((prev) => {
        // Build current replacement text to find and revert
        let currentReplacement: string;
        if (contractLang === 'th') {
          currentReplacement = risk.suggested_text_th ?? clause.text_th;
        } else if (contractLang === 'en') {
          currentReplacement = risk.suggested_text_en ?? clause.text_en;
        } else {
          const newTh = risk.suggested_text_th ?? clause.text_th;
          const newEn = risk.suggested_text_en ?? clause.text_en;
          currentReplacement = `${newTh}\n\n${clause.title_en}\n${newEn}`;
        }

        const pos = prev.indexOf(currentReplacement);
        if (pos === -1) return prev;
        return prev.slice(0, pos) + originalBody + prev.slice(pos + currentReplacement.length);
      });

      setAppliedFixes((fixes) => {
        const next = new Map(fixes);
        next.delete(riskIdx);
        return next;
      });
    },
    [appliedFixes, contract, contractLang]
  );

  const handleSend = useCallback(async () => {
    setSending(true);
    setSendError('');
    try {
      const res = await fetch(`/api/contracts/${id}/renew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lease_start: leaseStart,
          lease_end: leaseEnd,
          monthly_rent: monthlyRent ? parseFloat(monthlyRent) : null,
          security_deposit: securityDeposit ? parseFloat(securityDeposit) : null,
          contract_text: contractText,
        }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? 'Failed to send');
      }
      setSentSuccess(true);
      setTimeout(() => {
        router.push(`/landlord/contracts/${id}`);
      }, 1500);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSending(false);
    }
  }, [id, leaseStart, leaseEnd, monthlyRent, securityDeposit, contractText, router]);

  if (loading) return <LoadingSkeleton count={6} />;

  if (!contract) {
    return (
      <div className="py-12 text-center text-charcoal-500 dark:text-white/50">
        {t('contract.not_found')}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Page header */}
      <div className="mb-6">
        <Link
          href={`/landlord/contracts/${id}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-charcoal-500 dark:text-white/50 hover:text-charcoal-700 dark:hover:text-white/70"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="h-3.5 w-3.5"
          >
            <path
              fillRule="evenodd"
              d="M9.78 4.22a.75.75 0 010 1.06L7.06 8l2.72 2.72a.75.75 0 11-1.06 1.06L5.22 8.53a.75.75 0 010-1.06l3.5-3.5a.75.75 0 011.06 0z"
              clipRule="evenodd"
            />
          </svg>
          {t('nav.contracts')}
        </Link>
        <h1 className="text-xl font-bold text-charcoal-900 dark:text-white">
          {t('renewal.editor_title')}
          {contract.properties?.name && (
            <span className="ml-2 text-base font-normal text-charcoal-500 dark:text-white/50">
              — {contract.properties.name}
            </span>
          )}
        </h1>
      </div>

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* ── Editor panel ── */}
        <div className="min-w-0 space-y-6">
          {/* Terms section — summary by default, expandable to edit */}
          <div className="rounded-xl bg-white dark:bg-charcoal-800 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-charcoal-800 dark:text-white/90">
                {t('renewal.lease_period')}
              </h2>
              <button
                type="button"
                onClick={() => setEditingTerms(!editingTerms)}
                className="text-xs font-medium text-saffron-600 hover:text-saffron-800"
              >
                {editingTerms ? t('renewal.hide_terms') : t('renewal.edit_terms')}
              </button>
            </div>

            {/* Summary view */}
            {!editingTerms && (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-charcoal-500 dark:text-white/50">
                    {t('renewal.new_lease_start')}
                  </p>
                  <p className="font-medium text-charcoal-900 dark:text-white">
                    {leaseStart || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-charcoal-500 dark:text-white/50">
                    {t('renewal.new_lease_end')}
                  </p>
                  <p className="font-medium text-charcoal-900 dark:text-white">{leaseEnd || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-charcoal-500 dark:text-white/50">
                    {t('renewal.new_rent')}
                  </p>
                  <p className="font-medium text-charcoal-900 dark:text-white">
                    {monthlyRent ? `฿${Number(monthlyRent).toLocaleString()}` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-charcoal-500 dark:text-white/50">
                    {t('renewal.new_deposit')}
                  </p>
                  <p className="font-medium text-charcoal-900 dark:text-white">
                    {securityDeposit ? `฿${Number(securityDeposit).toLocaleString()}` : '—'}
                  </p>
                </div>
              </div>
            )}

            {/* Editable form — only when expanded */}
            {editingTerms && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-charcoal-600 dark:text-white/60">
                    {t('renewal.new_lease_start')}
                  </label>
                  <input
                    type="date"
                    value={leaseStart}
                    onChange={(e) => setLeaseStart(e.target.value)}
                    className="w-full rounded-lg border border-warm-300 dark:border-white/15 bg-white dark:bg-charcoal-800 dark:text-white px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-charcoal-600 dark:text-white/60">
                    {t('renewal.new_lease_end')}
                  </label>
                  <input
                    type="date"
                    value={leaseEnd}
                    onChange={(e) => setLeaseEnd(e.target.value)}
                    className="w-full rounded-lg border border-warm-300 dark:border-white/15 bg-white dark:bg-charcoal-800 dark:text-white px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-charcoal-600 dark:text-white/60">
                    {t('renewal.new_rent')}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-charcoal-500 dark:text-white/50">
                      ฿
                    </span>
                    <input
                      type="number"
                      value={monthlyRent}
                      onChange={(e) => setMonthlyRent(e.target.value)}
                      min="0"
                      className="w-full rounded-lg border border-warm-300 dark:border-white/15 bg-white dark:bg-charcoal-800 dark:text-white py-2 pl-7 pr-3 text-sm focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-charcoal-600 dark:text-white/60">
                    {t('renewal.new_deposit')}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-charcoal-500 dark:text-white/50">
                      ฿
                    </span>
                    <input
                      type="number"
                      value={securityDeposit}
                      onChange={(e) => setSecurityDeposit(e.target.value)}
                      min="0"
                      className="w-full rounded-lg border border-warm-300 dark:border-white/15 bg-white dark:bg-charcoal-800 dark:text-white py-2 pl-7 pr-3 text-sm focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* AI Analysis section */}
          <div className="rounded-xl bg-white dark:bg-charcoal-800 shadow-sm">
            <div className="flex items-center justify-between rounded-t-xl border-b border-warm-100 dark:border-white/5 px-5 py-3">
              <h2 className="text-sm font-semibold text-charcoal-800 dark:text-white/90">
                {t('renewal.risks_title')}
              </h2>
              <button
                type="button"
                onClick={() => {
                  runAnalysis();
                }}
                disabled={analysisLoading}
                className="relative overflow-hidden min-h-[44px] rounded-lg bg-saffron-500 px-4 py-2 pr-6 text-sm font-medium text-white hover:bg-saffron-600 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:ring-offset-2"
              >
                {analysisLoading ? t('renewal.analysis_loading') : t('renewal.run_analysis')}
                <ProRibbon size="sm" />
              </button>
            </div>

            <div className="p-5">
              {/* Loading spinner */}
              {analysisLoading && (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <div className="h-7 w-7 animate-spin rounded-full border-4 border-saffron-200 border-t-blue-600" />
                  <p className="text-sm text-charcoal-500 dark:text-white/50">
                    {t('renewal.analysis_loading')}
                  </p>
                </div>
              )}

              {/* Error */}
              {analysisError && !analysisLoading && (
                <p className="text-sm text-red-600">{analysisError}</p>
              )}

              {/* Idle placeholder */}
              {!analysis && !analysisLoading && !analysisError && (
                <p className="text-sm text-charcoal-400 dark:text-white/40">
                  {t('renewal.analysis_hint')}
                </p>
              )}

              {/* Results */}
              {analysis && !analysisLoading && (
                <div className="space-y-5">
                  {/* AI Summary */}
                  <div className="rounded-lg bg-saffron-50 p-4">
                    <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-saffron-800">
                      {t('renewal.summary_title')}
                    </h3>
                    <p className="text-sm leading-relaxed text-saffron-900">
                      {locale === 'th' ? analysis.summary_th : analysis.summary_en}
                    </p>
                  </div>

                  {/* Risks */}
                  {analysis.risks.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-charcoal-600 dark:text-white/60">
                        {t('renewal.risks_title')}
                      </h3>
                      <div className="space-y-3">
                        {analysis.risks.map((risk, idx) => {
                          const styles = SEVERITY_STYLES[risk.severity] ?? SEVERITY_STYLES.low;
                          const severityLabel =
                            risk.severity === 'high'
                              ? t('renewal.severity_high')
                              : risk.severity === 'medium'
                                ? t('renewal.severity_medium')
                                : t('renewal.severity_low');
                          const isClauseFlashing = flashingClause === risk.clause_id;
                          const hasSuggestion = risk.suggested_text_th || risk.suggested_text_en;
                          const isApplied = appliedFixes.has(idx);
                          const suggestedPreview =
                            locale === 'th'
                              ? (risk.suggested_text_th ?? risk.suggested_text_en ?? '')
                              : (risk.suggested_text_en ?? risk.suggested_text_th ?? '');
                          return (
                            <div key={idx} className={`rounded-lg border p-3 ${styles.card}`}>
                              <div className="flex items-start gap-3">
                                <span
                                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${styles.dot}`}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => scrollToClause(risk.clause_id)}
                                      className={`rounded-full px-2 py-0.5 text-xs font-semibold transition-all duration-150 bg-warm-100 dark:bg-white/5 text-charcoal-700 dark:text-white/70 ${isClauseFlashing ? 'scale-110 ring-2 ring-offset-1 ring-current' : ''}`}
                                    >
                                      {risk.clause_id}
                                    </button>
                                    <span
                                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles.badge}`}
                                    >
                                      {severityLabel}
                                    </span>
                                  </div>
                                  <p className="text-sm text-charcoal-700 dark:text-white/70">
                                    {locale === 'th' ? risk.description_th : risk.description_en}
                                  </p>
                                </div>
                              </div>
                              {/* Suggested fix */}
                              {hasSuggestion && risk.clause_id !== 'general' && (
                                <div className="mt-2 ml-5">
                                  <div className="rounded-md border border-warm-200 dark:border-white/10 bg-white dark:bg-charcoal-800 p-2.5">
                                    <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-charcoal-400 dark:text-white/40">
                                      {t('renewal.suggested_fix')}
                                    </p>
                                    <p className="whitespace-pre-wrap text-xs leading-relaxed text-charcoal-700 dark:text-white/70">
                                      {suggestedPreview.slice(0, 200)}
                                      {suggestedPreview.length > 200 ? '…' : ''}
                                    </p>
                                  </div>
                                  <div className="mt-2 flex flex-wrap items-center gap-2">
                                    {isApplied ? (
                                      <>
                                        <span className="rounded-lg border border-teal-300 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700">
                                          ✓ {t('renewal.fix_applied')}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => undoRiskFix(risk, idx)}
                                          className="min-h-[44px] rounded-lg border border-warm-300 dark:border-white/15 bg-white dark:bg-charcoal-800 px-3 py-1.5 text-xs font-medium text-charcoal-600 dark:text-white/60 hover:bg-warm-100 dark:hover:bg-white/10"
                                        >
                                          {t('renewal.undo')}
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => applyRiskFix(risk, idx)}
                                        className="min-h-[44px] rounded-lg bg-saffron-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-saffron-600"
                                      >
                                        {t('renewal.apply_fix')}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Missing clauses */}
                  {analysis.missing_clauses.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-charcoal-600 dark:text-white/60">
                        {t('renewal.missing_title')}
                      </h3>
                      <div className="space-y-3">
                        {analysis.missing_clauses.map((mc, idx) => (
                          <div
                            key={idx}
                            className="rounded-lg border border-orange-100 bg-orange-50 p-3"
                          >
                            <div className="mb-1.5 flex items-center gap-2">
                              <span className="rounded-full bg-orange-200 px-2 py-0.5 text-xs font-bold text-orange-800">
                                NC{idx + 1}
                              </span>
                              <p className="text-sm font-semibold text-orange-900">
                                {mc.title_th} / {mc.title_en}
                              </p>
                            </div>
                            <p className="mb-2 text-xs italic text-orange-600">
                              {locale === 'th' ? mc.reason_th : mc.reason_en}
                            </p>
                            {/* Preview of actual clause text that will be inserted */}
                            <div className="mb-2 rounded-md border border-orange-200 bg-white p-2.5">
                              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-charcoal-400 dark:text-white/40">
                                {t('renewal.clause_preview')}
                              </p>
                              <p className="whitespace-pre-wrap text-xs leading-relaxed text-charcoal-700 dark:text-white/70">
                                {(locale === 'th' ? mc.clause_text_th : mc.clause_text_en)?.slice(
                                  0,
                                  200
                                ) ?? ''}
                                {(locale === 'th' ? mc.clause_text_th : mc.clause_text_en)?.length >
                                200
                                  ? '…'
                                  : ''}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {addedClauses.has(idx) ? (
                                <>
                                  <span className="rounded-lg border border-teal-300 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700">
                                    ✓ {t('renewal.clause_added')} — {t('renewal.added_at_end')}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => undoClause(idx)}
                                    className="min-h-[44px] rounded-lg border border-warm-300 dark:border-white/15 bg-white dark:bg-charcoal-800 px-3 py-1.5 text-xs font-medium text-charcoal-600 dark:text-white/60 hover:bg-warm-100 dark:hover:bg-white/10"
                                  >
                                    {t('renewal.undo')}
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => addClauseToContract(mc, idx)}
                                  className="min-h-[44px] rounded-lg border border-orange-300 bg-white px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100"
                                >
                                  {t('renewal.add_clause')}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Contract text editor */}
          <div className="rounded-xl bg-white dark:bg-charcoal-800 shadow-sm">
            <div className="border-b border-warm-100 dark:border-white/5 px-5 py-3">
              <h2 className="text-sm font-semibold text-charcoal-800 dark:text-white/90">
                {t('renewal.contract_text')}
              </h2>
            </div>
            <div className="p-5">
              <textarea
                ref={textareaRef}
                value={contractText}
                onChange={(e) => setContractText(e.target.value)}
                rows={20}
                className="w-full resize-y rounded-lg border border-warm-300 dark:border-white/15 bg-white dark:bg-charcoal-800 p-3 font-mono text-sm leading-relaxed text-charcoal-800 dark:text-white/90 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
                spellCheck={false}
              />
            </div>
          </div>

          {/* Send to Tenant */}
          <div className="rounded-xl bg-white dark:bg-charcoal-800 p-5 shadow-sm">
            {sendError && <p className="mb-3 text-sm text-red-600">{sendError}</p>}
            {sentSuccess && (
              <p className="mb-3 text-sm font-medium text-green-700">{t('renewal.sent_success')}</p>
            )}
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || sentSuccess}
              className="min-h-[44px] w-full rounded-xl bg-saffron-500 px-6 py-3 text-sm font-semibold text-white hover:bg-saffron-600 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:ring-offset-2"
            >
              {sending ? t('renewal.sending') : t('renewal.send_to_tenant')}
            </button>
          </div>
        </div>

        {/* ── Desktop PDF preview panel ── */}
        <div className="hidden xl:block xl:self-start xl:sticky xl:top-4">
          <PdfPreview contractText={contractText} />
        </div>
      </div>

      {/* Mobile preview toggle */}
      <div className="mt-6 xl:hidden">
        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          className="min-h-[44px] w-full rounded-xl border border-warm-300 dark:border-white/15 bg-white dark:bg-charcoal-800 px-4 py-2 text-sm font-medium text-charcoal-700 dark:text-white/70 hover:bg-warm-50 dark:hover:bg-white/5"
        >
          {showPreview ? t('renewal.hide_preview') : t('renewal.show_preview')}
        </button>
        {showPreview && (
          <div className="mt-4 h-[600px]">
            <PdfPreview contractText={contractText} />
          </div>
        )}
      </div>
    </div>
  );
}
