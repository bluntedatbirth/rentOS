-- Add notification preferences to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{}'::jsonb;

-- Add pairing fields to contracts
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS pairing_code text;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS pairing_expires_at timestamptz;

-- Add co-tenants to contracts (array of {full_name, phone})
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS co_tenants jsonb DEFAULT '[]'::jsonb;

-- Index for pairing code lookups
CREATE INDEX IF NOT EXISTS idx_contracts_pairing_code ON contracts(pairing_code) WHERE pairing_code IS NOT NULL;
