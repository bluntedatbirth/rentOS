-- Add payment confirmation tracking columns
ALTER TABLE payments ADD COLUMN IF NOT EXISTS confirmation_date TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS confirmed_by UUID REFERENCES profiles(id);
