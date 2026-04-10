-- Rent ledger repurpose: tenant can claim "I paid" which creates a
-- payment_claimed notification for the landlord to confirm.
-- Add the new notification type to the CHECK constraint.

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'payment_due', 'payment_overdue', 'payment_claimed', 'lease_expiry',
  'penalty_raised', 'penalty_appeal', 'penalty_resolved',
  'maintenance_raised', 'maintenance_updated',
  'tier_expiry_warning', 'tier_downgraded',
  'lease_renewal_offer', 'lease_renewal_response',
  'renewal_signing_reminder',
  'custom'
));

-- Track who claimed a payment (tenant) vs who confirmed it (landlord).
-- confirmed_by already exists from 20260408000002_payment_confirmation.sql.
-- claimed_by + claimed_at are new.
ALTER TABLE payments ADD COLUMN IF NOT EXISTS claimed_by UUID REFERENCES profiles(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS claimed_note TEXT;
