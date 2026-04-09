-- Add new notification types for tier expiry
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'payment_due', 'payment_overdue', 'lease_expiry',
  'penalty_raised', 'penalty_appeal', 'penalty_resolved',
  'maintenance_raised', 'maintenance_updated',
  'tier_expiry_warning', 'tier_downgraded',
  'custom'
));
