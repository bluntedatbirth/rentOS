-- P1-J: Add missing performance indexes
-- Source: performance-audit.md Findings DB-1, DB-2, DB-3, DB-4
-- Every index uses IF NOT EXISTS so this migration is idempotent.

-- DB-1: contracts(tenant_id) — every tenant page load does a full contracts table scan
CREATE INDEX IF NOT EXISTS idx_contracts_tenant_id ON contracts(tenant_id);

-- DB-2: payments(contract_id, due_date) composite — date-range filters require secondary scans
CREATE INDEX IF NOT EXISTS idx_payments_contract_due ON payments(contract_id, due_date);

-- DB-3: payments(status, due_date) partial — cron full-table scan on every run
CREATE INDEX IF NOT EXISTS idx_payments_status_due ON payments(status, due_date)
  WHERE status IN ('pending', 'overdue');

-- DB-4: notifications(recipient_id) partial — unread badge count scan
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread ON notifications(recipient_id)
  WHERE read_at IS NULL;

NOTIFY pgrst, 'reload schema';
