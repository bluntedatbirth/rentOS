'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';
import { createClient } from '@/lib/supabase/client';
import { Card, CardTitle, CardValue } from '@/components/ui/Card';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

interface DashboardStats {
  propertyCount: number;
  contractCount: number;
  pendingPenalties: number;
  upcomingPayments: number;
}

export default function LandlordDashboard() {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    if (!user) return;
    const loadStats = async () => {
      const [propertiesRes, contractsRes, penaltiesRes, paymentsRes] = await Promise.all([
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
      ]);

      setStats({
        propertyCount: propertiesRes.count ?? 0,
        contractCount: contractsRes.count ?? 0,
        pendingPenalties: penaltiesRes.count ?? 0,
        upcomingPayments: paymentsRes.count ?? 0,
      });
      setLoading(false);
    };
    loadStats();
  }, [user, supabase]);

  if (loading) return <LoadingSkeleton count={4} />;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{t('dashboard.landlord_title')}</h2>
          <p className="text-sm text-gray-500">
            {t('dashboard.welcome')}, {profile?.full_name ?? ''}
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardTitle>{t('dashboard.active_properties')}</CardTitle>
          <CardValue>{stats?.propertyCount ?? 0}</CardValue>
        </Card>
        <Card>
          <CardTitle>{t('dashboard.active_contracts')}</CardTitle>
          <CardValue>{stats?.contractCount ?? 0}</CardValue>
        </Card>
        <Card>
          <CardTitle>{t('dashboard.pending_penalties')}</CardTitle>
          <CardValue className={stats?.pendingPenalties ? 'text-amber-600' : ''}>
            {stats?.pendingPenalties ?? 0}
          </CardValue>
        </Card>
        <Card>
          <CardTitle>{t('dashboard.upcoming_payments')}</CardTitle>
          <CardValue>{stats?.upcomingPayments ?? 0}</CardValue>
        </Card>
      </div>

      {/* Quick actions */}
      <h3 className="mb-3 text-sm font-semibold text-gray-900">{t('dashboard.quick_actions')}</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link
          href="/landlord/properties"
          className="flex min-h-[44px] items-center justify-center rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {t('nav.properties')}
        </Link>
        <Link
          href="/landlord/contracts/upload"
          className="flex min-h-[44px] items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700"
        >
          {t('nav.upload_contract')}
        </Link>
        <Link
          href="/landlord/penalties"
          className="flex min-h-[44px] items-center justify-center rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {t('dashboard.pending_penalties')}
        </Link>
      </div>
    </div>
  );
}
