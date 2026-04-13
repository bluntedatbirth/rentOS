-- Team DD — companion-app pivot: tenant-owned contract rows
--
-- Before this migration, contracts.landlord_id was NOT NULL and only
-- landlords could INSERT. Tenant rows arrived only via pairing-redeem.
-- After the pivot, each user owns their own rows. Pairing becomes a
-- convenience that grants cross-visibility for a specific property.
-- Safe because there are zero tenant-created rows in production today.
--
-- Idempotent: safe to run multiple times.

-- Make landlord_id nullable so tenants can own rows without a landlord.
ALTER TABLE public.contracts
  ALTER COLUMN landlord_id DROP NOT NULL;

-- Make property_id nullable so tenant-owned rows need not reference a
-- landlord-managed property row. When landlord_id IS NOT NULL, property_id
-- remains required by application logic (enforced in the API route).
ALTER TABLE public.contracts
  ALTER COLUMN property_id DROP NOT NULL;

-- Add property_name for tenant-owned rows (free text, no FK to properties).
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS property_name TEXT;

-- Add due_day for tenant-owned rows (day of month, 1–31).
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS due_day SMALLINT CHECK (due_day >= 1 AND due_day <= 31);

-- Add notes for tenant-owned rows.
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Safety net: at least one owner must be set.
ALTER TABLE public.contracts
  DROP CONSTRAINT IF EXISTS contracts_has_owner;
ALTER TABLE public.contracts
  ADD CONSTRAINT contracts_has_owner
  CHECK (landlord_id IS NOT NULL OR tenant_id IS NOT NULL);

DROP POLICY IF EXISTS contracts_tenant_insert ON public.contracts;
CREATE POLICY contracts_tenant_insert ON public.contracts
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = auth.uid() AND landlord_id IS NULL);

-- Tenant can UPDATE their own row ONLY when no landlord is paired.
-- Once paired, the landlord is source of truth for updates.
DROP POLICY IF EXISTS contracts_tenant_update ON public.contracts;
CREATE POLICY contracts_tenant_update ON public.contracts
  FOR UPDATE TO authenticated
  USING (tenant_id = auth.uid() AND landlord_id IS NULL)
  WITH CHECK (tenant_id = auth.uid() AND landlord_id IS NULL);

DROP POLICY IF EXISTS contracts_tenant_delete ON public.contracts;
CREATE POLICY contracts_tenant_delete ON public.contracts
  FOR DELETE TO authenticated
  USING (tenant_id = auth.uid() AND landlord_id IS NULL);

-- Penalty-period notification marker (used by Team EE's cron block)
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS penalty_notified_at TIMESTAMPTZ NULL;

NOTIFY pgrst, 'reload schema';
