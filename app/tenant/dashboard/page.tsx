import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getServerSession } from '@/lib/supabase/server-session';
import { redirect } from 'next/navigation';
import { TenantDashboardClient } from './DashboardClient';

interface ContractSummary {
  id: string;
  status: string;
  lease_start: string | null;
  lease_end: string | null;
  monthly_rent: number | null;
  property_id: string;
  properties: { name: string } | null;
}

interface MaintenanceSummary {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

interface PenaltySummary {
  id: string;
  status: string;
  confirmed_amount: number | null;
  calculated_amount: number | null;
}

export default async function TenantDashboard() {
  const { user, profile } = await getServerSession();

  if (!user) {
    redirect('/login');
  }

  const supabase = createServerSupabaseClient();

  // Step 1: fetch active contract + pending renewal in parallel.
  const [contractsResult, renewalsResult] = await Promise.all([
    supabase
      .from('contracts')
      .select('id, status, lease_start, lease_end, monthly_rent, property_id, properties(name)')
      .eq('tenant_id', user.id)
      .eq('status', 'active')
      .limit(1),
    supabase
      .from('contracts')
      .select('id, status, lease_start, lease_end, monthly_rent, property_id, properties(name)')
      .eq('tenant_id', user.id)
      .eq('status', 'pending')
      .not('renewed_from', 'is', null)
      .limit(1),
  ]);

  const activeContract = (contractsResult.data?.[0] as unknown as ContractSummary) ?? null;
  const pendingRenewal = (renewalsResult.data?.[0] as unknown as ContractSummary) ?? null;

  const daysUntilExpiry = activeContract?.lease_end
    ? Math.ceil((new Date(activeContract.lease_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  // Step 2: if there is an active contract, fetch maintenance + penalties in parallel.
  let maintenance: MaintenanceSummary[] = [];
  let penalties: PenaltySummary[] = [];

  if (activeContract) {
    const [maintResult, pensResult] = await Promise.all([
      supabase
        .from('maintenance_requests')
        .select('id, title, status, created_at')
        .eq('contract_id', activeContract.id)
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('penalties')
        .select('id, status, confirmed_amount, calculated_amount')
        .eq('contract_id', activeContract.id)
        .order('created_at', { ascending: false }),
    ]);

    maintenance = (maintResult.data ?? []) as MaintenanceSummary[];
    penalties = (pensResult.data ?? []) as PenaltySummary[];
  }

  return (
    <TenantDashboardClient
      fullName={profile?.full_name ?? null}
      contract={activeContract}
      pendingRenewal={pendingRenewal}
      maintenance={maintenance}
      penalties={penalties}
      daysUntilExpiry={daysUntilExpiry}
    />
  );
}
