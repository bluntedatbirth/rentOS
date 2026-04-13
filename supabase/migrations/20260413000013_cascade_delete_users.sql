-- ============================================================
-- CASCADE DELETE: auth.users → profiles → all dependent tables
-- Allows deleting users from Supabase Auth dashboard without
-- manually cleaning up every referencing table first.
--
-- Fully defensive: every table/column checked before altering,
-- so this runs cleanly regardless of which migrations have
-- been applied to the target database.
-- ============================================================

-- 1) profiles.id → auth.users  (the root cascade)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE profiles
  DROP CONSTRAINT profiles_pkey CASCADE,
  ADD  PRIMARY KEY (id),
  ADD  CONSTRAINT profiles_id_fkey
       FOREIGN KEY (id) REFERENCES auth.users ON DELETE CASCADE;

-- Helper: re-add FK with cascade for a given table.column → profiles(id)
-- Checks both table and column existence before acting.
DO $$
DECLARE
  _rec RECORD;
BEGIN

  -- --------------------------------------------------------
  -- 2) properties.landlord_id (initial schema — always exists)
  -- --------------------------------------------------------
  ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_landlord_id_fkey;
  ALTER TABLE properties ADD CONSTRAINT properties_landlord_id_fkey
    FOREIGN KEY (landlord_id) REFERENCES profiles(id) ON DELETE CASCADE;

  -- properties.created_by_tenant_id (pairing migration)
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='properties' AND column_name='created_by_tenant_id') THEN
    ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_created_by_tenant_id_fkey;
    ALTER TABLE properties ADD CONSTRAINT properties_created_by_tenant_id_fkey
      FOREIGN KEY (created_by_tenant_id) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  -- properties.current_tenant_id
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='properties' AND column_name='current_tenant_id') THEN
    ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_current_tenant_id_fkey;
    ALTER TABLE properties ADD CONSTRAINT properties_current_tenant_id_fkey
      FOREIGN KEY (current_tenant_id) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  -- properties.last_tenant_id
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='properties' AND column_name='last_tenant_id') THEN
    ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_last_tenant_id_fkey;
    ALTER TABLE properties ADD CONSTRAINT properties_last_tenant_id_fkey
      FOREIGN KEY (last_tenant_id) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  -- --------------------------------------------------------
  -- 3) contracts → profiles
  -- --------------------------------------------------------
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='contracts') THEN
    ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_tenant_id_fkey;
    ALTER TABLE contracts ADD CONSTRAINT contracts_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES profiles(id) ON DELETE SET NULL;

    ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_landlord_id_fkey;
    ALTER TABLE contracts ADD CONSTRAINT contracts_landlord_id_fkey
      FOREIGN KEY (landlord_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;

  -- --------------------------------------------------------
  -- 4) penalties → profiles
  -- --------------------------------------------------------
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='penalties') THEN
    ALTER TABLE penalties DROP CONSTRAINT IF EXISTS penalties_raised_by_fkey;
    ALTER TABLE penalties ADD CONSTRAINT penalties_raised_by_fkey
      FOREIGN KEY (raised_by) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;

  -- --------------------------------------------------------
  -- 5) maintenance_requests → profiles
  -- --------------------------------------------------------
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='maintenance_requests') THEN
    ALTER TABLE maintenance_requests DROP CONSTRAINT IF EXISTS maintenance_requests_raised_by_fkey;
    ALTER TABLE maintenance_requests ADD CONSTRAINT maintenance_requests_raised_by_fkey
      FOREIGN KEY (raised_by) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;

  -- --------------------------------------------------------
  -- 6) notifications → profiles
  -- --------------------------------------------------------
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='notifications') THEN
    ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_recipient_id_fkey;
    ALTER TABLE notifications ADD CONSTRAINT notifications_recipient_id_fkey
      FOREIGN KEY (recipient_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;

  -- --------------------------------------------------------
  -- 7) penalty_rules → profiles
  -- --------------------------------------------------------
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='penalty_rules') THEN
    ALTER TABLE penalty_rules DROP CONSTRAINT IF EXISTS penalty_rules_landlord_id_fkey;
    ALTER TABLE penalty_rules ADD CONSTRAINT penalty_rules_landlord_id_fkey
      FOREIGN KEY (landlord_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;

  -- --------------------------------------------------------
  -- 8) property_images → profiles
  -- --------------------------------------------------------
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='property_images') THEN
    ALTER TABLE property_images DROP CONSTRAINT IF EXISTS property_images_landlord_id_fkey;
    ALTER TABLE property_images ADD CONSTRAINT property_images_landlord_id_fkey
      FOREIGN KEY (landlord_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;

  -- --------------------------------------------------------
  -- 9) contract_templates → profiles
  -- --------------------------------------------------------
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='contract_templates') THEN
    ALTER TABLE contract_templates DROP CONSTRAINT IF EXISTS contract_templates_landlord_id_fkey;
    ALTER TABLE contract_templates ADD CONSTRAINT contract_templates_landlord_id_fkey
      FOREIGN KEY (landlord_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;

  -- --------------------------------------------------------
  -- 10) documents → profiles
  -- --------------------------------------------------------
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='documents') THEN
    ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_landlord_id_fkey;
    ALTER TABLE documents ADD CONSTRAINT documents_landlord_id_fkey
      FOREIGN KEY (landlord_id) REFERENCES profiles(id) ON DELETE CASCADE;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='documents' AND column_name='uploaded_by') THEN
      ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_uploaded_by_fkey;
      ALTER TABLE documents ADD CONSTRAINT documents_uploaded_by_fkey
        FOREIGN KEY (uploaded_by) REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
  END IF;

  -- --------------------------------------------------------
  -- 11) payments → profiles
  -- --------------------------------------------------------
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='payments') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='payments' AND column_name='confirmed_by') THEN
      ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_confirmed_by_fkey;
      ALTER TABLE payments ADD CONSTRAINT payments_confirmed_by_fkey
        FOREIGN KEY (confirmed_by) REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='payments' AND column_name='claimed_by') THEN
      ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_claimed_by_fkey;
      ALTER TABLE payments ADD CONSTRAINT payments_claimed_by_fkey
        FOREIGN KEY (claimed_by) REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
  END IF;

  -- --------------------------------------------------------
  -- 12) notification_rules → profiles
  -- --------------------------------------------------------
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='notification_rules') THEN
    ALTER TABLE notification_rules DROP CONSTRAINT IF EXISTS notification_rules_landlord_id_fkey;
    ALTER TABLE notification_rules ADD CONSTRAINT notification_rules_landlord_id_fkey
      FOREIGN KEY (landlord_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;

  -- --------------------------------------------------------
  -- 13) translation_suggestions → profiles
  -- --------------------------------------------------------
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='translation_suggestions') THEN
    ALTER TABLE translation_suggestions DROP CONSTRAINT IF EXISTS translation_suggestions_user_id_fkey;
    ALTER TABLE translation_suggestions ADD CONSTRAINT translation_suggestions_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

    ALTER TABLE translation_suggestions DROP CONSTRAINT IF EXISTS translation_suggestions_reviewed_by_fkey;
    ALTER TABLE translation_suggestions ADD CONSTRAINT translation_suggestions_reviewed_by_fkey
      FOREIGN KEY (reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  -- --------------------------------------------------------
  -- 14) slot_purchases → profiles
  -- --------------------------------------------------------
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='slot_purchases') THEN
    ALTER TABLE slot_purchases DROP CONSTRAINT IF EXISTS slot_purchases_user_id_fkey;
    ALTER TABLE slot_purchases ADD CONSTRAINT slot_purchases_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;

  -- --------------------------------------------------------
  -- 15) tenant_bills → profiles
  -- --------------------------------------------------------
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='tenant_bills') THEN
    ALTER TABLE tenant_bills DROP CONSTRAINT IF EXISTS tenant_bills_tenant_id_fkey;
    ALTER TABLE tenant_bills ADD CONSTRAINT tenant_bills_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;

END $$;
