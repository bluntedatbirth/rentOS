import { notFound } from 'next/navigation';
import { FEATURE_MAINTENANCE } from '@/lib/features';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getServerSession } from '@/lib/supabase/server-session';
import { redirect } from 'next/navigation';
import { MaintenanceClient } from './MaintenanceClient';

interface MaintenanceRequest {
  id: string;
  contract_id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  assigned_to: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  sla_deadline: string | null;
  completed_at: string | null;
  property_name?: string;
  property_id?: string;
}

const statusOrder: Record<string, number> = {
  open: 0,
  in_progress: 1,
  resolved: 2,
};

export default async function LandlordMaintenancePage() {
  if (!FEATURE_MAINTENANCE) notFound();

  const { user, profile } = await getServerSession();

  if (!user) {
    redirect('/login');
  }

  const supabase = createServerSupabaseClient();

  const isPro =
    profile?.tier === 'pro' || process.env.NEXT_PUBLIC_DEFER_TIER_ENFORCEMENT === 'true';

  const [propsRes, maintenanceRes] = await Promise.all([
    supabase.from('properties').select('id, name').eq('landlord_id', user.id),
    supabase
      .from('maintenance_requests')
      .select(
        'id, contract_id, title, description, status, created_at, assigned_to, estimated_cost, actual_cost, sla_deadline, completed_at'
      )
      .order('created_at', { ascending: false }),
  ]);

  const propsData = propsRes.data ?? [];
  const maintenanceData = maintenanceRes.data ?? [];

  let enrichedRequests: MaintenanceRequest[] = [];

  if (propsData.length > 0 && maintenanceData.length > 0) {
    const propertyMap = new Map<string, string>();
    for (const p of propsData) {
      propertyMap.set(p.id, p.name);
    }

    const contractIds = Array.from(new Set(maintenanceData.map((r) => r.contract_id)));
    const contractPropertyMap = new Map<string, string>();

    if (contractIds.length > 0) {
      const { data: contracts } = await supabase
        .from('contracts')
        .select('id, property_id')
        .in('id', contractIds);

      for (const c of contracts ?? []) {
        if (c.property_id) contractPropertyMap.set(c.id, c.property_id);
      }
    }

    enrichedRequests = (maintenanceData as MaintenanceRequest[]).map((req) => {
      const propId = contractPropertyMap.get(req.contract_id) ?? '';
      return {
        ...req,
        property_id: propId,
        property_name: propertyMap.get(propId) ?? '',
      };
    });

    enrichedRequests.sort((a, b) => {
      const statusDiff = (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
      if (statusDiff !== 0) return statusDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }

  return (
    <MaintenanceClient
      initialRequests={enrichedRequests}
      initialProperties={propsData}
      isPro={isPro}
    />
  );
}
