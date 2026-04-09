'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';
import { createClient } from '@/lib/supabase/client';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { ProRibbon } from '@/components/ui/ProRibbon';

const supabase = createClient();

interface DashboardStats {
  propertyCount: number;
  contractCount: number;
  pendingPenalties: number;
  upcomingPayments: number;
  expiringContracts: number;
  awaitingSignature: number;
  openMaintenance: number;
}

interface MonthlyTrend {
  month: string;
  revenue: number;
  expected: number;
}

export default function LandlordDashboard() {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trend, setTrend] = useState<MonthlyTrend[]>([]);
  const [loading, setLoading] = useState(true);

  const tier = profile?.tier ?? 'free';

  useEffect(() => {
    if (!user) return;
    const loadStats = async () => {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const expiryThreshold = thirtyDaysFromNow.toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];

      const [
        propertiesRes,
        contractsRes,
        penaltiesRes,
        paymentsRes,
        expiringRes,
        awaitingRes,
        maintenanceRes,
      ] = await Promise.all([
        supabase
          .from('properties')
          .select('id', { count: 'exact', head: true })
          .eq('landlord_id', user.id)
          .eq('is_active', true),
        supabase
          .from('contracts')
          .select('id', { count: 'exact', head: true })
          .eq('landlord_id', user.id)
          .eq('status', 'active'),
        supabase
          .from('penalties')
          .select('id', { count: 'exact', head: true })
          .in('status', ['pending_landlord_review', 'pending_tenant_appeal']),
        supabase
          .from('payments')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase
          .from('contracts')
          .select('id', { count: 'exact', head: true })
          .eq('landlord_id', user.id)
          .eq('status', 'active')
          .gte('lease_end', today)
          .lte('lease_end', expiryThreshold),
        supabase
          .from('contracts')
          .select('id', { count: 'exact', head: true })
          .eq('landlord_id', user.id)
          .eq('status', 'awaiting_signature'),
        supabase
          .from('maintenance_requests')
          .select('id', { count: 'exact', head: true })
          .in('status', ['open', 'in_progress']),
      ]);

      setStats({
        propertyCount: propertiesRes.count ?? 0,
        contractCount: contractsRes.count ?? 0,
        pendingPenalties: penaltiesRes.count ?? 0,
        upcomingPayments: paymentsRes.count ?? 0,
        expiringContracts: expiringRes.count ?? 0,
        awaitingSignature: awaitingRes.count ?? 0,
        openMaintenance: maintenanceRes.count ?? 0,
      });

      // Fetch revenue trend for chart
      try {
        const res = await fetch('/api/analytics');
        if (res.ok) {
          const data = await res.json();
          setTrend(data.monthly_trend ?? []);
        }
      } catch {
        // Analytics not available — no chart
      }

      setLoading(false);
    };
    loadStats();
  }, [user]);

  if (loading) return <LoadingSkeleton count={4} />;

  const needsAttention =
    (stats?.upcomingPayments ?? 0) > 0 ||
    (stats?.pendingPenalties ?? 0) > 0 ||
    (stats?.expiringContracts ?? 0) > 0 ||
    (stats?.awaitingSignature ?? 0) > 0 ||
    (stats?.openMaintenance ?? 0) > 0;

  // Chart helpers
  const maxRevenue = Math.max(...trend.map((m) => Math.max(m.revenue, m.expected)), 1);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">{t('dashboard.landlord_title')}</h2>
        <p className="text-sm text-gray-500">
          {t('dashboard.welcome')}, {profile?.full_name ?? ''}
        </p>
      </div>

      {/* Attention cards — only shown when action is needed */}
      {needsAttention && (
        <div className="mb-6 space-y-3">
          {(stats?.upcomingPayments ?? 0) > 0 && (
            <Link href="/landlord/payments" className="block">
              <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-4 transition-shadow hover:shadow-md">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-5 w-5 text-blue-600"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 1a1 1 0 100 2 1 1 0 000-2z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-blue-900">
                      {t('dashboard.review_payments')}
                    </p>
                    <p className="text-xs text-blue-700">
                      {stats?.upcomingPayments} {t('dashboard.items_need_attention')}
                    </p>
                  </div>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-5 w-5 text-blue-400"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </Link>
          )}
          {(stats?.pendingPenalties ?? 0) > 0 && (
            <Link href="/landlord/penalties" className="block">
              <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-4 transition-shadow hover:shadow-md">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-5 w-5 text-amber-600"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-amber-900">
                      {t('dashboard.review_penalties')}
                    </p>
                    <p className="text-xs text-amber-700">
                      {stats?.pendingPenalties} {t('dashboard.items_need_attention')}
                    </p>
                  </div>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-5 w-5 text-amber-400"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </Link>
          )}
          {(stats?.expiringContracts ?? 0) > 0 && (
            <Link href="/landlord/contracts" className="block">
              <div className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 p-4 transition-shadow hover:shadow-md">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-5 w-5 text-orange-600"
                    >
                      <path
                        fillRule="evenodd"
                        d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-orange-900">
                      {t('dashboard.review_renewals')}
                    </p>
                    <p className="text-xs text-orange-700">
                      {stats?.expiringContracts} {t('dashboard.items_need_attention')}
                    </p>
                  </div>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-5 w-5 text-orange-400"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </Link>
          )}
          {(stats?.openMaintenance ?? 0) > 0 && (
            <Link href="/landlord/maintenance" className="block">
              <div className="flex items-center justify-between rounded-lg border border-purple-200 bg-purple-50 p-4 transition-shadow hover:shadow-md">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-5 w-5 text-purple-600"
                    >
                      <path
                        fillRule="evenodd"
                        d="M14.5 10a4.5 4.5 0 004.284-5.882c-.105-.324-.51-.391-.752-.15L15.34 6.66a.454.454 0 01-.493.101 3.046 3.046 0 01-1.608-1.607.454.454 0 01.1-.493l2.693-2.692c.24-.241.174-.647-.15-.752a4.5 4.5 0 00-5.873 4.575c.055.873-.128 1.808-.8 2.368l-7.23 6.024a2.724 2.724 0 103.837 3.837l6.024-7.23c.56-.672 1.495-.855 2.368-.8.096.007.193.01.291.01zM5 16a1 1 0 11-2 0 1 1 0 012 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-purple-900">
                      {t('dashboard.open_maintenance')}
                    </p>
                    <p className="text-xs text-purple-700">
                      {stats?.openMaintenance} {t('dashboard.items_need_attention')}
                    </p>
                  </div>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-5 w-5 text-purple-400"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </Link>
          )}
          {(stats?.awaitingSignature ?? 0) > 0 && (
            <Link href="/landlord/contracts?filter=awaiting_signature" className="block">
              <div className="flex items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50 p-4 transition-shadow hover:shadow-md">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-5 w-5 text-indigo-600"
                    >
                      <path d="M15.98 1.804a1 1 0 00-1.96 0l-.24 1.192a1 1 0 01-.784.784l-1.192.24a1 1 0 000 1.96l1.192.24a1 1 0 01.784.785l.24 1.192a1 1 0 001.96 0l.24-1.192a1 1 0 01.784-.785l1.192-.24a1 1 0 000-1.96l-1.192-.24a1 1 0 01-.784-.784l-.24-1.192zM5.22 6.9a.75.75 0 011.06 0l2.224 2.223 5.073-5.073a.75.75 0 011.06 1.06l-5.6 5.6a.75.75 0 01-1.06 0L5.22 7.96a.75.75 0 010-1.06z" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-indigo-900">
                      {t('dashboard.awaiting_signature')}
                    </p>
                    <p className="text-xs text-indigo-700">
                      {stats?.awaitingSignature} {t('dashboard.items_need_attention')}
                    </p>
                  </div>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-5 w-5 text-indigo-400"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* All clear message */}
      {!needsAttention && stats && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-center">
          <span className="text-lg">{'\u2713'}</span>
          <p className="mt-1 text-sm font-medium text-green-800">{t('dashboard.all_clear')}</p>
          <p className="text-xs text-green-600">{t('dashboard.no_items_attention')}</p>
        </div>
      )}

      {/* Revenue chart (Pro) or upgrade prompt (Free) */}
      <div className="mb-6 rounded-lg bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-gray-900">{t('dashboard.revenue_overview')}</h3>
          <Link
            href="/landlord/analytics"
            className="text-xs font-medium text-blue-600 hover:text-blue-800"
          >
            {t('dashboard.view_analytics')} &rarr;
          </Link>
        </div>

        {trend.length > 0 ? (
          <div className="px-5 py-4">
            {/* Mini bar chart — last 6 months */}
            <div className="flex items-end gap-2" style={{ height: 120 }}>
              {trend.slice(-6).map((m) => {
                const pct = maxRevenue > 0 ? (m.revenue / maxRevenue) * 100 : 0;
                return (
                  <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[10px] font-medium text-gray-700">
                      {m.revenue > 0 ? `${(m.revenue / 1000).toFixed(0)}k` : ''}
                    </span>
                    <div
                      className="w-full rounded-t bg-blue-500 transition-all"
                      style={{ height: `${Math.max(pct, 2)}%`, minHeight: 2 }}
                    />
                    <span className="text-[10px] text-gray-400">{m.month.slice(5)}</span>
                  </div>
                );
              })}
            </div>
            {/* Summary row */}
            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-gray-100 pt-3">
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">{stats?.propertyCount ?? 0}</p>
                <p className="text-[10px] text-gray-500">{t('dashboard.active_properties')}</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">{stats?.contractCount ?? 0}</p>
                <p className="text-[10px] text-gray-500">{t('dashboard.active_contracts')}</p>
              </div>
              <div className="text-center">
                <p
                  className={`text-lg font-bold ${(stats?.upcomingPayments ?? 0) > 0 ? 'text-blue-600' : 'text-gray-900'}`}
                >
                  {stats?.upcomingPayments ?? 0}
                </p>
                <p className="text-[10px] text-gray-500">{t('dashboard.upcoming_payments')}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-gray-400">{t('dashboard.no_data')}</p>
          </div>
        )}
      </div>

      {/* Pro upsell for free users */}
      {tier !== 'pro' && (
        <Link href="/landlord/billing/upgrade" className="block">
          <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white shadow-sm transition-shadow hover:shadow-md">
            <ProRibbon size="md" />
            <h3 className="text-sm font-bold">{t('dashboard.unlock_pro')}</h3>
            <p className="mt-1 text-xs text-blue-100">{t('dashboard.unlock_pro_desc')}</p>
            <span className="mt-3 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
              {t('dashboard.upgrade_cta')}
            </span>
          </div>
        </Link>
      )}
    </div>
  );
}
