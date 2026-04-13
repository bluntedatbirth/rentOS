-- Tenant self-service bill tracking
CREATE TABLE IF NOT EXISTS tenant_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  due_day INT NOT NULL DEFAULT 1 CHECK (due_day >= 1 AND due_day <= 31),
  is_recurring BOOLEAN NOT NULL DEFAULT true,
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('rent', 'electric', 'water', 'internet', 'phone', 'insurance', 'other')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenant_bill_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES tenant_bills(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  paid_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(bill_id, due_date)
);

-- RLS
ALTER TABLE tenant_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_bill_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants manage own bills" ON tenant_bills
  FOR ALL USING (tenant_id = auth.uid());

CREATE POLICY "Tenants manage own bill payments" ON tenant_bill_payments
  FOR ALL USING (
    bill_id IN (SELECT id FROM tenant_bills WHERE tenant_id = auth.uid())
  );

-- Index for fast lookups
CREATE INDEX idx_tenant_bills_tenant ON tenant_bills(tenant_id) WHERE status = 'active';
CREATE INDEX idx_bill_payments_bill ON tenant_bill_payments(bill_id);
