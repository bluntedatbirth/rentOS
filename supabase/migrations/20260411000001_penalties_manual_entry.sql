-- Team RR — BUG-11: allow manual penalty entries
--
-- The initial schema (20260406000001_initial_schema.sql:75) defined
-- penalties.clause_id as TEXT NOT NULL, which prevents user-created
-- manual penalties from being persisted. The UI now exposes a
-- "Manual entry" option in the penalties modal, and the API route
-- already accepts clause_id: null. This migration drops the NOT NULL
-- constraint so the full path works.
--
-- Idempotent: safe to run multiple times.

ALTER TABLE public.penalties ALTER COLUMN clause_id DROP NOT NULL;

-- Reload PostgREST schema cache so the change is visible to the API
-- without a redeploy.
NOTIFY pgrst, 'reload schema';
