-- P1-G: Add updated_at column and BEFORE UPDATE trigger to all mutable tables
-- Source: data-model-audit.md Findings SI-4 + AT-1
-- Required for PDPA audit trail and incremental sync / cache invalidation.
-- Idempotent: uses IF NOT EXISTS / IF NOT EXISTS pattern; ADD COLUMN is guarded.

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Shared trigger function
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Add updated_at column to each mutable table (idempotent via DO block)
-- ──────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles',
    'properties',
    'contracts',
    'payments',
    'penalties',
    'maintenance_requests',
    'notifications',
    'penalty_rules',
    'notification_rules',
    'documents',
    'property_images'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name   = t
        AND column_name  = 'updated_at'
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW()',
        t
      );
    END IF;
  END LOOP;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. Back-fill existing rows: set updated_at = created_at where available,
--    otherwise NOW().  Each statement is wrapped so missing created_at columns
--    (e.g. notifications) fall back gracefully.
-- ──────────────────────────────────────────────────────────────────────────────
UPDATE profiles            SET updated_at = created_at  WHERE updated_at IS NULL;
UPDATE properties          SET updated_at = created_at  WHERE updated_at IS NULL;
UPDATE contracts           SET updated_at = created_at  WHERE updated_at IS NULL;
UPDATE payments            SET updated_at = created_at  WHERE updated_at IS NULL;
UPDATE penalties           SET updated_at = created_at  WHERE updated_at IS NULL;
UPDATE maintenance_requests SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE penalty_rules       SET updated_at = created_at  WHERE updated_at IS NULL;
UPDATE notification_rules  SET updated_at = created_at  WHERE updated_at IS NULL;
UPDATE documents           SET updated_at = created_at  WHERE updated_at IS NULL;
UPDATE property_images     SET updated_at = created_at  WHERE updated_at IS NULL;
-- notifications has no created_at column; use NOW() as fallback
UPDATE notifications       SET updated_at = NOW()       WHERE updated_at IS NULL;

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. Attach BEFORE UPDATE triggers (drop first so re-runs are idempotent)
-- ──────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles',
    'properties',
    'contracts',
    'payments',
    'penalties',
    'maintenance_requests',
    'notifications',
    'penalty_rules',
    'notification_rules',
    'documents',
    'property_images'
  ]
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_updated_at ON %I',
      t
    );
    EXECUTE format(
      'CREATE TRIGGER set_updated_at
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      t
    );
  END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';
