-- Add bilingual columns to notifications so the UI can display
-- in the user's current locale instead of the send-time language.
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title_en TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title_th TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS body_en TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS body_th TEXT;

-- Backfill: copy existing title/body into both columns as a best-effort default
UPDATE notifications SET
  title_en = title,
  title_th = title,
  body_en = body,
  body_th = body
WHERE title_en IS NULL;
