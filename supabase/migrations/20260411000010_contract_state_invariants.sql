-- P1-B: DB-level contract state machine trigger
-- Source: data-model-audit.md Finding CL-1
-- Enforces invariants that were already enforced in app code (activate.ts) but
-- proved insufficient in production (FEAT-4: contracts were set active with no
-- clauses via direct dashboard edits / service-role calls bypassing app code).
--
-- activateContract() in lib/contracts/activate.ts ALREADY checks all three
-- invariants before issuing the status UPDATE, so this trigger will not break
-- the normal activation path.  The trigger is an additional safety net for:
--   - Supabase dashboard direct edits
--   - Service-role API routes that bypass activateContract()
--   - Future code paths

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Trigger function
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION enforce_contract_state_invariants()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'active' THEN
    -- Must have at least one parsed clause
    IF NEW.structured_clauses IS NULL OR jsonb_array_length(NEW.structured_clauses) = 0 THEN
      RAISE EXCEPTION 'Cannot set contract active: structured_clauses is empty';
    END IF;

    -- lease_start must exist and must have already arrived (not a future date)
    IF NEW.lease_start IS NULL OR NEW.lease_start > CURRENT_DATE THEN
      RAISE EXCEPTION 'Cannot set contract active: lease_start has not arrived (value: %)',
        COALESCE(NEW.lease_start::TEXT, 'NULL');
    END IF;

    -- A tenant must be paired before activation
    IF NEW.tenant_id IS NULL THEN
      RAISE EXCEPTION 'Cannot set contract active: no tenant';
    END IF;
  END IF;

  -- pending is the pre-parse waiting state; no clause requirement at this stage
  -- (other statuses are not constrained by this trigger)

  RETURN NEW;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Attach trigger (drop first so re-runs are idempotent)
-- ──────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS contracts_state_invariants ON contracts;

CREATE TRIGGER contracts_state_invariants
  BEFORE INSERT OR UPDATE OF status ON contracts
  FOR EACH ROW EXECUTE FUNCTION enforce_contract_state_invariants();

NOTIFY pgrst, 'reload schema';
