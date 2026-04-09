-- Add 'pending' status for contracts without a paired tenant
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_status_check;
ALTER TABLE contracts ADD CONSTRAINT contracts_status_check
  CHECK (status IN ('pending', 'active', 'expired', 'terminated'));

-- Default new contracts to 'pending'
ALTER TABLE contracts ALTER COLUMN status SET DEFAULT 'pending';

-- Retroactively mark unpaired contracts as pending
UPDATE contracts SET status = 'pending' WHERE tenant_id IS NULL AND status = 'active';
