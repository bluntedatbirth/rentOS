import { NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorized } from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkRateLimit, getRateLimitUsage } from '@/lib/rateLimit/persistent';
import { getAILimits } from '@/lib/ai/limits';

/**
 * GET /api/ai/usage
 *
 * Returns the current user's daily AI usage and limits. Polled by the
 * notification bell so we can surface a "cooldown" indicator the moment a
 * landlord hits their daily parse/analyze budget.
 *
 * To cover ALL limit types (call-count, dollar spend, global ceiling) we
 * also dry-run `checkRateLimit` with `skipIncrement` — if that says
 * "not allowed", the endpoint is exhausted regardless of the counter.
 */
export async function GET() {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const admin = createServiceRoleClient();
  const { count: propertyCount } = await admin
    .from('properties')
    .select('id', { count: 'exact', head: true })
    .eq('landlord_id', user.id);

  const limits = getAILimits(propertyCount ?? 0);

  // Check call-count usage for display AND dry-run the full rate limiter
  // (which also checks dollar spend limits) to determine if the user is
  // actually blocked.
  const [ocrUsage, analyzeUsage, ocrCheck, analyzeCheck] = await Promise.all([
    getRateLimitUsage(user.id, 'ocr'),
    getRateLimitUsage(user.id, 'analyze'),
    checkRateLimit(user.id, 'ocr', limits.hourlyOcr, limits.dailyOcr, {
      skipIncrement: true,
      userEmail: user.email ?? undefined,
    }),
    checkRateLimit(user.id, 'analyze', limits.hourlyAnalyze, limits.dailyAnalyze, {
      skipIncrement: true,
      userEmail: user.email ?? undefined,
    }),
  ]);

  // Seconds until midnight UTC — when daily counters reset.
  const now = new Date();
  const midnight = new Date(now);
  midnight.setUTCHours(24, 0, 0, 0);
  const resetsInSeconds = Math.ceil((midnight.getTime() - now.getTime()) / 1000);

  // Exhausted if either the call-count limit OR the dollar-spend limit says no.
  const ocrExhausted = !ocrCheck.allowed || ocrUsage.daily >= limits.dailyOcr;
  const analyzeExhausted = !analyzeCheck.allowed || analyzeUsage.daily >= limits.dailyAnalyze;

  return NextResponse.json({
    ocr: {
      used: ocrUsage.daily,
      limit: limits.dailyOcr,
      exhausted: ocrExhausted,
    },
    analyze: {
      used: analyzeUsage.daily,
      limit: limits.dailyAnalyze,
      exhausted: analyzeExhausted,
    },
    resetsInSeconds,
  });
}
