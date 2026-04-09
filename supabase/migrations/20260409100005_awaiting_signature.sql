-- Add 'awaiting_signature' status for contracts (tenant accepted, awaiting physical signing)
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_status_check;
ALTER TABLE contracts ADD CONSTRAINT contracts_status_check
  CHECK (status IN ('pending', 'active', 'awaiting_signature', 'expired', 'terminated'));

-- Add 'renewal_signing_reminder' notification type
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'payment_due', 'payment_overdue', 'lease_expiry',
  'penalty_raised', 'penalty_appeal', 'penalty_resolved',
  'maintenance_raised', 'maintenance_updated',
  'tier_expiry_warning', 'tier_downgraded',
  'lease_renewal_offer', 'lease_renewal_response',
  'renewal_signing_reminder',
  'custom'
));
