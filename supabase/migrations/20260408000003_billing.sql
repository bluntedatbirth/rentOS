-- Billing fields for Omise integration and tier management

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS omise_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS omise_schedule_id TEXT,
  ADD COLUMN IF NOT EXISTS tier_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly';
