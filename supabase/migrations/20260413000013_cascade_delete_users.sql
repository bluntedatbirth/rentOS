-- ============================================================
-- CASCADE DELETE: auth.users → profiles → all dependent tables
-- Allows deleting users from Supabase Auth dashboard without
-- manually cleaning up every referencing table first.
-- ============================================================

-- 1) profiles.id → auth.users  (the root cascade)
--    Drop the existing FK first, then the PK, then re-add both.
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE profiles
  DROP CONSTRAINT profiles_pkey CASCADE,
  ADD  PRIMARY KEY (id),
  ADD  CONSTRAINT profiles_id_fkey
       FOREIGN KEY (id) REFERENCES auth.users ON DELETE CASCADE;

-- 2) properties → profiles
ALTER TABLE properties
  DROP CONSTRAINT IF EXISTS properties_landlord_id_fkey,
  ADD  CONSTRAINT properties_landlord_id_fkey
       FOREIGN KEY (landlord_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- created_by_tenant_id, current_tenant_id, last_tenant_id (added in pairing migration)
ALTER TABLE properties
  DROP CONSTRAINT IF EXISTS properties_created_by_tenant_id_fkey,
  ADD  CONSTRAINT properties_created_by_tenant_id_fkey
       FOREIGN KEY (created_by_tenant_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE properties
  DROP CONSTRAINT IF EXISTS properties_current_tenant_id_fkey,
  ADD  CONSTRAINT properties_current_tenant_id_fkey
       FOREIGN KEY (current_tenant_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE properties
  DROP CONSTRAINT IF EXISTS properties_last_tenant_id_fkey,
  ADD  CONSTRAINT properties_last_tenant_id_fkey
       FOREIGN KEY (last_tenant_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- 3) contracts → profiles
ALTER TABLE contracts
  DROP CONSTRAINT IF EXISTS contracts_tenant_id_fkey,
  ADD  CONSTRAINT contracts_tenant_id_fkey
       FOREIGN KEY (tenant_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE contracts
  DROP CONSTRAINT IF EXISTS contracts_landlord_id_fkey,
  ADD  CONSTRAINT contracts_landlord_id_fkey
       FOREIGN KEY (landlord_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 4) penalties → profiles
ALTER TABLE penalties
  DROP CONSTRAINT IF EXISTS penalties_raised_by_fkey,
  ADD  CONSTRAINT penalties_raised_by_fkey
       FOREIGN KEY (raised_by) REFERENCES profiles(id) ON DELETE CASCADE;

-- 5) maintenance_requests → profiles
ALTER TABLE maintenance_requests
  DROP CONSTRAINT IF EXISTS maintenance_requests_raised_by_fkey,
  ADD  CONSTRAINT maintenance_requests_raised_by_fkey
       FOREIGN KEY (raised_by) REFERENCES profiles(id) ON DELETE CASCADE;

-- 6) notifications → profiles
ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_recipient_id_fkey,
  ADD  CONSTRAINT notifications_recipient_id_fkey
       FOREIGN KEY (recipient_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 7) penalty_rules → profiles
ALTER TABLE penalty_rules
  DROP CONSTRAINT IF EXISTS penalty_rules_landlord_id_fkey,
  ADD  CONSTRAINT penalty_rules_landlord_id_fkey
       FOREIGN KEY (landlord_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 8) property_images → profiles
ALTER TABLE property_images
  DROP CONSTRAINT IF EXISTS property_images_landlord_id_fkey,
  ADD  CONSTRAINT property_images_landlord_id_fkey
       FOREIGN KEY (landlord_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 9) contract_templates → profiles
ALTER TABLE contract_templates
  DROP CONSTRAINT IF EXISTS contract_templates_landlord_id_fkey,
  ADD  CONSTRAINT contract_templates_landlord_id_fkey
       FOREIGN KEY (landlord_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 10) documents → profiles (landlord_id always exists; uploaded_by may not yet)
ALTER TABLE documents
  DROP CONSTRAINT IF EXISTS documents_landlord_id_fkey,
  ADD  CONSTRAINT documents_landlord_id_fkey
       FOREIGN KEY (landlord_id) REFERENCES profiles(id) ON DELETE CASCADE;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'uploaded_by'
  ) THEN
    ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_uploaded_by_fkey;
    ALTER TABLE documents ADD CONSTRAINT documents_uploaded_by_fkey
      FOREIGN KEY (uploaded_by) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 11) payments → profiles (confirmed_by, claimed_by)
ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS payments_confirmed_by_fkey,
  ADD  CONSTRAINT payments_confirmed_by_fkey
       FOREIGN KEY (confirmed_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS payments_claimed_by_fkey,
  ADD  CONSTRAINT payments_claimed_by_fkey
       FOREIGN KEY (claimed_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- 12) notification_rules → profiles
ALTER TABLE notification_rules
  DROP CONSTRAINT IF EXISTS notification_rules_landlord_id_fkey,
  ADD  CONSTRAINT notification_rules_landlord_id_fkey
       FOREIGN KEY (landlord_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 13) translation_suggestions → profiles
ALTER TABLE translation_suggestions
  DROP CONSTRAINT IF EXISTS translation_suggestions_user_id_fkey,
  ADD  CONSTRAINT translation_suggestions_user_id_fkey
       FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE translation_suggestions
  DROP CONSTRAINT IF EXISTS translation_suggestions_reviewed_by_fkey,
  ADD  CONSTRAINT translation_suggestions_reviewed_by_fkey
       FOREIGN KEY (reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- 14) slot_purchases → profiles
ALTER TABLE slot_purchases
  DROP CONSTRAINT IF EXISTS slot_purchases_user_id_fkey,
  ADD  CONSTRAINT slot_purchases_user_id_fkey
       FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 15) tenant_bills → profiles
ALTER TABLE tenant_bills
  DROP CONSTRAINT IF EXISTS tenant_bills_tenant_id_fkey,
  ADD  CONSTRAINT tenant_bills_tenant_id_fkey
       FOREIGN KEY (tenant_id) REFERENCES profiles(id) ON DELETE CASCADE;
