'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';
import { createClient } from '@/lib/supabase/client';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { ProRibbon } from '@/components/ui/ProRibbon';

const supabase = createClient();

interface ContractRow {
  id: string;
  property_id: string;
  tenant_id: string | null;
  lease_start: string | null;
  lease_end: string | null;
  monthly_rent: number | null;
  status: 'pending' | 'active' | 'expired' | 'terminated';
  created_at: string;
  properties: { name: string } | null;
  renewed_from: string | null;
}

export default function ContractsListPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    'all' | 'pending' | 'awaiting_signature' | 'active' | 'expired' | 'terminated'
  >('all');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      let query = supabase
        .from('contracts')
        .select(
          'id, property_id, tenant_id, lease_start, lease_end, monthly_rent, status, created_at, renewed_from, properties(name)'
        )
        .eq('landlord_id', user.id)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data } = await query;
      setContracts((data as unknown as ContractRow[]) ?? []);
      setLoading(false);
    };
    load();
  }, [user, filter]);

  const handleDelete = async (id: string) => {
    if (!confirm(t('contract.delete_confirm'))) return;
    setDeleting(id);
    const res = await fetch(`/api/contracts/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setContracts((prev) => prev.filter((c) => c.id !== id));
    }
    setDeleting(null);
  };

  const handleWithdraw = async (id: string) => {
    if (!confirm(t('renewal.withdraw_confirm'))) return;
    setWithdrawing(id);
    const res = await fetch(`/api/contracts/${id}/renew`, { method: 'DELETE' });
    if (res.ok) {
      setContracts((prev) => prev.filter((c) => c.id !== id));
    }
    setWithdrawing(null);
  };

  const filters = [
    'all',
    'pending',
    'awaiting_signature',
    'active',
    'expired',
    'terminated',
  ] as const;

  if (loading) return <LoadingSkeleton count={6} />;

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="mb-6 text-xl font-bold text-gray-900">{t('nav.contracts')}</h2>

      <div className="mb-4 flex gap-2">
        <Link
          href="/landlord/contracts/create"
          className="relative overflow-hidden min-h-[44px] flex-1 flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {t('nav.create_contract')}
          <ProRibbon size="sm" />
        </Link>
        <Link
          href="/landlord/contracts/upload"
          className="min-h-[44px] flex-1 flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {t('nav.upload_contract')}
        </Link>
        <Link
          href="/landlord/contracts/templates"
          className="min-h-[44px] flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          title={t('templates.title')}
        >
          {t('nav.templates')}
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => {
              setLoading(true);
              setFilter(f);
            }}
            className={`min-h-[36px] whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? t('penalties.filter_all') : t(`contract.status_${f}`)}
          </button>
        ))}
      </div>

      {contracts.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-gray-500">{t('contract.no_contracts')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-2 rounded-lg bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              <Link href={`/landlord/contracts/${c.id}`} className="block flex-1 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900">
                      {c.properties?.name ?? t('contract.unknown_property')}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      {c.lease_start && c.lease_end && (
                        <span>
                          {new Date(c.lease_start).toLocaleDateString()} –{' '}
                          {new Date(c.lease_end).toLocaleDateString()}
                        </span>
                      )}
                      {c.monthly_rent != null && (
                        <span>
                          ฿{c.monthly_rent.toLocaleString()}
                          {t('payments.per_month')}
                        </span>
                      )}
                      {!c.tenant_id && (
                        <span className="text-gray-400">{t('contract.unpaired')}</span>
                      )}
                    </div>
                    {/* Contextual warnings */}
                    {c.status === 'active' &&
                      c.lease_end &&
                      (() => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const end = new Date(c.lease_end);
                        end.setHours(0, 0, 0, 0);
                        const days = Math.round(
                          (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                        );
                        if (days <= 30 && days >= 0) {
                          return (
                            <p className="mt-1 text-xs font-medium text-amber-600">
                              {t('contract.renewal_needed')} · {days} {t('contract.days_remaining')}
                            </p>
                          );
                        }
                        return null;
                      })()}
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              </Link>
              {/* Unsend button for pending renewals */}
              {c.status === 'pending' && c.renewed_from && (
                <button
                  type="button"
                  onClick={() => handleWithdraw(c.id)}
                  disabled={withdrawing === c.id}
                  className="mr-3 shrink-0 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  title={t('renewal.withdraw')}
                >
                  {withdrawing === c.id ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
                  ) : (
                    t('renewal.withdraw')
                  )}
                </button>
              )}
              {/* Delete button for unpaired or terminated contracts */}
              {((!c.tenant_id && !c.renewed_from) || c.status === 'terminated') && (
                <button
                  type="button"
                  onClick={() => handleDelete(c.id)}
                  disabled={deleting === c.id}
                  className="mr-3 shrink-0 rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  title={t('contract.delete')}
                >
                  {deleting === c.id ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-5 w-5"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
