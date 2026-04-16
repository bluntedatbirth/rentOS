-- ============================================================
-- Sprint 2 — Data Integrity Hardening
-- 20260416000002_data_integrity.sql
-- ============================================================
-- Idempotent: safe to run multiple times.
-- Run the PRE-CHECK queries below against your production DB
-- BEFORE applying this migration.
-- ============================================================

-- ============================================================
-- PRE-CHECK 1 (1A): Verify no property has multiple active/pending/scheduled contracts.
-- If this returns any rows, manually resolve the duplicates first
-- (terminate or delete the wrong contract), then re-run this migration.
--
--   SELECT property_id, count(*)
--   FROM contracts
--   WHERE status IN ('active','pending','scheduled')
--   GROUP BY property_id
--   HAVING count(*) > 1;
--
-- Suggested cleanup (run per-property, keep the correct contract id):
--   UPDATE contracts
--     SET status = 'terminated'
--     WHERE property_id = '<property_id>'
--       AND status IN ('active','pending','scheduled')
--       AND id <> '<contract_id_to_keep>';
-- ============================================================

-- ============================================================
-- PRE-CHECK 2 (1B): Clear any orphaned rate-limit rows before adding the FK.
-- If auth.users has been cleaned up but ai_rate_limits/ai_spend_log still has
-- stale rows, the FK constraint will fail.
--
-- Uncomment and run these ONLY if the FK alteration below fails:
--   DELETE FROM ai_rate_limits WHERE user_id NOT IN (SELECT id FROM auth.users);
--   DELETE FROM ai_spend_log  WHERE user_id NOT IN (SELECT id FROM auth.users);
-- ============================================================

-- ============================================================
-- PRE-CHECK 3 (1E): Verify no duplicate (contract_id, due_date) pairs exist.
-- Should be zero on a clean install — payment seeding has always been per-contract.
--
--   SELECT contract_id, due_date, count(*)
--   FROM payments
--   GROUP BY contract_id, due_date
--   HAVING count(*) > 1;
--
-- Suggested cleanup (run only if the query above returns rows):
--   DELETE FROM payments p
--   WHERE id NOT IN (
--     SELECT MIN(id) FROM payments
--     GROUP BY contract_id, due_date
--   );
-- ============================================================


-- ============================================================
-- 1A. Unique partial index: one active/pending/scheduled contract per property
-- ============================================================
-- Purpose: enforce at the DB level that a landlord-managed property can only
-- have one non-terminal contract at a time. Covers 'active', 'pending'
-- (awaiting tenant pairing), and 'scheduled' (future lease start).
-- The existing index from 20260409120000_contract_state_machine.sql only covers
-- 'active' — this replaces that narrower constraint with a broader one.
-- The WHERE clause intentionally excludes tenant-owned rows (property_id IS NULL)
-- because companion-app rows don't go through the landlord property slot system.

-- Drop the narrower index created in the state-machine migration so we can
-- replace it with the broader one that also covers pending + scheduled.
DROP INDEX IF EXISTS contracts_one_active_per_property;

CREATE UNIQUE INDEX IF NOT EXISTS contracts_one_active_per_property
  ON contracts(property_id)
  WHERE property_id IS NOT NULL
    AND status IN ('active', 'pending', 'scheduled');

COMMENT ON INDEX contracts_one_active_per_property IS
  'Enforces one non-terminal contract per landlord property. Covers active, pending '
  '(awaiting tenant pairing), and scheduled (future lease_start). Tenant-owned '
  'companion-app rows (property_id IS NULL) are excluded.';


-- ============================================================
-- 1B. FK + CASCADE DELETE on ai_rate_limits and ai_spend_log
-- ============================================================
-- Ensures rate-limit rows are automatically removed when the auth user is
-- deleted, preventing orphaned rows from biasing future rate-limit checks.

ALTER TABLE ai_rate_limits
  DROP CONSTRAINT IF EXISTS ai_rate_limits_user_id_fkey;

ALTER TABLE ai_rate_limits
  ADD CONSTRAINT ai_rate_limits_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

ALTER TABLE ai_spend_log
  DROP CONSTRAINT IF EXISTS ai_spend_log_user_id_fkey;

ALTER TABLE ai_spend_log
  ADD CONSTRAINT ai_spend_log_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;


-- ============================================================
-- 1C. payments.status CHECK constraint: add 'claimed'
-- ============================================================
-- The payments table uses a CHECK constraint (not a Postgres enum type).
-- The constraint has never been formally named, so we drop by the default
-- auto-generated name pattern and the original column definition name.
-- We drop all known variants defensively then add the canonical constraint.
--
-- Full allowed set after this migration:
--   pending  — seeded, not yet paid
--   paid     — landlord confirmed
--   overdue  — past due_date, still unpaid
--   claimed  — tenant marked as paid, awaiting landlord confirmation
--
-- Data backfill: any payment that already has claimed_at set but is still
-- 'pending' was claimed before this status value existed — correct it now.

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;

ALTER TABLE payments
  ADD CONSTRAINT payments_status_check
  CHECK (status IN ('pending', 'paid', 'overdue', 'claimed'));

-- Backfill: promote existing 'pending' rows that have claimed_at to 'claimed'
UPDATE payments
  SET status = 'claimed'
  WHERE status = 'pending'
    AND claimed_at IS NOT NULL;


-- ============================================================
-- 1E. Unique constraint on payments(contract_id, due_date)
-- ============================================================
-- Required for the ON CONFLICT idempotent upsert in lib/contracts/activate.ts.
-- A plain index (idx_payments_contract_due) already exists from
-- 20260411000013_missing_performance_indexes.sql — this adds the UNIQUE
-- constraint which is what Postgres needs to honour ON CONFLICT clauses.
-- The plain index becomes redundant once this UNIQUE constraint is in place
-- (Postgres creates an implicit index for UNIQUE constraints) but we leave it
-- to avoid breaking any query plans that reference it by name.

ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS payments_contract_id_due_date_unique;

ALTER TABLE payments
  ADD CONSTRAINT payments_contract_id_due_date_unique
  UNIQUE (contract_id, due_date);
