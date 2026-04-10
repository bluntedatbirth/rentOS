-- M7: contract_templates WITH CHECK hardening
--
-- The existing landlord_all policy allowed landlords to insert rows with
-- is_system = true, which would then be visible to all users via the
-- system_read policy — effectively letting any landlord inject "system"
-- templates visible to every other landlord.
--
-- Fix: drop and recreate with is_system = false enforced on both USING and WITH CHECK.

DROP POLICY IF EXISTS "landlord_all" ON contract_templates;

CREATE POLICY "landlord_own_non_system"
  ON contract_templates FOR ALL TO authenticated
  USING (landlord_id = auth.uid() AND is_system = false)
  WITH CHECK (landlord_id = auth.uid() AND is_system = false);
