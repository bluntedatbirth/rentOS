-- Contract AI analysis cache
-- Stores Claude's analysis results per contract to avoid re-running on every view

CREATE TABLE IF NOT EXISTS contract_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE UNIQUE,
  risks JSONB NOT NULL DEFAULT '[]',
  missing_clauses JSONB NOT NULL DEFAULT '[]',
  summary_en TEXT,
  summary_th TEXT,
  clause_ratings JSONB NOT NULL DEFAULT '[]',
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE contract_analyses ENABLE ROW LEVEL SECURITY;

-- Only the contract owner can read the analysis
CREATE POLICY owner_read ON contract_analyses FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contracts c
      WHERE c.id = contract_analyses.contract_id
        AND c.landlord_id = auth.uid()
    )
  );
