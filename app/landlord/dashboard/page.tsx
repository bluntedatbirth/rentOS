import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getServerSession } from '@/lib/supabase/server-session';
import { redirect } from 'next/navigation';
import { DashboardClient } from './DashboardClient';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StatCards {
  monthlyRevenue: number;
  propertyCount: number;
  paymentsDueCount: number;
  openMaintenanceCount: number;
  vacancyCount: number;
  totalPropertyCount: number;
}

export interface ActivityItem {
  id: string;
  type: 'payment' | 'maintenance' | 'contract';
  text: string;
  timestamp: string;
  href: string;
}

export interface UpcomingPaymentItem {
  id: string;
  tenantName: string;
  propertyName: string;
  amount: number;
  dueDate: string;
  href: string;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function LandlordDashboard() {
  const showDevTools = process.env.DEV_ENDPOINTS_ENABLED === 'true';
  const { user, profile } = await getServerSession();

  if (!user) {
    redirect('/login');
  }

  const supabase = createServerSupabaseClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Step 1: fetch all of this landlord's contracts (need IDs for sub-queries)
  const { data: contractsData } = await supabase
    .from('contracts')
    .select('id, property_id, tenant_id, status, created_at, properties(id, name)')
    .eq('landlord_id', user.id);

  const contracts = (contractsData ?? []) as Array<{
    id: string;
    property_id: string;
    tenant_id: string | null;
    status: string;
    created_at: string;
    properties: { id: string; name: string } | null;
  }>;

  const contractIds = contracts.map((c) => c.id);

  // Step 2: fetch all of this landlord's properties (for vacancy calc)
  const propertiesPromise = supabase
    .from('properties')
    .select('id, name')
    .eq('landlord_id', user.id)
    .eq('is_active', true);

  if (contractIds.length === 0) {
    // No contracts yet — short-circuit with zeros
    const { data: propsData } = await propertiesPromise;
    const totalPropertyCount = (propsData ?? []).length;

    return (
      <DashboardClient
        fullName={profile?.full_name ?? null}
        stats={{
          monthlyRevenue: 0,
          propertyCount: 0,
          paymentsDueCount: 0,
          openMaintenanceCount: 0,
          vacancyCount: totalPropertyCount,
          totalPropertyCount,
        }}
        activity={[]}
        upcomingPayments={[]}
        showDevTools={showDevTools}
      />
    );
  }

  // Step 3: parallel queries across all contract IDs
  const [
    propsRes,
    revenueRes,
    paymentsDueRes,
    maintenanceRes,
    recentPaymentsRes,
    recentMaintenanceRes,
    upcomingPaymentsRes,
  ] = await Promise.all([
    // All active properties
    propertiesPromise,

    // Monthly revenue: paid payments this calendar month
    supabase
      .from('payments')
      .select('amount')
      .in('contract_id', contractIds)
      .eq('status', 'paid')
      .gte('paid_date', monthStart)
      .lte('paid_date', monthEnd),

    // Payments due in next 7 days
    supabase
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .in('contract_id', contractIds)
      .in('status', ['pending', 'overdue'])
      .gte('due_date', today)
      .lte('due_date', sevenDaysLater),

    // Open maintenance requests
    supabase
      .from('maintenance_requests')
      .select('id', { count: 'exact', head: true })
      .in('contract_id', contractIds)
      .in('status', ['open', 'in_progress']),

    // Recent paid payments (last 7 days) for activity feed
    supabase
      .from('payments')
      .select('id, amount, paid_date, contract_id')
      .in('contract_id', contractIds)
      .eq('status', 'paid')
      .gte('paid_date', sevenDaysAgo)
      .order('paid_date', { ascending: false })
      .limit(10),

    // Recent maintenance requests filed (last 7 days)
    supabase
      .from('maintenance_requests')
      .select('id, title, contract_id, created_at')
      .in('contract_id', contractIds)
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false })
      .limit(10),

    // Upcoming payments (next due, pending/overdue)
    supabase
      .from('payments')
      .select('id, amount, due_date, contract_id')
      .in('contract_id', contractIds)
      .in('status', ['pending', 'overdue'])
      .gte('due_date', today)
      .order('due_date', { ascending: true })
      .limit(5),
  ]);

  const allProperties = (propsRes.data ?? []) as Array<{ id: string; name: string }>;
  const totalPropertyCount = allProperties.length;

  // Monthly revenue sum
  const monthlyRevenue = (revenueRes.data ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0);

  // Properties with active contracts
  const activeContractPropertyIds = new Set(
    contracts.filter((c) => c.status === 'active').map((c) => c.property_id)
  );
  const propertyCount = allProperties.filter((p) => activeContractPropertyIds.has(p.id)).length;

  // Vacancies = properties without an active contract
  const vacancyCount = totalPropertyCount - propertyCount;

  // Build contract lookup map: contractId → property name
  const contractPropertyMap = new Map(
    contracts.map((c) => [c.id, c.properties?.name ?? 'Unknown Property'])
  );

  // Build recent contracts (uploaded/activated) in last 7 days for activity
  const recentContracts = contracts
    .filter((c) => new Date(c.created_at) >= new Date(sevenDaysAgo))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  // Step 4: fetch tenant profiles for upcoming payments
  const upcomingPaymentRows = (upcomingPaymentsRes.data ?? []) as Array<{
    id: string;
    amount: number;
    due_date: string;
    contract_id: string;
  }>;

  const upcomingContractIds = Array.from(new Set(upcomingPaymentRows.map((p) => p.contract_id)));
  let tenantProfileMap = new Map<string, string>(); // tenantId → fullName

  if (upcomingContractIds.length > 0) {
    const tenantIds = contracts
      .filter((c) => upcomingContractIds.includes(c.id) && c.tenant_id)
      .map((c) => c.tenant_id as string);
    const uniqueTenantIds = Array.from(new Set(tenantIds));

    if (uniqueTenantIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', uniqueTenantIds);

      tenantProfileMap = new Map((profilesData ?? []).map((p) => [p.id, p.full_name ?? 'Tenant']));
    }
  }

  // Contract ID → tenant ID map
  const contractTenantMap = new Map(
    contracts.filter((c) => c.tenant_id).map((c) => [c.id, c.tenant_id as string])
  );

  // Build upcoming payments list
  const upcomingPayments: UpcomingPaymentItem[] = upcomingPaymentRows.map((p) => {
    const tenantId = contractTenantMap.get(p.contract_id);
    const tenantName = tenantId ? (tenantProfileMap.get(tenantId) ?? 'Tenant') : 'Tenant';
    return {
      id: p.id,
      tenantName,
      propertyName: contractPropertyMap.get(p.contract_id) ?? 'Unknown Property',
      amount: p.amount,
      dueDate: p.due_date,
      href: '/landlord/payments',
    };
  });

  // Build activity feed — merge payments, maintenance, contracts; sort by timestamp desc; top 5
  type RawActivity = {
    id: string;
    type: 'payment' | 'maintenance' | 'contract';
    text: string;
    timestamp: string;
    href: string;
  };

  const activityItems: RawActivity[] = [];

  // Paid payments
  for (const p of (recentPaymentsRes.data ?? []) as Array<{
    id: string;
    amount: number;
    paid_date: string | null;
    contract_id: string;
  }>) {
    const propName = contractPropertyMap.get(p.contract_id) ?? 'Unknown Property';
    activityItems.push({
      id: `pay-${p.id}`,
      type: 'payment',
      text: `Payment confirmed — ${propName} (฿${p.amount.toLocaleString('en-US')})`,
      timestamp: p.paid_date ?? '',
      href: '/landlord/payments',
    });
  }

  // Maintenance filed
  for (const m of (recentMaintenanceRes.data ?? []) as Array<{
    id: string;
    title: string;
    contract_id: string;
    created_at: string;
  }>) {
    const propName = contractPropertyMap.get(m.contract_id) ?? 'Unknown Property';
    activityItems.push({
      id: `maint-${m.id}`,
      type: 'maintenance',
      text: `Maintenance filed — ${propName} (${m.title})`,
      timestamp: m.created_at,
      href: '/landlord/maintenance',
    });
  }

  // Contracts uploaded/activated
  for (const c of recentContracts) {
    const propName = contractPropertyMap.get(c.id) ?? 'Unknown Property';
    const label = c.status === 'active' ? 'Contract activated' : 'Contract uploaded';
    activityItems.push({
      id: `contract-${c.id}`,
      type: 'contract',
      text: `${label} — ${propName}`,
      timestamp: c.created_at,
      href: `/landlord/contracts/${c.id}`,
    });
  }

  // Sort descending by timestamp, take top 5
  const activity: ActivityItem[] = activityItems
    .filter((a) => a.timestamp)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);

  const stats: StatCards = {
    monthlyRevenue,
    propertyCount,
    paymentsDueCount: paymentsDueRes.count ?? 0,
    openMaintenanceCount: maintenanceRes.count ?? 0,
    vacancyCount: Math.max(vacancyCount, 0),
    totalPropertyCount,
  };

  return (
    <DashboardClient
      fullName={profile?.full_name ?? null}
      stats={stats}
      activity={activity}
      upcomingPayments={upcomingPayments}
      showDevTools={showDevTools}
    />
  );
}
