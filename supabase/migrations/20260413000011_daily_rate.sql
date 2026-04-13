-- W3 — Short-term rentals: add daily_rate to properties

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS daily_rate NUMERIC(10,2);
