-- H8: Document contract_analyses policy intent
-- The table has no INSERT/UPDATE/DELETE policies for user roles by design.
-- All writes go through the service role key (AI analysis routes).
-- Reads are restricted to the contract owner (landlord) via the owner_read policy.

COMMENT ON TABLE contract_analyses IS
  'AI analysis results. Writes are service-role only (no user policies defined). Reads limited to landlord-owner via contract join.';
