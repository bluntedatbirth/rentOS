'use client';

import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n/context';

interface RiskItem {
  clause_id: string;
  severity: 'low' | 'medium' | 'high';
  description_en: string;
  description_th: string;
}

interface MissingClause {
  title_en: string;
  title_th: string;
  recommendation_en: string;
  recommendation_th: string;
}

interface ClauseRating {
  clause_id: string;
  rating: string;
}

interface AnalysisData {
  risks: RiskItem[];
  missing_clauses: MissingClause[];
  summary_en: string;
  summary_th: string;
  clause_ratings: ClauseRating[];
  analyzed_at: string;
  from_cache?: boolean;
}

interface ContractAnalysisProps {
  contractId: string;
  showLang: 'th' | 'en';
}

const SEVERITY_STYLES: Record<string, { badge: string; dot: string } | undefined> = {
  high: { badge: 'bg-red-100 text-red-800 border border-red-200', dot: 'bg-red-500' },
  medium: { badge: 'bg-yellow-100 text-yellow-800 border border-yellow-200', dot: 'bg-yellow-500' },
  low: { badge: 'bg-green-100 text-green-800 border border-green-200', dot: 'bg-green-500' },
};
const DEFAULT_SEVERITY_STYLE = {
  badge:
    'bg-warm-100 dark:bg-white/5 text-charcoal-700 dark:text-white/70 border border-warm-200 dark:border-white/10',
  dot: 'bg-charcoal-400 dark:bg-white/40',
};

const RATING_STYLES: Record<string, string> = {
  standard: 'bg-blue-50 text-blue-700',
  favorable_landlord: 'bg-orange-50 text-orange-700',
  favorable_tenant: 'bg-green-50 text-green-700',
  unusual: 'bg-purple-50 text-purple-700',
};

// Client-side simulated progress: the analyze endpoint is a one-shot POST
// (no SSE), so we creep a faux progress bar while the request is in flight.
// Typical analyses take 20–60s; we ease toward 92% and never reach 100%
// until the response actually returns.
function useFakeProgress(active: boolean): { progress: number; label: string } {
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      setProgress(0);
      return;
    }
    setProgress(5);
    timerRef.current = setInterval(() => {
      setProgress((p) => {
        const cap = 92;
        if (p >= cap) return p;
        // Ease: close ~3% of remaining gap per tick
        return Math.min(cap, p + Math.max(0.3, (cap - p) * 0.03));
      });
    }, 500);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [active]);

  return {
    progress,
    label: progress < 30 ? 'reading' : progress < 70 ? 'assessing' : 'finalizing',
  };
}

export function ContractAnalysis({ contractId, showLang }: ContractAnalysisProps) {
  const { t } = useI18n();
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ran, setRan] = useState(false);
  const { progress: fakeProgress, label: fakeLabel } = useFakeProgress(loading);

  // Prefetch existing analysis on mount — if one already exists, show it
  // immediately and lock out any "run" affordances. Only one successful
  // run per contract is allowed; subsequent visits always serve cache.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/contracts/${contractId}/analyze/cached`, { method: 'GET' });
        if (!res.ok) return; // No cached analysis yet — leave UI in "not run" state
        const data = (await res.json()) as AnalysisData | null;
        if (data && !cancelled) {
          setAnalysis(data);
          setRan(true);
        }
      } catch {
        // Silent — user can still run manually
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contractId]);

  const runAnalysis = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/contracts/${contractId}/analyze`, { method: 'POST' });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        const code = body.error ?? '';
        // Map API error codes to friendly i18n strings rather than raw "internal_error"
        let friendly = t('ai_analysis.error_generic');
        if (code === 'ai_unavailable' || res.status === 429) {
          friendly = t('ai_analysis.error_rate_limit');
        } else if (res.status === 403) {
          friendly = t('ai_analysis.error_not_pro');
        }
        throw new Error(friendly);
      }
      const data = (await res.json()) as AnalysisData;
      setAnalysis(data);
      setRan(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('ai_analysis.error_generic'));
    } finally {
      setLoading(false);
    }
  };

  const highCount = analysis?.risks.filter((r) => r.severity === 'high').length ?? 0;
  const medCount = analysis?.risks.filter((r) => r.severity === 'medium').length ?? 0;
  const lowCount = analysis?.risks.filter((r) => r.severity === 'low').length ?? 0;

  return (
    <div className="rounded-xl border border-purple-200 dark:border-purple-500/30 bg-white dark:bg-charcoal-800 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between rounded-t-xl border-b border-purple-100 dark:border-purple-500/20 bg-purple-50 dark:bg-purple-900/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <h3 className="font-semibold text-charcoal-900 dark:text-purple-100">
            {t('ai_analysis.title')}
          </h3>
          <span className="rounded-full bg-purple-600 px-2 py-0.5 text-xs font-bold text-white">
            PRO
          </span>
        </div>
        {analysis && (
          <span className="text-xs text-charcoal-500 dark:text-purple-200/70">
            {analysis.from_cache ? t('ai_analysis.from_cache') : t('ai_analysis.fresh')}
          </span>
        )}
      </div>

      <div className="p-4">
        {/* Not yet run */}
        {!ran && !loading && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="max-w-xs text-sm text-charcoal-500 dark:text-white/50">
              {t('ai_analysis.description')}
            </p>
            <button
              type="button"
              onClick={runAnalysis}
              className="min-h-[44px] rounded-lg bg-purple-600 px-6 py-2 text-sm font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              {t('ai_analysis.run_button')}
            </button>
          </div>
        )}

        {/* Loading — progress bar matches the contract-upload style */}
        {loading && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600" />
            <p className="text-sm text-charcoal-500 dark:text-white/50">
              {t(`ai_analysis.progress_${fakeLabel}`) || t('ai_analysis.analyzing')}
            </p>
            <div className="w-full max-w-xs">
              <div className="mb-1.5 flex justify-between text-xs text-charcoal-400 dark:text-white/40">
                <span>{Math.round(fakeProgress)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-warm-200 dark:bg-charcoal-700">
                <div
                  className="h-full rounded-full bg-purple-500 transition-all duration-500 ease-out"
                  style={{ width: `${Math.round(fakeProgress)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-red-600">{error}</p>
            <button
              type="button"
              onClick={runAnalysis}
              className="min-h-[44px] rounded-lg border border-warm-300 dark:border-white/15 px-4 py-2 text-sm font-medium text-charcoal-700 dark:text-white/70 hover:bg-warm-50 dark:hover:bg-white/5"
            >
              {t('ai_analysis.retry')}
            </button>
          </div>
        )}

        {/* Results */}
        {analysis && !loading && (
          <div className="space-y-5">
            {/* Risk summary counters */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-red-50 p-3 text-center">
                <p className="text-2xl font-bold text-red-700">{highCount}</p>
                <p className="text-xs text-red-600">{t('ai_analysis.severity_high')}</p>
              </div>
              <div className="rounded-lg bg-yellow-50 p-3 text-center">
                <p className="text-2xl font-bold text-yellow-700">{medCount}</p>
                <p className="text-xs text-yellow-600">{t('ai_analysis.severity_medium')}</p>
              </div>
              <div className="rounded-lg bg-green-50 p-3 text-center">
                <p className="text-2xl font-bold text-green-700">{lowCount}</p>
                <p className="text-xs text-green-600">{t('ai_analysis.severity_low')}</p>
              </div>
            </div>

            {/* Smart summary */}
            <div className="rounded-lg bg-blue-50 p-4">
              <h4 className="mb-2 text-sm font-semibold text-blue-900">
                {t('ai_analysis.summary_title')}
              </h4>
              <p className="text-sm leading-relaxed text-blue-800">
                {showLang === 'th' ? analysis.summary_th : analysis.summary_en}
              </p>
            </div>

            {/* Risk cards */}
            {analysis.risks.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-charcoal-700 dark:text-white/70">
                  {t('ai_analysis.risks_title')}
                </h4>
                <div className="space-y-2">
                  {analysis.risks.map((risk, idx) => {
                    const styles = SEVERITY_STYLES[risk.severity] ?? DEFAULT_SEVERITY_STYLE;
                    return (
                      <div
                        key={idx}
                        className="flex items-start gap-3 rounded-lg border border-warm-100 dark:border-white/5 bg-warm-50 dark:bg-charcoal-900 p-3"
                      >
                        <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${styles.dot}`} />
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles.badge}`}
                            >
                              {risk.severity.toUpperCase()}
                            </span>
                            {risk.clause_id && risk.clause_id !== 'general' && (
                              <span className="text-xs text-charcoal-400 dark:text-white/40">
                                {t('ai_analysis.clause_ref')} {risk.clause_id}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-charcoal-700 dark:text-white/70">
                            {showLang === 'th' ? risk.description_th : risk.description_en}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Missing clauses */}
            {analysis.missing_clauses.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-charcoal-700 dark:text-white/70">
                  {t('ai_analysis.missing_title')}
                </h4>
                <div className="space-y-2">
                  {analysis.missing_clauses.map((mc, idx) => (
                    <div key={idx} className="rounded-lg border border-orange-100 bg-orange-50 p-3">
                      <p className="mb-1 text-sm font-medium text-orange-900">
                        {showLang === 'th' ? mc.title_th : mc.title_en}
                      </p>
                      <p className="text-xs text-orange-700">
                        {showLang === 'th' ? mc.recommendation_th : mc.recommendation_en}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Clause ratings */}
            {analysis.clause_ratings.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-charcoal-700 dark:text-white/70">
                  {t('ai_analysis.ratings_title')}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.clause_ratings.map((cr, idx) => (
                    <span
                      key={idx}
                      className={`rounded-full px-3 py-1 text-xs font-medium ${RATING_STYLES[cr.rating] ?? 'bg-warm-100 dark:bg-white/5 text-charcoal-600 dark:text-white/60'}`}
                    >
                      {cr.clause_id}: {t(`ai_analysis.rating_${cr.rating}`) || cr.rating}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Analysis is a one-shot per contract — no re-run button. The
                cached result is always served on subsequent visits. */}
          </div>
        )}
      </div>
    </div>
  );
}
