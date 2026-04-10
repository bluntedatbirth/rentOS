-- M6: Narrow founding_member backfill (forward-looking correction)
--
-- Context: 20260409_founding_member_flag.sql ran
--   UPDATE profiles SET founding_member = true WHERE created_at < NOW()
-- which marked every profile including dev/seed accounts as founding members.
--
-- Dev email domain confirmed from app/api/dev/seed-user/route.ts:
--   landlord@rentos.dev, tenant@rentos.dev
--
-- Reset founding_member for known dev/seed account patterns.
-- Real beta users who signed up legitimately keep their founding_member = true.
--
-- Future beta signups: app/auth/callback/route.ts uses service-role adminClient
-- and inserts founding_member: true per-signup — this backfill is for the
-- initial migration window only.

UPDATE profiles
SET founding_member = false
WHERE
  -- Known dev seed domains
  id IN (
    SELECT id FROM auth.users
    WHERE email ILIKE '%@rentos.dev'
       OR email ILIKE '%@example.com'
  );

-- Add explanatory comment for future devs
COMMENT ON COLUMN profiles.founding_member IS
  'True for beta users who signed up before the founding member cutoff. '
  'Set per-signup in app/auth/callback/route.ts via service role. '
  'Dev/seed accounts (@rentos.dev, @example.com) are explicitly excluded.';
