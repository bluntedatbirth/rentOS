-- C3: Profile tier/role column lockdown (CRITICAL BILLING BYPASS)
-- Prevents authenticated users from self-upgrading tier, role, or billing fields
-- via direct PostgREST calls. Two-layer defense: RLS WITH CHECK + column REVOKE.
--
-- NOTE: service_role key still has full access, so billing/auth callback flows
-- (app/auth/callback/route.ts uses adminClient with SUPABASE_SERVICE_ROLE_KEY)
-- that legitimately write tier/role/founding_member continue to work unaffected.

-- Layer 1: Drop the old permissive update policy and replace with a locked-down one
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

CREATE POLICY "profiles_update_own_limited"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND tier = (SELECT tier FROM profiles WHERE id = auth.uid())
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
    AND founding_member = (SELECT founding_member FROM profiles WHERE id = auth.uid())
    AND tier_expires_at IS NOT DISTINCT FROM (SELECT tier_expires_at FROM profiles WHERE id = auth.uid())
    AND omise_customer_id IS NOT DISTINCT FROM (SELECT omise_customer_id FROM profiles WHERE id = auth.uid())
    AND omise_schedule_id IS NOT DISTINCT FROM (SELECT omise_schedule_id FROM profiles WHERE id = auth.uid())
    AND billing_cycle IS NOT DISTINCT FROM (SELECT billing_cycle FROM profiles WHERE id = auth.uid())
  );

-- Layer 2: Column-level REVOKE as belt-and-suspenders
-- Even if a future policy mistake opens UPDATE, these columns cannot be changed
-- by the authenticated or anon roles.
REVOKE UPDATE (tier, role, founding_member, tier_expires_at, omise_customer_id, omise_schedule_id, billing_cycle)
  ON profiles FROM authenticated;

REVOKE UPDATE (tier, role, founding_member, tier_expires_at, omise_customer_id, omise_schedule_id, billing_cycle)
  ON profiles FROM anon;
