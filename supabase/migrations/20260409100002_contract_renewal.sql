-- Add renewal tracking columns to contracts
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS renewed_from UUID REFERENCES contracts(id);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS renewal_changes JSONB;

-- Add new notification types for renewal
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'payment_due', 'payment_overdue', 'lease_expiry',
  'penalty_raised', 'penalty_appeal', 'penalty_resolved',
  'maintenance_raised', 'maintenance_updated',
  'tier_expiry_warning', 'tier_downgraded',
  'lease_renewal_offer', 'lease_renewal_response',
  'custom'
));

CREATE INDEX IF NOT EXISTS contracts_renewed_from_idx ON contracts(renewed_from);
