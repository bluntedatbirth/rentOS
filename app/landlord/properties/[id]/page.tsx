import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getServerSession } from '@/lib/supabase/server-session';
import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';
import { PropertyDetailClient } from './PropertyDetailClient';

interface PropertyDetail {
  id: string;
  name: string;
  address: string | null;
  unit_number: string | null;
  created_at: string;
}

interface LinkedContract {
  id: string;
  status: string;
  lease_start: string | null;
  lease_end: string | null;
  monthly_rent: number | null;
  tenant_id: string | null;
  created_at: string;
}

interface MaintenanceRequest {
  id: string;
  title: string;
  status: string;
  created_at: string;
  contract_id: string;
}

interface TenantProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
}

export default async function PropertyDetailPage({ params }: { params: { id: string } }) {
  const { user } = await getServerSession();

  if (!user) {
    redirect('/login');
  }

  const { id } = params;
  const supabase = createServerSupabaseClient();

  const [propRes, contractsRes] = await Promise.all([
    supabase
      .from('properties')
      .select('id, name, address, unit_number, created_at')
      .eq('id', id)
      .eq('landlord_id', user.id)
      .eq('is_active', true)
      .single(),
    supabase
      .from('contracts')
      .select('id, status, lease_start, lease_end, monthly_rent, tenant_id, created_at')
      .eq('property_id', id)
      .order('created_at', { ascending: false }),
  ]);

  if (!propRes.data) {
    notFound();
  }

  const property = propRes.data as PropertyDetail;
  const contractList = (contractsRes.data ?? []) as LinkedContract[];

  // Fetch maintenance and tenant profiles in parallel
  const contractIds = contractList.map((c) => c.id);
  const tenantIds = Array.from(
    new Set(contractList.map((c) => c.tenant_id).filter(Boolean))
  ) as string[];

  const [maintenanceRes, tenantsRes] = await Promise.all([
    contractIds.length > 0
      ? supabase
          .from('maintenance_requests')
          .select('id, title, status, created_at, contract_id')
          .in('contract_id', contractIds)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    tenantIds.length > 0
      ? supabase.from('profiles').select('id, full_name, phone').in('id', tenantIds)
      : Promise.resolve({ data: [] }),
  ]);

  const maintenance = (maintenanceRes.data ?? []) as MaintenanceRequest[];

  const tenantMap: Record<string, TenantProfile> = {};
  ((tenantsRes.data ?? []) as unknown as TenantProfile[]).forEach((tp) => {
    tenantMap[tp.id] = tp;
  });

  return (
    <PropertyDetailClient
      property={property}
      initialContracts={contractList}
      initialMaintenance={maintenance}
      initialTenants={tenantMap}
    />
  );
}
