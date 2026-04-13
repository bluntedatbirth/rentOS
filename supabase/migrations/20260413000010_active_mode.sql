-- W1 — Dual-mode: add active_mode to profiles
-- Allows any user to switch between landlord and tenant mode.
-- The existing `role` column stays immutable (signup identity).

-- Add the column with CHECK constraint, defaulting to the existing role
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_mode TEXT CHECK (active_mode IN ('landlord', 'tenant'));

-- Backfill: set active_mode = role for all existing rows
UPDATE public.profiles SET active_mode = role WHERE active_mode IS NULL;

-- Now make it NOT NULL
ALTER TABLE public.profiles ALTER COLUMN active_mode SET NOT NULL;

-- Allow authenticated users to update their own active_mode
-- (role column remains REVOKE UPDATE — only service_role can change it)
GRANT UPDATE (active_mode) ON public.profiles TO authenticated;
