-- Contract State Machine: add new statuses, enforce invariants, clean bad data

-- 1. Update the status CHECK constraint to include two new states
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_status_check;
ALTER TABLE contracts ADD CONSTRAINT contracts_status_check CHECK (status IN (
  'pending', 'active', 'awaiting_signature', 'scheduled', 'parse_failed', 'expired', 'terminated'
));

-- 2. Clean up existing bad data BEFORE creating the unique index
--    (the index would reject the current table state otherwise)

-- Active contracts with no parsed clauses → parse_failed
UPDATE contracts
  SET status = 'parse_failed'
  WHERE status = 'active'
    AND (structured_clauses IS NULL OR jsonb_array_length(structured_clauses) = 0);

-- Active contracts with future lease_start → scheduled
UPDATE contracts
  SET status = 'scheduled'
  WHERE status = 'active'
    AND lease_start > CURRENT_DATE
    AND structured_clauses IS NOT NULL
    AND jsonb_array_length(structured_clauses) > 0;

-- If two or more contracts are still 'active' on the same property after cleanup,
-- keep the newest one and move the older ones to 'terminated'. The PO can
-- re-activate the correct row later if the wrong one wins.
WITH ranked AS (
  SELECT id,
         property_id,
         ROW_NUMBER() OVER (
           PARTITION BY property_id
           ORDER BY created_at DESC, id DESC
         ) AS rn
  FROM contracts
  WHERE status = 'active'
)
UPDATE contracts
  SET status = 'terminated'
  WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 3. Unique partial index: only one active contract per property
CREATE UNIQUE INDEX IF NOT EXISTS contracts_one_active_per_property
  ON contracts(property_id) WHERE status = 'active';
