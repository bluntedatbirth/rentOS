CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  landlord_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('contract', 'tenant_id', 'inspection', 'receipt', 'other')),
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY landlord_all ON documents FOR ALL TO authenticated
  USING (landlord_id = auth.uid()) WITH CHECK (landlord_id = auth.uid());

-- Tenants can view documents for their active contracts
CREATE POLICY tenant_select ON documents FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM contracts c
    WHERE c.id = documents.contract_id AND c.tenant_id = auth.uid() AND c.status = 'active'
  ));

CREATE INDEX documents_property_idx ON documents(property_id);
CREATE INDEX documents_contract_idx ON documents(contract_id);
CREATE INDEX documents_category_idx ON documents(landlord_id, category);
