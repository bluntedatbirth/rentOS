-- Add performance indexes for common query patterns
-- Impact: Dashboard loads, contract lists, notification feeds all scan instead of seek

CREATE INDEX IF NOT EXISTS idx_contracts_landlord_id ON contracts(landlord_id);
CREATE INDEX IF NOT EXISTS idx_properties_landlord_id ON properties(landlord_id);
CREATE INDEX IF NOT EXISTS idx_payments_contract_id ON payments(contract_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_contract_id ON maintenance_requests(contract_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
