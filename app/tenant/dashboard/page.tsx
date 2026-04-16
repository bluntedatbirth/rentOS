import { Suspense } from 'react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getServerSession } from '@/lib/supabase/server-session';
import { redirect } from 'next/navigation';
import { TenantDashboardClient } from './DashboardClient';
import { DashboardSkeleton } from './DashboardSkeleton';

interface ContractSummary {
  id: string;
  status: string;
  lease_start: string | null;
  lease_end: string | null;
  monthly_rent: number | null;
  property_id: string;
  properties: { name: string; daily_rate: number | null } | null;
}

interface NextPaymentSummary {
  id: string;
  amount: number;
  due_date: string;
  status: string;
  contract_id: string;
}

export interface ShellProperty {
  id: string;
  name: string;
  address: string | null;
  lease_start: string | null;
  lease_end: string | null;
  monthly_rent: number | null;
  notes: string | null;
}

/**
 * Async server component that owns all Supabase queries.
 * Wrapped in <Suspense> so the layout + bottom nav renders immediately
 * while both DB round-trips complete. On Thai 3G this saves 2-4 s of
 * blank-white-page time — the layout shell appears instantly.
 */
async function DashboardData({ userId, fullName }: { userId: string; fullName: string | null }) {
  const supabase = createServerSupabaseClient();

  // Round 1: active contracts + pending renewals + shell properties in parallel.
  const [contractsResult, renewalsResult, shellResult] = await Promise.all([
    supabase
      .from('contracts')
      .select(
        'id, status, lease_start, lease_end, monthly_rent, property_id, properties(name, daily_rate)'
      )
      .eq('tenant_id', userId)
      .eq('status', 'active'),
    supabase
      .from('contracts')
      .select(
        'id, status, lease_start, lease_end, monthly_rent, property_id, properties(name, daily_rate)'
      )
      .eq('tenant_id', userId)
      .eq('status', 'pending')
      .not('renewed_from', 'is', null),
    supabase
      .from('properties')
      .select('id, name, address, lease_start, lease_end, monthly_rent, notes')
      .eq('created_by_tenant_id' as string, userId)
      .eq('is_shell' as string, true),
  ]);

  const contracts = (contractsResult.data as unknown as ContractSummary[]) ?? [];
  const pendingRenewals = (renewalsResult.data as unknown as ContractSummary[]) ?? [];
  const shellProperties = (shellResult.data as unknown as ShellProperty[]) ?? [];

  // Round 2: payments for active contracts (depends on round 1 contract IDs).
  const contractIds = contracts.map((c) => c.id);
  let allPayments: NextPaymentSummary[] = [];
  if (contractIds.length > 0) {
    const { data: paymentData } = await supabase
      .from('payments')
      .select('id, amount, due_date, status, contract_id')
      .in('contract_id', contractIds)
      .neq('status', 'paid')
      .order('due_date', { ascending: true });
    allPayments = (paymentData as unknown as NextPaymentSummary[]) ?? [];
  }

  return (
    <TenantDashboardClient
      fullName={fullName}
      contracts={contracts}
      pendingRenewals={pendingRenewals}
      allPayments={allPayments}
      shellProperties={shellProperties}
    />
  );
}

export default async function TenantDashboard() {
  const { user, profile } = await getServerSession();

  if (!user) {
    redirect('/login');
  }

  const fullName = profile?.full_name ?? null;

  return (
    // Suspense boundary: the layout/nav (from TenantShell) renders immediately.
    // DashboardSkeleton is shown in this slot while DashboardData fetches.
    // Once both DB rounds resolve, React streams TenantDashboardClient in.
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardData userId={user.id} fullName={fullName} />
    </Suspense>
  );
}
