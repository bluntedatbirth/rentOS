-- Atomic rate-limit increment. Replaces the read-modify-write pattern in
-- lib/rateLimit/persistent.ts incrementWindow() which could lose increments
-- under concurrent requests (two calls both read count=N, both write N+1).
--
-- Single INSERT ... ON CONFLICT DO UPDATE SET count = count + 1 is atomic
-- at the Postgres level — no race window.

CREATE OR REPLACE FUNCTION public.increment_rate_limit(
  p_user_id UUID,
  p_endpoint TEXT,
  p_window_start TIMESTAMPTZ
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.ai_rate_limits (user_id, endpoint, window_start, count)
  VALUES (p_user_id, p_endpoint, p_window_start, 1)
  ON CONFLICT (user_id, endpoint, window_start)
  DO UPDATE SET count = public.ai_rate_limits.count + 1;
$$;

-- Grant execute to service role only — this is called from server-side rate-limit code.
REVOKE ALL ON FUNCTION public.increment_rate_limit(UUID, TEXT, TIMESTAMPTZ) FROM public;
GRANT EXECUTE ON FUNCTION public.increment_rate_limit(UUID, TEXT, TIMESTAMPTZ) TO service_role;
