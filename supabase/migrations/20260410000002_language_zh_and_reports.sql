-- Expand language CHECK constraint to include Chinese
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_language_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_language_check
  CHECK (language IN ('th','en','zh'));

-- Translation reports table
CREATE TABLE IF NOT EXISTS translation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  locale TEXT NOT NULL CHECK (locale IN ('th','en','zh')),
  key TEXT NOT NULL,
  current_value TEXT NOT NULL,
  suggestion TEXT,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','applied')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_translation_reports_status ON translation_reports(status);
CREATE INDEX IF NOT EXISTS idx_translation_reports_locale ON translation_reports(locale);

ALTER TABLE translation_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "translation_reports_insert_auth" ON translation_reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
-- SELECT/UPDATE only via service role (admin page)
