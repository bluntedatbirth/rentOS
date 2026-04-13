-- ============================================================
-- T1 Migration: Property Pairing & Shell Properties
-- ============================================================
--
-- Introduces two new concepts to the properties table:
--
-- 1. PAIR CODE — landlords generate a short code that tenants
--    enter in the companion app to link themselves to a property.
--    Only non-shell (landlord-owned) properties carry a pair_code.
--
-- 2. SHELL PROPERTIES — tenant-owned placeholder rows created
--    in the companion app before a landlord has paired. Once a
--    landlord pairs, the shell is merged/replaced. Shell rows
--    have landlord_id = NULL and created_by_tenant_id = <tenant>.
--
-- Existing landlord-owned rows are unaffected: is_shell defaults
-- to false, all new nullable columns default to NULL, and the
-- previous_tenant_count defaults to 0.
--
-- Existing RLS policies are NOT modified. The landlord policies
-- (properties_landlord_select/insert/update/delete) all filter on
-- `landlord_id = auth.uid()`. Since NULL = auth.uid() evaluates to
-- NULL (not TRUE) in SQL, shell rows are naturally excluded from
-- those policies — no changes needed.
--
-- Idempotent: all ADD COLUMN statements use IF NOT EXISTS.
-- ============================================================


-- ============================================================
-- Section 1: Drop NOT NULL on landlord_id
-- Shell rows belong to tenants and have no landlord reference.
-- ============================================================

ALTER TABLE properties
  ALTER COLUMN landlord_id DROP NOT NULL;


-- ============================================================
-- Section 2: New columns
-- ============================================================

-- Pair code: 8-char alphanumeric, generated on demand by the landlord.
-- Only present on non-shell (landlord-owned) properties.
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS pair_code TEXT;

-- Audit trail: when was the pair_code last rotated/generated.
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS pair_code_rotated_at TIMESTAMPTZ;

-- Distinguishes tenant-created shell properties from landlord-owned ones.
-- Defaults to false so all existing rows stay landlord-owned.
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS is_shell BOOLEAN NOT NULL DEFAULT false;

-- Set when is_shell = true — the tenant who created this placeholder.
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS created_by_tenant_id UUID REFERENCES profiles(id);

-- Lease dates: denormalised onto the property for fast status computation.
-- Application layer is responsible for keeping these in sync with the
-- active contract when a landlord is paired.
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS lease_start DATE;

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS lease_end DATE;

-- Monthly rent: denormalised for dashboard display without joining contracts.
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS monthly_rent NUMERIC(10,2);

-- The currently paired tenant (set on successful pair, cleared on unpair).
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS current_tenant_id UUID REFERENCES profiles(id);

-- How many tenants have previously occupied this property.
-- Incremented each time a tenant is unpaired.
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS previous_tenant_count SMALLINT NOT NULL DEFAULT 0;

-- The most recent departed tenant — kept for grace-period access.
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS last_tenant_id UUID REFERENCES profiles(id);

-- 14-day window after unpair during which last_tenant_id can still read
-- the property (e.g. to download their contract / payment history).
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMPTZ;


-- ============================================================
-- Section 3: Shape constraint
-- Enforces mutual exclusivity between landlord-owned and shell rows.
-- A property must be exactly one of:
--   • Landlord-owned: is_shell=false, landlord_id set, no tenant creator
--   • Shell:          is_shell=true,  landlord_id NULL, created_by_tenant_id set
-- ============================================================

ALTER TABLE properties
  DROP CONSTRAINT IF EXISTS properties_owner_shape;

ALTER TABLE properties
  ADD CONSTRAINT properties_owner_shape CHECK (
    (
      is_shell = false
      AND landlord_id IS NOT NULL
      AND created_by_tenant_id IS NULL
    )
    OR
    (
      is_shell = true
      AND landlord_id IS NULL
      AND created_by_tenant_id IS NOT NULL
    )
  );


-- ============================================================
-- Section 4: Unique partial index on pair_code
-- Only one non-shell property may hold any given pair_code at a time.
-- NULL pair_codes and shell rows are excluded from the uniqueness check.
-- ============================================================

DROP INDEX IF EXISTS properties_pair_code_unique;

CREATE UNIQUE INDEX properties_pair_code_unique
  ON properties(pair_code)
  WHERE pair_code IS NOT NULL AND is_shell = false;


-- ============================================================
-- Section 5: RLS policies — tenant access to shell properties
--
-- Landlord policies already exist and need no changes:
--   properties_landlord_select  USING (landlord_id = auth.uid())
--   properties_landlord_insert  WITH CHECK (landlord_id = auth.uid())
--   properties_landlord_update  USING/WITH CHECK (landlord_id = auth.uid())
--   properties_landlord_delete  USING (landlord_id = auth.uid())
--
-- Because landlord_id IS NULL on shell rows, those policies will
-- never match a shell row (NULL = uid() is NULL, not TRUE).
-- The new policies below grant tenants the access they need on
-- their own shell rows, and a grace-period read on recently
-- vacated landlord properties.
-- ============================================================

-- Tenants can create their own shell properties.
DROP POLICY IF EXISTS tenant_insert_own_shell ON properties;
CREATE POLICY tenant_insert_own_shell
  ON properties
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_shell = true
    AND created_by_tenant_id = auth.uid()
  );

-- Tenants can read their own shell properties.
DROP POLICY IF EXISTS tenant_read_own_shell ON properties;
CREATE POLICY tenant_read_own_shell
  ON properties
  FOR SELECT
  TO authenticated
  USING (
    is_shell = true
    AND created_by_tenant_id = auth.uid()
  );

-- Tenants can update their own shell properties.
DROP POLICY IF EXISTS tenant_update_own_shell ON properties;
CREATE POLICY tenant_update_own_shell
  ON properties
  FOR UPDATE
  TO authenticated
  USING (
    is_shell = true
    AND created_by_tenant_id = auth.uid()
  )
  WITH CHECK (
    is_shell = true
    AND created_by_tenant_id = auth.uid()
  );

-- Tenants can delete their own shell properties.
DROP POLICY IF EXISTS tenant_delete_own_shell ON properties;
CREATE POLICY tenant_delete_own_shell
  ON properties
  FOR DELETE
  TO authenticated
  USING (
    is_shell = true
    AND created_by_tenant_id = auth.uid()
  );

-- Grace-period read: a recently unpaired tenant can still read the
-- landlord-owned property for 14 days after unpair, provided the
-- property is still active.
DROP POLICY IF EXISTS tenant_grace_period_read ON properties;
CREATE POLICY tenant_grace_period_read
  ON properties
  FOR SELECT
  TO authenticated
  USING (
    last_tenant_id = auth.uid()
    AND grace_period_ends_at > NOW()
    AND is_active = true
  );


-- ============================================================
-- Notify PostgREST to reload its schema cache.
-- ============================================================
NOTIFY pgrst, 'reload schema';
