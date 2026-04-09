CREATE TABLE IF NOT EXISTS penalty_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  landlord_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  clause_id TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('late_payment', 'lease_violation', 'custom')),
  trigger_days INTEGER NOT NULL DEFAULT 1,
  penalty_amount NUMERIC NOT NULL,
  penalty_description TEXT,
  auto_apply BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE penalty_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY landlord_all ON penalty_rules FOR ALL TO authenticated
  USING (landlord_id = auth.uid()) WITH CHECK (landlord_id = auth.uid());

CREATE INDEX penalty_rules_contract_idx ON penalty_rules(contract_id);
