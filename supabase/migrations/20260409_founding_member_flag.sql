ALTER TABLE profiles ADD COLUMN IF NOT EXISTS founding_member BOOLEAN DEFAULT false;
-- Backfill existing beta users as founding members
UPDATE profiles SET founding_member = true WHERE created_at < NOW();
