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

export default async function TenantDashboard() {
  const { user, profile } = await getServerSession();

  if (!user) {
    redirect('/login');
  }

  const supabase = createServerSupabaseClient();

  // Step 1: fetch active contracts + pending renewals + shell properties in parallel.
  const [contractsResult, renewalsResult, shellResult] = await Promise.all([
    supabase
      .from('contracts')
      .select(
        'id, status, lease_start, lease_end, monthly_rent, property_id, properties(name, daily_rate)'
      )
      .eq('tenant_id', user.id)
      .eq('status', 'active'),
    supabase
      .from('contracts')
      .select(
        'id, status, lease_start, lease_end, monthly_rent, property_id, properties(name, daily_rate)'
      )
      .eq('tenant_id', user.id)
      .eq('status', 'pending')
      .not('renewed_from', 'is', null),
    supabase
      .from('properties')
      .select('id, name, address, lease_start, lease_end, monthly_rent, notes')
      .eq('created_by_tenant_id' as string, user.id)
      .eq('is_shell' as string, true),
  ]);

  const contracts = (contractsResult.data as unknown as ContractSummary[]) ?? [];
  const pendingRenewals = (renewalsResult.data as unknown as ContractSummary[]) ?? [];
  const shellProperties = (shellResult.data as unknown as ShellProperty[]) ?? [];

  // Step 2: fetch payments for all active contract IDs in one query.
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
      fullName={profile?.full_name ?? null}
      contracts={contracts}
      pendingRenewals={pendingRenewals}
      allPayments={allPayments}
      shellProperties={shellProperties}
    />
  );
}
