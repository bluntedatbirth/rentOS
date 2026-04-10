-- Add purchased_slots column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS purchased_slots INTEGER NOT NULL DEFAULT 0;

-- Track individual slot pack purchases
CREATE TABLE IF NOT EXISTS slot_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  slots_added INTEGER NOT NULL CHECK (slots_added > 0),
  amount_thb INTEGER NOT NULL CHECK (amount_thb > 0),
  omise_charge_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_slot_purchases_user ON slot_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_slot_purchases_status ON slot_purchases(status);

-- RLS
ALTER TABLE slot_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "slot_purchases_select_own" ON slot_purchases
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "slot_purchases_insert_own" ON slot_purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add slot_unlock_succeeded notification type to CHECK constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'payment_due', 'payment_overdue', 'payment_claimed', 'lease_expiry',
  'penalty_raised', 'penalty_appeal', 'penalty_resolved',
  'maintenance_raised', 'maintenance_updated',
  'tier_expiry_warning', 'tier_downgraded',
  'lease_renewal_offer', 'lease_renewal_response',
  'renewal_signing_reminder',
  'slot_unlock_succeeded',
  'custom'
));
