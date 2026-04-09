CREATE TABLE IF NOT EXISTS notification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('payment_due', 'payment_overdue', 'lease_expiry', 'custom')),
  days_offset INTEGER NOT NULL DEFAULT 3,
  message_template TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY landlord_all ON notification_rules FOR ALL TO authenticated
  USING (landlord_id = auth.uid()) WITH CHECK (landlord_id = auth.uid());

CREATE INDEX notification_rules_landlord_idx ON notification_rules(landlord_id);
