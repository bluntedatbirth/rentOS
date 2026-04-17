-- Atomically increment purchased_slots on a profile.
-- Used by the slot purchase flow (both synchronous card charges and
-- asynchronous webhook completions).
CREATE OR REPLACE FUNCTION increment_purchased_slots(
  p_user_id UUID,
  p_slots INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET purchased_slots = COALESCE(purchased_slots, 0) + p_slots
  WHERE id = p_user_id;
END;
$$;

-- Grant execute to service_role only (mirrors increment_rate_limit pattern)
REVOKE ALL ON FUNCTION increment_purchased_slots(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_purchased_slots(UUID, INTEGER) TO service_role;
