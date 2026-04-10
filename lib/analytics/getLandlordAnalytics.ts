import { unstable_cache } from 'next/cache';
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

async function computeLandlordAnalytics(userId: string): Promise<AnalyticsResult> {
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
    // 12 months ago for the monthly trend single-query window
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)
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

    // ── AR-3: Fetch allContracts once; derive activeContracts in memory ─────────
    const { data: allContracts, error: contractErr } = await adminClient
      .from('contracts')
      .select('id, property_id, monthly_rent, lease_start, lease_end, status')
      .eq('landlord_id', userId);

    if (contractErr) return { ok: false, blocked: false, error: contractErr.message };

    const activeContracts = (allContracts ?? []).filter((c) => c.status === 'active');
    const allContractIds = (allContracts ?? []).map((c) => c.id);

    const occupiedPropertyIds = new Set(activeContracts.map((c) => c.property_id));
    const vacantCount = totalProperties - occupiedPropertyIds.size;
    const vacancyRate =
      totalProperties > 0 ? Math.round((vacantCount / totalProperties) * 100 * 10) / 10 : 0;

    const avgRent =
      activeContracts.length > 0
        ? Math.round(
            activeContracts.reduce((sum, c) => sum + (c.monthly_rent ?? 0), 0) /
              activeContracts.length
          )
        : 0;

    // ── Revenue queries ────────────────────────────────────────────────────────
    let revenueThisMonth = 0;
    let revenueLastMonth = 0;
    let totalOutstanding = 0;
    let overdueCount = 0;
    let totalPaymentsLast90 = 0;
    let overdueAmountTotal = 0;

    // AR-2: single payments fetch for all properties — used for per-property section too
    // Fetch all rent payments ever for all contracts in one query.
    let allRentPayments: {
      contract_id: string;
      amount: number;
      status: string;
      due_date: string | null;
      paid_date: string | null;
    }[] = [];

    if (allContractIds.length > 0) {
      const { data: paymentsAll } = await adminClient
        .from('payments')
        .select('contract_id, amount, status, due_date, paid_date')
        .in('contract_id', allContractIds)
        .eq('payment_type', 'rent');

      allRentPayments = (paymentsAll ?? []) as typeof allRentPayments;

      revenueThisMonth = allRentPayments
        .filter(
          (p) =>
            p.status === 'paid' &&
            p.paid_date &&
            p.paid_date >= thisMonthStart! &&
            p.paid_date <= thisMonthEnd!
        )
        .reduce((sum, p) => sum + (p.amount ?? 0), 0);

      revenueLastMonth = allRentPayments
        .filter(
          (p) =>
            p.status === 'paid' &&
            p.paid_date &&
            p.paid_date >= lastMonthStart! &&
            p.paid_date <= lastMonthEnd!
        )
        .reduce((sum, p) => sum + (p.amount ?? 0), 0);

      totalOutstanding = allRentPayments
        .filter((p) => p.status === 'pending' || p.status === 'overdue')
        .reduce((sum, p) => sum + (p.amount ?? 0), 0);

      const last90 = allRentPayments.filter((p) => p.due_date && p.due_date >= ninetyDaysAgo!);
      totalPaymentsLast90 = last90.length;
      overdueCount = last90.filter((p) => p.status === 'overdue').length;
      overdueAmountTotal = last90
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

    // ── AR-1: Monthly trend — single query, group by month in application code ──
    const monthlyTrend: { month: string; revenue: number; expected: number }[] = [];

    // Build month keys for last 12 months
    const monthKeys: { monthKey: string; mStart: string; mEnd: string }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const mStart = `${monthKey}-01`;
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]!;
      monthKeys.push({ monthKey, mStart, mEnd });
    }

    // Group allRentPayments by paid month using pre-fetched data (no extra queries)
    const revenueByMonth = new Map<string, number>();
    for (const p of allRentPayments) {
      if (p.status === 'paid' && p.paid_date && p.paid_date >= twelveMonthsAgo!) {
        const month = p.paid_date.slice(0, 7); // YYYY-MM
        revenueByMonth.set(month, (revenueByMonth.get(month) ?? 0) + (p.amount ?? 0));
      }
    }

    for (const { monthKey, mStart, mEnd } of monthKeys) {
      const monthRevenue = revenueByMonth.get(monthKey) ?? 0;

      // Expected: contracts that were active during this month
      const monthExpected = (allContracts ?? [])
        .filter((c) => {
          if (c.status === 'terminated') return false;
          if (!c.lease_start) return false;
          const start = c.lease_start;
          const end = c.lease_end ?? '9999-12-31';
          return start <= mEnd && end >= mStart;
        })
        .reduce((sum, c) => sum + (c.monthly_rent ?? 0), 0);

      monthlyTrend.push({ month: monthKey, revenue: monthRevenue, expected: monthExpected });
    }

    // ── Per-property performance — filter allRentPayments in memory (AR-2) ──────
    const propertyPerformance = (properties ?? []).map((prop) => {
      const propContracts = (allContracts ?? []).filter((c) => c.property_id === prop.id);
      const propContractIdSet = new Set(propContracts.map((c) => c.id));
      const isOccupied = occupiedPropertyIds.has(prop.id);

      const activeContract = activeContracts.find((c) => c.property_id === prop.id);
      const monthlyRent = activeContract?.monthly_rent ?? 0;

      const propPayments = allRentPayments.filter((p) => propContractIdSet.has(p.contract_id));

      const totalCollected = propPayments
        .filter((p) => p.status === 'paid')
        .reduce((sum, p) => sum + (p.amount ?? 0), 0);

      const totalOverdue = propPayments
        .filter((p) => p.status === 'overdue')
        .reduce((sum, p) => sum + (p.amount ?? 0), 0);

      const occupancyMonths = propContracts.reduce((sum, c) => {
        if (!c.lease_start) return sum;
        const start = new Date(c.lease_start);
        const end = c.lease_end ? new Date(c.lease_end) : now;
        const months =
          (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
        return sum + Math.max(0, months);
      }, 0);

      return {
        property_id: prop.id,
        property_name: prop.name,
        monthly_rent: monthlyRent,
        total_collected: totalCollected,
        total_overdue: totalOverdue,
        occupancy_months: occupancyMonths,
        is_occupied: isOccupied,
      };
    });

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

// Wrap with unstable_cache for 1-hour TTL to prevent serial N+1 queries on concurrent landlords.
// Cache is per-user — invalidate tag 'analytics-{userId}' when data changes.
export function getLandlordAnalytics(userId: string): Promise<AnalyticsResult> {
  return unstable_cache(() => computeLandlordAnalytics(userId), [`analytics-${userId}`], {
    revalidate: 3600,
    tags: [`analytics-${userId}`],
  })();
}
