-- ============================================================
-- RentOS — Notification Payload Column
-- ============================================================
-- Adds a JSONB payload column to notifications for role-aware
-- deep-link routing, coexisting with the legacy url TEXT column
-- (dual-write: both columns remain populated during transition).
--
-- Also extends the type CHECK constraint to include two new types
-- introduced by the tenant-pairing and lease-lifecycle features:
--   • pairing_confirmed  — tenant accepted a pairing invitation
--   • lease_ended        — lease reached its end date
-- ============================================================

-- ------------------------------------------------------------
-- 1. Add payload column (nullable — legacy rows keep url only)
-- ------------------------------------------------------------
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS payload JSONB;

-- Shape of the JSONB payload for role-aware notification deep links.
-- Fields:
--   target_route   TEXT  — the app route to navigate to (required)
--   target_id      TEXT  — resource ID relevant to the route (optional)
--   context        JSONB — arbitrary extra data for the destination (optional)
--   fallback_route TEXT  — route to use when target_route is inaccessible (optional)
COMMENT ON COLUMN notifications.payload IS
  'JSONB payload for role-aware notification deep links. Shape: {target_route, target_id?, context?, fallback_route?}';

-- ------------------------------------------------------------
-- 2. Extend the type CHECK constraint
--
-- The previous authoritative constraint was set in:
--   20260409100006_payment_claimed.sql
-- We drop it and replace it with the full list + two new types.
-- Existing rows are unaffected — all prior type values remain valid.
-- ------------------------------------------------------------
ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check CHECK (type IN (
    -- payment lifecycle
    'payment_due',
    'payment_overdue',
    'payment_claimed',
    -- lease lifecycle
    'lease_expiry',
    'lease_ended',            -- NEW: lease reached its end date
    -- penalties
    'penalty_raised',
    'penalty_appeal',
    'penalty_resolved',
    -- maintenance
    'maintenance_raised',
    'maintenance_updated',
    -- billing / tier
    'tier_expiry_warning',
    'tier_downgraded',
    -- renewal flow
    'lease_renewal_offer',
    'lease_renewal_response',
    'renewal_signing_reminder',
    -- tenant pairing
    'pairing_confirmed',      -- NEW: tenant accepted a pairing invitation
    -- escape hatch
    'custom'
  ));
