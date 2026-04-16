// IMPORTANT: ai_rate_limits and ai_spend_log have RLS enabled with NO permissive policies.
// ALL queries to these tables MUST use createServiceRoleClient() — the anon/authenticated
// client will receive zero rows or permission errors under RLS.
import { createServiceRoleClient } from '@/lib/supabase/server';

type RateLimitResult =
  | { allowed: true }
  | {
      allowed: false;
      reason: 'hourly' | 'daily' | 'global' | 'user_daily_spend';
      retryAfterSeconds: number;
    };

/** Seconds until midnight UTC from now */
function secondsUntilMidnightUTC(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setUTCHours(24, 0, 0, 0);
  return Math.ceil((midnight.getTime() - now.getTime()) / 1000);
}

/** ISO string for start of today UTC */
function todayStartUTC(): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  ).toISOString();
}

/** ISO string for current hour truncated (UTC) */
function currentHourUTC(): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours())
  ).toISOString();
}

/** ISO string for one hour ago (UTC) */
function oneHourAgoUTC(): string {
  return new Date(Date.now() - 3600 * 1000).toISOString();
}

/** Comma-separated list of user IDs OR emails that bypass all rate limits (dev/test accounts). */
const BYPASS_LIST = (process.env.RATE_LIMIT_BYPASS ?? '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

/** Check if a user (by id or email) is on the bypass list. */
export function isRateLimitBypassed(userIdOrEmail: string): boolean {
  return BYPASS_LIST.includes(userIdOrEmail.toLowerCase());
}

export interface RateLimitOptions {
  /**
   * If true, only check the limits — do NOT increment the counter.
   * Caller is expected to call `incrementRateLimit()` after the operation
   * succeeds. Used for long-running AI operations where we only want to
   * count successful completions against the limit.
   */
  skipIncrement?: boolean;
}

export async function checkRateLimit(
  userId: string,
  endpoint: string,
  maxPerHour: number,
  maxPerDay: number,
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  // Dev/test accounts bypass all rate limits
  if (BYPASS_LIST.includes(userId.toLowerCase())) {
    return { allowed: true };
  }

  const supabase = createServiceRoleClient();
  const retrySeconds = secondsUntilMidnightUTC();
  const todayStart = todayStartUTC();
  const hourStart = currentHourUTC();
  const oneHourAgo = oneHourAgoUTC();

  try {
    // 1. Check global daily spend ceiling
    const dailySpendLimit = parseFloat(process.env.DAILY_AI_SPEND_LIMIT_USD ?? '20');
    const { data: globalSpendData, error: globalSpendError } = await supabase
      .from('ai_spend_log')
      .select('cost_usd')
      .gte('called_at', todayStart);

    if (!globalSpendError && globalSpendData) {
      const globalTotal = globalSpendData.reduce((sum, r) => sum + Number(r.cost_usd), 0);
      if (globalTotal >= dailySpendLimit) {
        console.warn(
          `[rateLimit] Global daily spend limit reached: $${globalTotal.toFixed(4)} >= $${dailySpendLimit}`
        );
        return { allowed: false, reason: 'global', retryAfterSeconds: retrySeconds };
      }
    }

    // 2. Check per-user daily spend ceiling
    const perUserDailyLimit = parseFloat(process.env.PER_USER_DAILY_SPEND_LIMIT_USD ?? '2');
    const { data: userSpendData, error: userSpendError } = await supabase
      .from('ai_spend_log')
      .select('cost_usd')
      .eq('user_id', userId)
      .gte('called_at', todayStart);

    if (!userSpendError && userSpendData) {
      const userTotal = userSpendData.reduce((sum, r) => sum + Number(r.cost_usd), 0);
      if (userTotal >= perUserDailyLimit) {
        return { allowed: false, reason: 'user_daily_spend', retryAfterSeconds: retrySeconds };
      }
    }

    // 3. Check hourly call count
    const { data: hourlyData, error: hourlyError } = await supabase
      .from('ai_rate_limits')
      .select('count')
      .eq('user_id', userId)
      .eq('endpoint', endpoint)
      .gte('window_start', oneHourAgo);

    if (!hourlyError && hourlyData) {
      const hourlyTotal = hourlyData.reduce((sum, r) => sum + Number(r.count), 0);
      if (hourlyTotal >= maxPerHour) {
        return { allowed: false, reason: 'hourly', retryAfterSeconds: 3600 };
      }
    }

    // 4. Check daily call count
    const { data: dailyData, error: dailyError } = await supabase
      .from('ai_rate_limits')
      .select('count')
      .eq('user_id', userId)
      .eq('endpoint', endpoint)
      .gte('window_start', todayStart);

    if (!dailyError && dailyData) {
      const dailyTotal = dailyData.reduce((sum, r) => sum + Number(r.count), 0);
      if (dailyTotal >= maxPerDay) {
        return { allowed: false, reason: 'daily', retryAfterSeconds: retrySeconds };
      }
    }

    // 5. Increment the current hour's window — unless caller opted out
    // (skipIncrement is used for long-running AI ops that only want to
    // count SUCCESSFUL completions; the caller invokes incrementRateLimit
    // after the operation succeeds).
    if (!options.skipIncrement) {
      await incrementWindow(supabase, userId, endpoint, hourStart);
    }

    return { allowed: true };
  } catch (err) {
    // Fail closed — if the rate-limit DB is unreachable, deny the request to prevent
    // unbounded AI spend. Log loudly so this is never missed.
    console.error(
      '[rateLimit] checkRateLimit threw — FAILING CLOSED (rate_limit_unavailable):',
      err
    );
    return { allowed: false, reason: 'global', retryAfterSeconds: 60 };
  }
}

/**
 * Read-modify-write a single (user, endpoint, window_start) row, incrementing
 * its `count` by 1. Not perfectly atomic under concurrent callers — acceptable
 * for our workload (one heavy AI op per user at a time). Race results in at
 * worst an undercount, which errs in the user's favor.
 */
async function incrementWindow(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  endpoint: string,
  hourStart: string
): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from('ai_rate_limits')
      .select('count')
      .eq('user_id', userId)
      .eq('endpoint', endpoint)
      .eq('window_start', hourStart)
      .maybeSingle();

    const nextCount = (existing?.count ?? 0) + 1;

    const { error: upsertError } = await supabase
      .from('ai_rate_limits')
      .upsert(
        { user_id: userId, endpoint, window_start: hourStart, count: nextCount },
        { onConflict: 'user_id,endpoint,window_start', ignoreDuplicates: false }
      );

    if (upsertError) {
      console.error('[rateLimit] incrementWindow upsert failed:', upsertError.message);
    }
  } catch (err) {
    console.error('[rateLimit] incrementWindow threw:', err);
  }
}

/**
 * Increment a user's rate-limit counter for an endpoint, bucketed by the
 * current hour UTC. Call this AFTER an operation successfully completes
 * when you used `checkRateLimit(..., { skipIncrement: true })` so only
 * successful ops count toward the daily limit.
 */
export async function incrementRateLimit(userId: string, endpoint: string): Promise<void> {
  const supabase = createServiceRoleClient();
  await incrementWindow(supabase, userId, endpoint, currentHourUTC());
}

/**
 * Return the user's current successful-call totals for the last hour and
 * the current UTC day for a given endpoint. Used by the UI to show cooldown
 * state in the notification bell.
 */
export async function getRateLimitUsage(
  userId: string,
  endpoint: string
): Promise<{ hourly: number; daily: number }> {
  try {
    const supabase = createServiceRoleClient();
    const todayStart = todayStartUTC();
    const oneHourAgo = oneHourAgoUTC();

    const { data: dailyRows } = await supabase
      .from('ai_rate_limits')
      .select('count, window_start')
      .eq('user_id', userId)
      .eq('endpoint', endpoint)
      .gte('window_start', todayStart);

    const daily = (dailyRows ?? []).reduce(
      (sum: number, r: { count: number }) => sum + Number(r.count),
      0
    );
    const hourly = (dailyRows ?? [])
      .filter((r: { window_start: string }) => r.window_start >= oneHourAgo)
      .reduce((sum: number, r: { count: number }) => sum + Number(r.count), 0);

    return { hourly, daily };
  } catch (err) {
    console.error('[rateLimit] getRateLimitUsage threw:', err);
    return { hourly: 0, daily: 0 };
  }
}

export async function logAISpend(
  userId: string,
  endpoint: string,
  inputTokens: number,
  outputTokens: number
): Promise<void> {
  // Claude Sonnet 4 pricing: $3/M input, $15/M output
  const costUsd = (inputTokens / 1_000_000) * 3 + (outputTokens / 1_000_000) * 15;

  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from('ai_spend_log').insert({
      user_id: userId,
      endpoint,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_usd: costUsd,
    });

    if (error) {
      console.error('[rateLimit] logAISpend insert failed:', error.message);
    }
  } catch (err) {
    // Swallow errors — spend logging must never fail the actual API call
    console.error('[rateLimit] logAISpend threw:', err);
  }
}
