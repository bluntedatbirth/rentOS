-- Contract templates library
-- Supports system-provided templates (is_system = true) and landlord custom templates

CREATE TABLE IF NOT EXISTS contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en TEXT NOT NULL,
  name_th TEXT NOT NULL,
  description_en TEXT,
  description_th TEXT,
  template_text TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('residential', 'condo', 'furnished', 'short_term', 'commercial')),
  is_system BOOLEAN NOT NULL DEFAULT false,
  landlord_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;

-- System templates are readable by all authenticated users
CREATE POLICY system_read ON contract_templates FOR SELECT TO authenticated
  USING (is_system = true);

-- Landlords can fully manage their own custom templates
CREATE POLICY landlord_all ON contract_templates FOR ALL TO authenticated
  USING (landlord_id = auth.uid())
  WITH CHECK (landlord_id = auth.uid());
