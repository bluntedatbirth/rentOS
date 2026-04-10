-- C4 support: Add self-read SELECT policies on ai_rate_limits and ai_spend_log
-- Users can view their own records (for future usage UI).
-- Writes remain service-role only (no write policies defined for user roles).

CREATE POLICY "ai_rate_limits_self_read"
  ON ai_rate_limits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "ai_spend_log_self_read"
  ON ai_spend_log FOR SELECT
  USING (auth.uid() = user_id);

-- Rate limiter RPC for H4 race-condition fix (used by lib/rateLimit/persistent.ts)
-- SECURITY DEFINER: function runs as owner (postgres) with full table access
-- regardless of caller role, enabling atomic upsert from service role.
-- REVOKE from PUBLIC + GRANT to service_role limits exposure.
CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_user_id uuid,
  p_endpoint text,
  p_window_start timestamptz
) RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count int;
BEGIN
  INSERT INTO ai_rate_limits (user_id, endpoint, window_start, count)
  VALUES (p_user_id, p_endpoint, p_window_start, 1)
  ON CONFLICT (user_id, endpoint, window_start)
  DO UPDATE SET count = ai_rate_limits.count + 1
  RETURNING count INTO new_count;
  RETURN new_count;
END;
$$;

REVOKE ALL ON FUNCTION increment_rate_limit FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_rate_limit TO service_role;
