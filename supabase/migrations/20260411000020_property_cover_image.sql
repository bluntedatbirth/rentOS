-- Add cover image column to properties table
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT NULL;

-- Storage bucket for property cover images (public so URLs work as backgroundImage)
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-covers', 'property-covers', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: landlords can upload their own property covers
-- File path convention: property-covers/<landlord_id>/<property_id>.<ext>
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Landlords can upload own property covers'
  ) THEN
    CREATE POLICY "Landlords can upload own property covers"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'property-covers'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Landlords can update own property covers'
  ) THEN
    CREATE POLICY "Landlords can update own property covers"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'property-covers'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Landlords can delete own property covers'
  ) THEN
    CREATE POLICY "Landlords can delete own property covers"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'property-covers'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Anyone can read property covers'
  ) THEN
    CREATE POLICY "Anyone can read property covers"
      ON storage.objects FOR SELECT
      TO anon, authenticated
      USING (bucket_id = 'property-covers');
  END IF;
END $$;
