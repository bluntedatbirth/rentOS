'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';
import { createClient } from '@/lib/supabase/client';
import { ContractClauseCard } from '@/components/landlord/ContractClauseCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { ContractAnalysis } from '@/components/landlord/ContractAnalysis';
import { RenewalBanner } from '@/components/landlord/RenewalBanner';
import { useAutoDismissNotifications } from '@/lib/hooks/useAutoDismissNotifications';
import type { StructuredClause } from '@/lib/supabase/types';

const supabase = createClient();

interface ContractData {
  id: string;
  property_id: string;
  tenant_id: string | null;
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
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useI18n();
  const [contract, setContract] = useState<ContractData | null>(null);
  const [pendingRenewal, setPendingRenewal] = useState<{
    id: string;
    status: string;
    lease_start: string | null;
    lease_end: string | null;
    monthly_rent: number | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLang, setShowLang] = useState<'th' | 'en'>('th');

  // Auto-dismiss notifications related to this contract
  useAutoDismissNotifications({ url: `/contracts/${id}` });

  const handleRaisePenalty = useCallback(
    (clause: StructuredClause) => {
      router.push(`/landlord/penalties?contract_id=${id}&clause_id=${clause.clause_id}`);
    },
    [id, router]
  );

  const loadContract = useCallback(async () => {
    if (!user || !id) return;
    const { data } = await supabase
      .from('contracts')
      .select(
        'id, property_id, tenant_id, structured_clauses, lease_start, lease_end, monthly_rent, security_deposit, status, created_at'
      )
      .eq('id', id)
      .single();
    setContract(data as ContractData | null);

    // Check if a pending or awaiting_signature renewal exists for this contract
    if (data) {
      const { data: renewalData } = await (
        supabase
          .from('contracts')
          .select('id, status, lease_start, lease_end, monthly_rent') as unknown as {
          eq: (...args: unknown[]) => unknown;
        }
      )
        .eq('renewed_from', id)
        .in('status', ['pending', 'awaiting_signature'])
        .limit(1)
        .single();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setPendingRenewal((renewalData as any) ?? null);
    }

    setLoading(false);
  }, [user, id]);

  useEffect(() => {
    loadContract();
  }, [loadContract]);

  if (loading) return <LoadingSkeleton count={4} />;

  if (!contract) {
    // Contract was deleted or doesn't exist — redirect to dashboard
    router.replace('/landlord/dashboard');
    return <LoadingSkeleton count={4} />;
  }

  const clauses = contract.structured_clauses ?? [];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/landlord/contracts"
            className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
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
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900">{t('contract.review_title')}</h2>
            <StatusBadge status={contract.status} />
          </div>
        </div>
        <Link
          href={`/landlord/contracts/${id}/pair`}
          className="min-h-[44px] flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          {t('pairing.pair_tenant')}
        </Link>
      </div>

      {/* Contract summary */}
      <div className="mb-6 grid grid-cols-2 gap-4 rounded-lg bg-white p-4 shadow-sm sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-1">
          <p className="text-xs text-gray-500">{t('contract.lease_period')}</p>
          <p className="break-all text-sm font-medium text-gray-900">
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

      {/* Renewal banner — shows when lease is in final month */}
      <RenewalBanner
        contract={contract}
        pendingRenewal={pendingRenewal}
        onRenewed={() => loadContract()}
      />

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
            <ContractClauseCard
              key={clause.clause_id}
              clause={clause}
              showLang={showLang}
              onRaisePenalty={handleRaisePenalty}
            />
          ))}
        </div>
      )}

      {/* AI Analysis section — Pro feature */}
      <div className="mt-8">
        <ContractAnalysis contractId={id} showLang={showLang} />
      </div>
    </div>
  );
}
