-- Property Images table
-- Stores landlord-uploaded photos categorized as move_in or move_out

CREATE TABLE IF NOT EXISTS property_images (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  landlord_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category      TEXT NOT NULL CHECK (category IN ('move_in', 'move_out')),
  storage_path  TEXT NOT NULL,
  public_url    TEXT NOT NULL,
  file_name     TEXT,
  file_size     INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS property_images_property_id_idx
  ON property_images (property_id);

CREATE INDEX IF NOT EXISTS property_images_property_id_category_idx
  ON property_images (property_id, category);

-- Row Level Security
ALTER TABLE property_images ENABLE ROW LEVEL SECURITY;

-- Landlords have full access to their own images
CREATE POLICY landlord_all ON property_images
  FOR ALL
  TO authenticated
  USING (landlord_id = auth.uid())
  WITH CHECK (landlord_id = auth.uid());

-- Tenants can select images for properties linked to their active contracts
CREATE POLICY tenant_select ON property_images
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM contracts c
      WHERE c.property_id = property_images.property_id
        AND c.tenant_id   = auth.uid()
        AND c.status      = 'active'
    )
  );
