import { createServiceRoleClient } from '@/lib/supabase/server';
import { requirePro } from '@/lib/tier';

export interface AnalyticsData {
  revenue: {
    this_month: number;
    last_month: number;
    mom_change: number;
    total_outstanding: number;
  };
  properties: {
    total: number;
    vacancy_rate: number;
    avg_rent: number;
  };
  payments: {
    late_payment_rate: number;
    on_time_rate: number;
    total_overdue_amount: number;
  };
  monthly_trend: { month: string; revenue: number; expected: number }[];
  property_performance: {
    property_id: string;
    property_name: string;
    monthly_rent: number;
    total_collected: number;
    total_overdue: number;
    occupancy_months: number;
    is_occupied: boolean;
  }[];
}

export type AnalyticsResult =
  | { ok: true; data: AnalyticsData }
  | { ok: false; blocked: true }
  | { ok: false; blocked: false; error: string };

export async function getLandlordAnalytics(userId: string): Promise<AnalyticsResult> {
  const adminClient = createServiceRoleClient();

  const { data: profile } = await adminClient
    .from('profiles')
    .select('tier, tier_expires_at')
    .eq('id', userId)
    .single();

  const tierCheck = requirePro(profile?.tier ?? 'free', 'analytics', profile?.tier_expires_at);
  if (!tierCheck.allowed) {
    return { ok: false, blocked: true };
  }

  try {
    // ── Dates ──────────────────────────────────────────────────────────────────
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0];
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split('T')[0];
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      .toISOString()
      .split('T')[0];
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    // ── Properties ─────────────────────────────────────────────────────────────
    const { data: properties, error: propErr } = await adminClient
      .from('properties')
      .select('id, name')
      .eq('landlord_id', userId)
      .eq('is_active', true);

    if (propErr) return { ok: false, blocked: false, error: propErr.message };

    const propertyIds = (properties ?? []).map((p) => p.id);
    const totalProperties = propertyIds.length;

    // ── Active contracts ────────────────────────────────────────────────────────
    const { data: activeContracts, error: contractErr } = await adminClient
      .from('contracts')
      .select('id, property_id, monthly_rent, lease_start, lease_end')
      .eq('landlord_id', userId)
      .eq('status', 'active');

    if (contractErr) return { ok: false, blocked: false, error: contractErr.message };

    const occupiedPropertyIds = new Set((activeContracts ?? []).map((c) => c.property_id));
    const vacantCount = totalProperties - occupiedPropertyIds.size;
    const vacancyRate =
      totalProperties > 0 ? Math.round((vacantCount / totalProperties) * 100 * 10) / 10 : 0;

    const avgRent =
      activeContracts && activeContracts.length > 0
        ? Math.round(
            activeContracts.reduce((sum, c) => sum + (c.monthly_rent ?? 0), 0) /
              activeContracts.length
          )
        : 0;

    const _activeContractIds = (activeContracts ?? []).map((c) => c.id);

    // ── All landlord contract IDs (for payment queries) ────────────────────────
    const { data: allContracts } = await adminClient
      .from('contracts')
      .select('id, property_id, monthly_rent, lease_start, lease_end, status')
      .eq('landlord_id', userId);

    const allContractIds = (allContracts ?? []).map((c) => c.id);

    // ── Revenue: this month ────────────────────────────────────────────────────
    let revenueThisMonth = 0;
    let revenueLastMonth = 0;
    let totalOutstanding = 0;
    let overdueCount = 0;
    let totalPaymentsLast90 = 0;
    let overdueAmountTotal = 0;

    if (allContractIds.length > 0) {
      const { data: thisMonthPayments } = await adminClient
        .from('payments')
        .select('amount')
        .in('contract_id', allContractIds)
        .eq('status', 'paid')
        .eq('payment_type', 'rent')
        .gte('paid_date', thisMonthStart)
        .lte('paid_date', thisMonthEnd);

      revenueThisMonth = (thisMonthPayments ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0);

      const { data: lastMonthPayments } = await adminClient
        .from('payments')
        .select('amount')
        .in('contract_id', allContractIds)
        .eq('status', 'paid')
        .eq('payment_type', 'rent')
        .gte('paid_date', lastMonthStart)
        .lte('paid_date', lastMonthEnd);

      revenueLastMonth = (lastMonthPayments ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0);

      // Outstanding: all unpaid/overdue rent payments
      const { data: outstandingPayments } = await adminClient
        .from('payments')
        .select('amount, status')
        .in('contract_id', allContractIds)
        .in('status', ['pending', 'overdue'])
        .eq('payment_type', 'rent');

      totalOutstanding = (outstandingPayments ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0);

      // Overdue payments in last 90 days for late payment rate
      const { data: last90Payments } = await adminClient
        .from('payments')
        .select('status, amount')
        .in('contract_id', allContractIds)
        .eq('payment_type', 'rent')
        .gte('due_date', ninetyDaysAgo);

      totalPaymentsLast90 = (last90Payments ?? []).length;
      overdueCount = (last90Payments ?? []).filter((p) => p.status === 'overdue').length;
      overdueAmountTotal = (last90Payments ?? [])
        .filter((p) => p.status === 'overdue')
        .reduce((sum, p) => sum + (p.amount ?? 0), 0);
    }

    const momChange =
      revenueLastMonth > 0
        ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100 * 10) / 10
        : revenueThisMonth > 0
          ? 100
          : 0;

    const latePaymentRate =
      totalPaymentsLast90 > 0
        ? Math.round((overdueCount / totalPaymentsLast90) * 100 * 10) / 10
        : 0;
    const onTimeRate = Math.max(0, 100 - latePaymentRate);

    // ── Monthly trend: last 12 months ──────────────────────────────────────────
    const monthlyTrend: { month: string; revenue: number; expected: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const mStart = `${monthKey}-01`;
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]!;

      let monthRevenue = 0;
      let monthExpected = 0;

      if (allContractIds.length > 0) {
        const { data: mPayments } = await adminClient
          .from('payments')
          .select('amount')
          .in('contract_id', allContractIds)
          .eq('status', 'paid')
          .eq('payment_type', 'rent')
          .gte('paid_date', mStart)
          .lte('paid_date', mEnd);

        monthRevenue = (mPayments ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0);

        // Expected: contracts that were active during this month
        monthExpected = (allContracts ?? [])
          .filter((c) => {
            if (c.status === 'terminated') return false;
            if (!c.lease_start) return false;
            const start = c.lease_start;
            const end = c.lease_end ?? '9999-12-31';
            return start <= mEnd && end >= mStart;
          })
          .reduce((sum, c) => sum + (c.monthly_rent ?? 0), 0);
      }

      monthlyTrend.push({ month: monthKey, revenue: monthRevenue, expected: monthExpected });
    }

    // ── Per-property performance ───────────────────────────────────────────────
    const propertyPerformance = await Promise.all(
      (properties ?? []).map(async (prop) => {
        const propContracts = (allContracts ?? []).filter((c) => c.property_id === prop.id);
        const propContractIds = propContracts.map((c) => c.id);
        const isOccupied = occupiedPropertyIds.has(prop.id);

        // Monthly rent from active contract
        const activeContract = (activeContracts ?? []).find((c) => c.property_id === prop.id);
        const monthlyRent = activeContract?.monthly_rent ?? 0;

        let totalCollected = 0;
        let totalOverdue = 0;
        let occupancyMonths = 0;

        if (propContractIds.length > 0) {
          const { data: propPayments } = await adminClient
            .from('payments')
            .select('amount, status')
            .in('contract_id', propContractIds)
            .eq('payment_type', 'rent');

          totalCollected = (propPayments ?? [])
            .filter((p) => p.status === 'paid')
            .reduce((sum, p) => sum + (p.amount ?? 0), 0);

          totalOverdue = (propPayments ?? [])
            .filter((p) => p.status === 'overdue')
            .reduce((sum, p) => sum + (p.amount ?? 0), 0);

          // Occupancy months: months covered by any contract for this property
          occupancyMonths = propContracts.reduce((sum, c) => {
            if (!c.lease_start) return sum;
            const start = new Date(c.lease_start);
            const end = c.lease_end ? new Date(c.lease_end) : now;
            const months =
              (end.getFullYear() - start.getFullYear()) * 12 +
              (end.getMonth() - start.getMonth()) +
              1;
            return sum + Math.max(0, months);
          }, 0);
        }

        return {
          property_id: prop.id,
          property_name: prop.name,
          monthly_rent: monthlyRent,
          total_collected: totalCollected,
          total_overdue: totalOverdue,
          occupancy_months: occupancyMonths,
          is_occupied: isOccupied,
        };
      })
    );

    return {
      ok: true,
      data: {
        revenue: {
          this_month: revenueThisMonth,
          last_month: revenueLastMonth,
          mom_change: momChange,
          total_outstanding: totalOutstanding,
        },
        properties: {
          total: totalProperties,
          vacancy_rate: vacancyRate,
          avg_rent: avgRent,
        },
        payments: {
          late_payment_rate: latePaymentRate,
          on_time_rate: onTimeRate,
          total_overdue_amount: overdueAmountTotal,
        },
        monthly_trend: monthlyTrend,
        property_performance: propertyPerformance,
      },
    };
  } catch (err) {
    return {
      ok: false,
      blocked: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
