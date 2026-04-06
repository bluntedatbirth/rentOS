'use client';

import { useI18n } from '@/lib/i18n/context';
import type { StructuredClause } from '@/lib/supabase/types';

const categoryColors: Record<string, string> = {
  payment: 'bg-green-100 text-green-800',
  deposit: 'bg-blue-100 text-blue-800',
  maintenance: 'bg-purple-100 text-purple-800',
  pets: 'bg-orange-100 text-orange-800',
  subletting: 'bg-pink-100 text-pink-800',
  utilities: 'bg-cyan-100 text-cyan-800',
  noise: 'bg-yellow-100 text-yellow-800',
  penalties: 'bg-amber-100 text-amber-800',
  renewal: 'bg-indigo-100 text-indigo-800',
  termination: 'bg-red-100 text-red-800',
  other: 'bg-gray-100 text-gray-800',
};

interface ContractClauseCardProps {
  clause: StructuredClause;
  showLang: 'th' | 'en';
}

export function ContractClauseCard({ clause, showLang }: ContractClauseCardProps) {
  const { t } = useI18n();

  return (
    <div
      className={`rounded-lg bg-white p-4 shadow-sm ${
        clause.penalty_defined ? 'ring-2 ring-amber-300' : ''
      }`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-gray-400">{clause.clause_id.toUpperCase()}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            categoryColors[clause.category] ?? categoryColors.other
          }`}
        >
          {clause.category}
        </span>
        {clause.penalty_defined && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
            {t('contract.penalty_defined')}
            {clause.penalty_amount ? ` ฿${clause.penalty_amount.toLocaleString()}` : ''}
          </span>
        )}
      </div>
      <h3 className="mb-1 text-sm font-semibold text-gray-900">
        {showLang === 'th' ? clause.title_th : clause.title_en}
      </h3>
      <p className="whitespace-pre-wrap text-sm text-gray-600">
        {showLang === 'th' ? clause.text_th : clause.text_en}
      </p>
    </div>
  );
}
