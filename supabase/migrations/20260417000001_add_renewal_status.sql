-- ============================================================
-- Sprint 3 — Add 'renewal' to contracts.status CHECK
-- 20260417000001_add_renewal_status.sql
-- ============================================================
-- Context: The audit (project_audit_2026_04_16.md, P1 / "Schema / state machines")
-- flagged that 'renewal' appears in the PM-spec lifecycle and in
-- lib/supabase/types.ts domain types but was never added to the DB
-- CHECK constraint. No app code currently sets status='renewal';
-- this migration makes the constraint future-proof so a renewal
-- state machine step can be introduced without a DB error.
--
-- Current allowed values (from 20260409120000_contract_state_machine.sql,
-- verified no later migration changes the constraint):
--   pending, active, awaiting_signature, scheduled, parse_failed,
--   expired, terminated
--
-- After this migration:
--   pending, active, awaiting_signature, scheduled, parse_failed,
--   expired, terminated, renewal
--
-- Idempotent: the DROP IF EXISTS + re-create pattern is safe to
-- run multiple times.
-- ============================================================

BEGIN;

ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_status_check;

ALTER TABLE contracts
  ADD CONSTRAINT contracts_status_check
  CHECK (status IN (
    'pending',
    'active',
    'awaiting_signature',
    'scheduled',
    'parse_failed',
    'expired',
    'terminated',
    'renewal'
  ));

COMMENT ON CONSTRAINT contracts_status_check ON contracts IS
  'Allowed contract lifecycle states. renewal = active lease is in the offer/negotiation '
  'phase before tenant signs (distinct from awaiting_signature which guards physical signing). '
  'Added ''renewal'' in sprint-3 migration 20260417000001.';

COMMIT;
