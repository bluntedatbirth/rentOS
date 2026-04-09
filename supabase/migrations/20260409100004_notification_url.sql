-- Add url column to notifications for click-through navigation
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS url TEXT;
