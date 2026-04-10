-- Update default notification_preferences so new users start with only
-- payment_due and lease_expiry enabled (reduces spam for new landlords).
-- Existing users with explicitly saved preferences are not affected because
-- the DEFAULT only applies on INSERT.

ALTER TABLE profiles
  ALTER COLUMN notification_preferences
  SET DEFAULT '{"payment_due":true,"payment_overdue":false,"lease_expiry":true,"penalty_raised":false,"penalty_appeal":false,"maintenance_raised":false,"maintenance_updated":false,"tenant_paired":false}'::jsonb;
