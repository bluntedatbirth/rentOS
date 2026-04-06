'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';
import { createClient } from '@/lib/supabase/client';
import { ContractClauseCard } from '@/components/landlord/ContractClauseCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import type { StructuredClause } from '@/lib/supabase/types';

interface ContractData {
  id: string;
  property_id: string;
  structured_clauses: StructuredClause[] | null;
  lease_start: string | null;
  lease_end: string | null;
  monthly_rent: number | null;
  security_deposit: number | null;
  status: string;
  created_at: string;
}

export default function ContractReviewPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { t } = useI18n();
  const [contract, setContract] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLang, setShowLang] = useState<'th' | 'en'>('th');

  const supabase = createClient();

  useEffect(() => {
    if (!user || !id) return;
    const load = async () => {
      const { data } = await supabase
        .from('contracts')
        .select(
          'id, property_id, structured_clauses, lease_start, lease_end, monthly_rent, security_deposit, status, created_at'
        )
        .eq('id', id)
        .single();
      setContract(data as ContractData | null);
      setLoading(false);
    };
    load();
  }, [user, id, supabase]);

  if (loading) return <LoadingSkeleton count={4} />;

  if (!contract) {
    return <div className="py-12 text-center text-gray-500">Contract not found</div>;
  }

  const clauses = contract.structured_clauses ?? [];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/landlord/dashboard"
            className="mb-2 inline-block text-sm text-blue-600 hover:text-blue-800"
          >
            ← {t('common.back')}
          </Link>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900">{t('contract.review_title')}</h2>
            <StatusBadge status={contract.status} />
          </div>
        </div>
      </div>

      {/* Contract summary */}
      <div className="mb-6 grid grid-cols-2 gap-4 rounded-lg bg-white p-4 shadow-sm sm:grid-cols-4">
        <div>
          <p className="text-xs text-gray-500">{t('contract.lease_period')}</p>
          <p className="text-sm font-medium text-gray-900">
            {contract.lease_start ?? '—'} → {contract.lease_end ?? '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">{t('contract.monthly_rent')}</p>
          <p className="text-sm font-medium text-gray-900">
            {contract.monthly_rent ? `฿${contract.monthly_rent.toLocaleString()}` : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">{t('contract.security_deposit')}</p>
          <p className="text-sm font-medium text-gray-900">
            {contract.security_deposit ? `฿${contract.security_deposit.toLocaleString()}` : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">{t('contract.clauses')}</p>
          <p className="text-sm font-medium text-gray-900">{clauses.length}</p>
        </div>
      </div>

      {/* Language toggle for clauses */}
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setShowLang('th')}
          className={`min-h-[44px] rounded-lg px-4 py-2 text-sm font-medium ${
            showLang === 'th'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {t('contract.thai')}
        </button>
        <button
          type="button"
          onClick={() => setShowLang('en')}
          className={`min-h-[44px] rounded-lg px-4 py-2 text-sm font-medium ${
            showLang === 'en'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {t('contract.english')}
        </button>
      </div>

      {/* Clauses list */}
      {clauses.length === 0 ? (
        <div className="rounded-lg bg-gray-50 p-8 text-center text-sm text-gray-500">
          {t('contract.no_clauses')}
        </div>
      ) : (
        <div className="space-y-3">
          {clauses.map((clause) => (
            <ContractClauseCard key={clause.clause_id} clause={clause} showLang={showLang} />
          ))}
        </div>
      )}
    </div>
  );
}
