-- ============================================================
-- RentOS — Initial Schema
-- ============================================================

-- Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users,
  role          TEXT CHECK (role IN ('landlord', 'tenant')) NOT NULL,
  full_name     TEXT,
  phone         TEXT,
  language      TEXT DEFAULT 'th' CHECK (language IN ('th', 'en')),
  fcm_token     TEXT,
  tier          TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Properties (max 3 for free tier — enforced at API level)
CREATE TABLE properties (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id   UUID REFERENCES profiles(id) NOT NULL,
  name          TEXT NOT NULL,
  address       TEXT,
  unit_number   TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Contracts
CREATE TABLE contracts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id         UUID REFERENCES properties(id) NOT NULL,
  tenant_id           UUID REFERENCES profiles(id),
  landlord_id         UUID REFERENCES profiles(id) NOT NULL,
  original_file_url   TEXT,
  file_type           TEXT CHECK (file_type IN ('image', 'pdf')),
  raw_text_th         TEXT,
  translated_text_en  TEXT,
  structured_clauses  JSONB,
  lease_start         DATE,
  lease_end           DATE,
  monthly_rent        NUMERIC(12,2),
  security_deposit    NUMERIC(12,2),
  status              TEXT DEFAULT 'active'
                      CHECK (status IN ('active','expired','terminated')),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Penalties
CREATE TABLE penalties (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id               UUID REFERENCES contracts(id) NOT NULL,
  clause_id                 TEXT NOT NULL,
  raised_by                 UUID REFERENCES profiles(id) NOT NULL,
  description_th            TEXT,
  description_en            TEXT,
  calculated_amount         NUMERIC(12,2),
  confirmed_amount          NUMERIC(12,2),
  status                    TEXT DEFAULT 'pending_landlord_review'
    CHECK (status IN (
      'pending_landlord_review','confirmed','pending_tenant_appeal',
      'appeal_under_review','resolved','waived'
    )),
  tenant_appeal_note        TEXT,
  landlord_resolution_note  TEXT,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  resolved_at               TIMESTAMPTZ
);

-- Payments
CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id     UUID REFERENCES contracts(id) NOT NULL,
  amount          NUMERIC(12,2) NOT NULL,
  due_date        DATE NOT NULL,
  paid_date       DATE,
  payment_type    TEXT CHECK (payment_type IN ('rent','utility','deposit','penalty')),
  status          TEXT DEFAULT 'pending'
                  CHECK (status IN ('pending','paid','overdue')),
  promptpay_ref   TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Maintenance Requests
CREATE TABLE maintenance_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id) NOT NULL,
  raised_by   UUID REFERENCES profiles(id) NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  photo_urls  JSONB DEFAULT '[]',
  status      TEXT DEFAULT 'open'
              CHECK (status IN ('open','in_progress','resolved')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications Log
CREATE TABLE notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id  UUID REFERENCES profiles(id) NOT NULL,
  type          TEXT CHECK (type IN (
                  'payment_due','payment_overdue','lease_expiry',
                  'penalty_raised','penalty_appeal','penalty_resolved',
                  'maintenance_raised','maintenance_updated'
                )),
  title         TEXT,
  body          TEXT,
  sent_at       TIMESTAMPTZ DEFAULT NOW(),
  read_at       TIMESTAMPTZ
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE penalties ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Policies: profiles
-- Users can only read and update their own profile
-- ============================================================

CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- RLS Policies: properties
-- Landlords CRUD their own; tenants read properties linked to their contract
-- ============================================================

CREATE POLICY "properties_landlord_select"
  ON properties FOR SELECT
  USING (landlord_id = auth.uid());

CREATE POLICY "properties_tenant_select"
  ON properties FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.property_id = properties.id
        AND contracts.tenant_id = auth.uid()
    )
  );

CREATE POLICY "properties_landlord_insert"
  ON properties FOR INSERT
  WITH CHECK (landlord_id = auth.uid());

CREATE POLICY "properties_landlord_update"
  ON properties FOR UPDATE
  USING (landlord_id = auth.uid())
  WITH CHECK (landlord_id = auth.uid());

CREATE POLICY "properties_landlord_delete"
  ON properties FOR DELETE
  USING (landlord_id = auth.uid());

-- ============================================================
-- RLS Policies: contracts
-- Landlords CRUD their own; tenants SELECT their own contract only
-- ============================================================

CREATE POLICY "contracts_landlord_select"
  ON contracts FOR SELECT
  USING (landlord_id = auth.uid());

CREATE POLICY "contracts_tenant_select"
  ON contracts FOR SELECT
  USING (tenant_id = auth.uid());

CREATE POLICY "contracts_landlord_insert"
  ON contracts FOR INSERT
  WITH CHECK (landlord_id = auth.uid());

CREATE POLICY "contracts_landlord_update"
  ON contracts FOR UPDATE
  USING (landlord_id = auth.uid())
  WITH CHECK (landlord_id = auth.uid());

CREATE POLICY "contracts_landlord_delete"
  ON contracts FOR DELETE
  USING (landlord_id = auth.uid());

-- ============================================================
-- RLS Policies: penalties
-- Landlords CRUD; tenants SELECT + UPDATE appeal fields only
-- ============================================================

CREATE POLICY "penalties_landlord_all"
  ON penalties FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = penalties.contract_id
        AND contracts.landlord_id = auth.uid()
    )
  );

CREATE POLICY "penalties_tenant_select"
  ON penalties FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = penalties.contract_id
        AND contracts.tenant_id = auth.uid()
    )
  );

CREATE POLICY "penalties_tenant_appeal"
  ON penalties FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = penalties.contract_id
        AND contracts.tenant_id = auth.uid()
    )
    AND status = 'confirmed'
  )
  WITH CHECK (
    status = 'pending_tenant_appeal'
  );

-- ============================================================
-- RLS Policies: payments
-- Landlords CRUD; tenants SELECT only
-- ============================================================

CREATE POLICY "payments_landlord_all"
  ON payments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = payments.contract_id
        AND contracts.landlord_id = auth.uid()
    )
  );

CREATE POLICY "payments_tenant_select"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = payments.contract_id
        AND contracts.tenant_id = auth.uid()
    )
  );

-- ============================================================
-- RLS Policies: maintenance_requests
-- Both can INSERT; landlords can UPDATE status
-- ============================================================

CREATE POLICY "maintenance_landlord_select"
  ON maintenance_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = maintenance_requests.contract_id
        AND contracts.landlord_id = auth.uid()
    )
  );

CREATE POLICY "maintenance_tenant_select"
  ON maintenance_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = maintenance_requests.contract_id
        AND contracts.tenant_id = auth.uid()
    )
  );

CREATE POLICY "maintenance_tenant_insert"
  ON maintenance_requests FOR INSERT
  WITH CHECK (
    raised_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = maintenance_requests.contract_id
        AND contracts.tenant_id = auth.uid()
    )
  );

CREATE POLICY "maintenance_landlord_insert"
  ON maintenance_requests FOR INSERT
  WITH CHECK (
    raised_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = maintenance_requests.contract_id
        AND contracts.landlord_id = auth.uid()
    )
  );

CREATE POLICY "maintenance_landlord_update"
  ON maintenance_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = maintenance_requests.contract_id
        AND contracts.landlord_id = auth.uid()
    )
  );

-- ============================================================
-- RLS Policies: notifications
-- Each user can only SELECT their own notifications
-- ============================================================

CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT
  USING (recipient_id = auth.uid());

CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());
