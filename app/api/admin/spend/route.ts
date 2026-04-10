import { getAuthenticatedUser } from '@/lib/supabase/api';
import { forbidden, unauthorized, serverError } from '@/lib/apiErrors';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/auth/admin';

const BUDGET_LIMIT_USD = 100;
const THRESHOLD_PCT = 0.8;

interface SpendRow {
  endpoint: string;
  cost_usd: number;
  input_tokens: number;
  output_tokens: number;
  called_at: string;
}

export async function GET() {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();
  if (!isAdmin(user.id)) return forbidden();

  const supabase = createServiceRoleClient();
  const now = new Date();

  // Current month start
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Last 30 days start
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch last 30 days of spend rows
  const { data: rows, error } = await supabase
    .from('ai_spend_log')
    .select('endpoint, cost_usd, input_tokens, output_tokens, called_at')
    .gte('called_at', thirtyDaysAgo)
    .order('called_at', { ascending: true });

  if (error) {
    // Table may not exist yet (migration pending) — return zeroed payload rather than 500
    if (error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
      console.warn('[admin/spend] ai_spend_log table not found — migration pending');
      return Response.json({
        total_this_month_usd: 0,
        total_last_30_days_usd: 0,
        top_endpoints: [],
        daily_breakdown: [],
        budget: {
          limit_usd: BUDGET_LIMIT_USD,
          used_usd: 0,
          percent_used: 0,
          threshold_breached: false,
        },
        _notice: 'ai_spend_log table pending migration',
      });
    }
    console.error('[admin/spend] query error:', error.message);
    return serverError('Failed to query spend log');
  }

  const allRows: SpendRow[] = (rows ?? []) as SpendRow[];

  // Total this month
  const thisMonthRows = allRows.filter((r) => r.called_at >= monthStart);
  const totalThisMonth = thisMonthRows.reduce((s, r) => s + r.cost_usd, 0);

  // Total last 30 days
  const totalLast30Days = allRows.reduce((s, r) => s + r.cost_usd, 0);

  // Top 5 endpoints by cost (last 30 days)
  const endpointMap: Record<string, number> = {};
  for (const r of allRows) {
    endpointMap[r.endpoint] = (endpointMap[r.endpoint] ?? 0) + r.cost_usd;
  }
  const topEndpoints = Object.entries(endpointMap)
    .map(([endpoint, cost_usd]) => ({ endpoint, cost_usd }))
    .sort((a, b) => b.cost_usd - a.cost_usd)
    .slice(0, 5);

  // Daily breakdown last 30 days — group in JS
  const dailyMap: Record<
    string,
    { cost_usd: number; input_tokens: number; output_tokens: number }
  > = {};
  for (const r of allRows) {
    const day = r.called_at.slice(0, 10); // YYYY-MM-DD
    if (!dailyMap[day]) {
      dailyMap[day] = { cost_usd: 0, input_tokens: 0, output_tokens: 0 };
    }
    dailyMap[day]!.cost_usd += r.cost_usd;
    dailyMap[day]!.input_tokens += r.input_tokens;
    dailyMap[day]!.output_tokens += r.output_tokens;
  }
  const dailyBreakdown = Object.entries(dailyMap)
    .map(([day, vals]) => ({ day, ...vals }))
    .sort((a, b) => a.day.localeCompare(b.day));

  const percentUsed = totalThisMonth / BUDGET_LIMIT_USD;

  return Response.json({
    total_this_month_usd: totalThisMonth,
    total_last_30_days_usd: totalLast30Days,
    top_endpoints: topEndpoints,
    daily_breakdown: dailyBreakdown,
    budget: {
      limit_usd: BUDGET_LIMIT_USD,
      used_usd: totalThisMonth,
      percent_used: percentUsed,
      threshold_breached: percentUsed >= THRESHOLD_PCT,
    },
  });
}
