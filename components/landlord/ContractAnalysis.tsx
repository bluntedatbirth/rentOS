'use client';

import { useState } from 'react';
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
  badge: 'bg-gray-100 text-gray-700 border border-gray-200',
  dot: 'bg-gray-400',
};

const RATING_STYLES: Record<string, string> = {
  standard: 'bg-blue-50 text-blue-700',
  favorable_landlord: 'bg-orange-50 text-orange-700',
  favorable_tenant: 'bg-green-50 text-green-700',
  unusual: 'bg-purple-50 text-purple-700',
};

export function ContractAnalysis({ contractId, showLang }: ContractAnalysisProps) {
  const { t } = useI18n();
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ran, setRan] = useState(false);

  const runAnalysis = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/contracts/${contractId}/analyze`, { method: 'POST' });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? 'Analysis failed');
      }
      const data = (await res.json()) as AnalysisData;
      setAnalysis(data);
      setRan(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const highCount = analysis?.risks.filter((r) => r.severity === 'high').length ?? 0;
  const medCount = analysis?.risks.filter((r) => r.severity === 'medium').length ?? 0;
  const lowCount = analysis?.risks.filter((r) => r.severity === 'low').length ?? 0;

  return (
    <div className="rounded-xl border border-purple-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between rounded-t-xl border-b border-purple-100 bg-purple-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <h3 className="font-semibold text-gray-900">{t('ai_analysis.title')}</h3>
          <span className="rounded-full bg-purple-600 px-2 py-0.5 text-xs font-bold text-white">
            PRO
          </span>
        </div>
        {analysis && (
          <span className="text-xs text-gray-500">
            {analysis.from_cache ? t('ai_analysis.from_cache') : t('ai_analysis.fresh')}
          </span>
        )}
      </div>

      <div className="p-4">
        {/* Not yet run */}
        {!ran && !loading && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="max-w-xs text-sm text-gray-500">{t('ai_analysis.description')}</p>
            <button
              type="button"
              onClick={runAnalysis}
              className="min-h-[44px] rounded-lg bg-purple-600 px-6 py-2 text-sm font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              {t('ai_analysis.run_button')}
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600" />
            <p className="text-sm text-gray-500">{t('ai_analysis.analyzing')}</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-red-600">{error}</p>
            <button
              type="button"
              onClick={runAnalysis}
              className="min-h-[44px] rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
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
                <h4 className="mb-2 text-sm font-semibold text-gray-700">
                  {t('ai_analysis.risks_title')}
                </h4>
                <div className="space-y-2">
                  {analysis.risks.map((risk, idx) => {
                    const styles = SEVERITY_STYLES[risk.severity] ?? DEFAULT_SEVERITY_STYLE;
                    return (
                      <div
                        key={idx}
                        className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3"
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
                              <span className="text-xs text-gray-400">
                                {t('ai_analysis.clause_ref')} {risk.clause_id}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700">
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
                <h4 className="mb-2 text-sm font-semibold text-gray-700">
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
                <h4 className="mb-2 text-sm font-semibold text-gray-700">
                  {t('ai_analysis.ratings_title')}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.clause_ratings.map((cr, idx) => (
                    <span
                      key={idx}
                      className={`rounded-full px-3 py-1 text-xs font-medium ${RATING_STYLES[cr.rating] ?? 'bg-gray-100 text-gray-600'}`}
                    >
                      {cr.clause_id}: {t(`ai_analysis.rating_${cr.rating}`) || cr.rating}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Re-run */}
            <div className="flex justify-end border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={runAnalysis}
                className="min-h-[44px] rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                {t('ai_analysis.re_run')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
