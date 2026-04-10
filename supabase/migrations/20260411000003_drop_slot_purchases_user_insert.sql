-- P0-C: Remove user-level INSERT policy on slot_purchases.
-- Any authenticated user could previously INSERT their own row with any slots_added value
-- and then call the callback to mark it paid — granting unlimited free slots.
-- Slot purchase rows must only be created by the service-role client after real payment
-- initiation. There is no legitimate reason for an authenticated user to insert directly.

DROP POLICY IF EXISTS slot_purchases_insert_own ON slot_purchases;

-- Notify PostgREST to reload its schema cache so the policy change takes effect immediately.
NOTIFY pgrst, 'reload schema';
