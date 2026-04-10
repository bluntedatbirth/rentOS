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

export async function checkRateLimit(
  userId: string,
  endpoint: string,
  maxPerHour: number,
  maxPerDay: number
): Promise<RateLimitResult> {
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

    // 5. Atomically increment the current hour's window via upsert.
    // onConflict targets the unique index on (user_id, endpoint, window_start).
    const { error: upsertError } = await supabase
      .from('ai_rate_limits')
      .upsert(
        { user_id: userId, endpoint, window_start: hourStart, count: 1 },
        { onConflict: 'user_id,endpoint,window_start', ignoreDuplicates: false }
      );

    if (upsertError) {
      console.error('[rateLimit] upsert failed:', upsertError.message);
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
