import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getServerSession } from '@/lib/supabase/server-session';
import { redirect } from 'next/navigation';
import { TenantMaintenanceClient } from './TenantMaintenanceClient';

interface MaintenanceRequest {
  id: string;
  contract_id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
}

export default async function TenantMaintenancePage() {
  const { user } = await getServerSession();

  if (!user) {
    redirect('/login');
  }

  const supabase = createServerSupabaseClient();

  // Find tenant's active contract
  const { data: contracts } = await supabase
    .from('contracts')
    .select('id')
    .eq('tenant_id', user.id)
    .eq('status', 'active')
    .limit(1);

  const contractId = (contracts?.[0] as { id: string } | undefined)?.id ?? null;

  let requests: MaintenanceRequest[] = [];
  if (contractId) {
    const { data } = await supabase
      .from('maintenance_requests')
      .select('id, contract_id, title, description, status, created_at')
      .eq('contract_id', contractId)
      .order('created_at', { ascending: false });
    requests = (data ?? []) as MaintenanceRequest[];
  }

  return <TenantMaintenanceClient initialRequests={requests} contractId={contractId} />;
}
