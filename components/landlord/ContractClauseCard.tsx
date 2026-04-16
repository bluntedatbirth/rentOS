'use client';

import { useI18n } from '@/lib/i18n/context';
import type { StructuredClause } from '@/lib/supabase/types';

const categoryColors: Record<string, string> = {
  payment: 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400',
  deposit: 'bg-saffron-100 text-saffron-800 dark:bg-saffron-500/15 dark:text-saffron-300',
  maintenance: 'bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-300',
  pets: 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300',
  subletting: 'bg-pink-100 text-pink-800 dark:bg-pink-500/15 dark:text-pink-300',
  utilities: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-300',
  noise: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-300',
  penalties: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400',
  renewal: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300',
  termination: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400',
  other: 'bg-warm-200 text-charcoal-800 dark:bg-white/5 dark:text-white/90',
};

interface ContractClauseCardProps {
  clause: StructuredClause;
  showLang: 'th' | 'en';
  onRaisePenalty?: (clause: StructuredClause) => void;
}

export function ContractClauseCard({ clause, showLang, onRaisePenalty }: ContractClauseCardProps) {
  const { t } = useI18n();

  return (
    <div
      className={`rounded-lg bg-white p-4 shadow-sm dark:bg-charcoal-800 dark:shadow-black/20 ${
        clause.penalty_defined ? 'ring-2 ring-amber-300 dark:ring-amber-500/40' : ''
      }`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-charcoal-400 dark:text-white/40">
          {clause.clause_id.toUpperCase()}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            categoryColors[clause.category] ?? categoryColors.other
          }`}
        >
          {t(`contract.category.${clause.category}`)}
        </span>
        {clause.penalty_defined && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-400">
            {t('contract.penalty_defined')}
            {clause.penalty_amount ? ` ฿${clause.penalty_amount.toLocaleString()}` : ''}
          </span>
        )}
      </div>
      <span className="text-xs text-charcoal-500 italic dark:text-white/50">
        {t('contract.ai_parsed_label')}
      </span>
      <h3 className="mb-1 text-sm font-semibold text-charcoal-900 dark:text-white">
        {showLang === 'th' ? clause.title_th : clause.title_en}
      </h3>
      <p className="whitespace-pre-wrap text-sm text-charcoal-600 dark:text-white/60">
        {showLang === 'th' ? clause.text_th : clause.text_en}
      </p>
      {onRaisePenalty && clause.penalty_defined && (
        <button
          type="button"
          onClick={() => onRaisePenalty(clause)}
          className="mt-3 min-h-[44px] rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
        >
          {t('penalties.raise_from_clause')}
        </button>
      )}
    </div>
  );
}
