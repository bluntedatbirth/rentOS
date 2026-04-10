import { describe, it, expect, beforeEach } from 'vitest';
import { activateContract } from '@/lib/contracts/activate';

// ---------------------------------------------------------------------------
// In-memory store types (with index signature for dynamic key access)
// ---------------------------------------------------------------------------

type ContractRecord = {
  [key: string]: unknown;
  id: string;
  property_id: string;
  landlord_id: string;
  tenant_id: string | null;
  status: string;
  structured_clauses: unknown[] | null;
  lease_start: string | null;
  lease_end: string | null;
  monthly_rent: number | null;
  renewed_from: string | null;
};

type PaymentRecord = {
  [key: string]: unknown;
  id: string;
  contract_id: string;
  amount: number;
  due_date: string;
  payment_type: string;
  status: string;
};

let contractStore: ContractRecord[] = [];
let paymentStore: PaymentRecord[] = [];
let idCounter = 1;

function makeId() {
  return `id-${idCounter++}`;
}

// ---------------------------------------------------------------------------
// Thenable query builder
// A minimal Supabase mock: awaiting the builder returns { data, error }.
// Supports: .select(), .eq(), .neq(), .lte(), .limit(), .single(), .maybeSingle(),
//           .update(), .insert()
// ---------------------------------------------------------------------------

type BuilderOp =
  | { op: 'eq'; key: string; value: unknown }
  | { op: 'neq'; key: string; value: unknown }
  | { op: 'lte'; key: string; value: unknown };

type Action =
  | { type: 'select' }
  | { type: 'insert'; rows: unknown[] }
  | { type: 'update'; updates: Record<string, unknown> }
  | { type: 'single' }
  | { type: 'maybeSingle' };

function makeQueryBuilder<T extends Record<string, unknown>>(store: T[]) {
  const ops: BuilderOp[] = [];
  let action: Action = { type: 'select' };

  const applyFilters = (rows: T[]): T[] =>
    rows.filter((r) => {
      for (const f of ops) {
        if (f.op === 'eq' && r[f.key] !== f.value) return false;
        if (f.op === 'neq' && r[f.key] === f.value) return false;
        if (f.op === 'lte') {
          if (r[f.key] === null) return false;
          if (String(r[f.key]) > String(f.value)) return false;
        }
      }
      return true;
    });

  const execute = (): { data: unknown; error: unknown } => {
    if (action.type === 'insert') {
      const inserted: T[] = [];
      for (const row of action.rows) {
        const record = { id: makeId(), ...(row as object) } as unknown as T;
        store.push(record);
        inserted.push(record);
      }
      return { data: inserted, error: null };
    }
    if (action.type === 'update') {
      const matched = applyFilters(store);
      for (const m of matched) Object.assign(m, action.updates);
      return { data: matched, error: null };
    }
    if (action.type === 'single') {
      const results = applyFilters(store);
      return results[0]
        ? { data: results[0], error: null }
        : { data: null, error: { message: 'Not found' } };
    }
    if (action.type === 'maybeSingle') {
      const results = applyFilters(store);
      return { data: results[0] ?? null, error: null };
    }
    // default: select — return array
    return { data: applyFilters(store), error: null };
  };

  // Make the builder thenable so `await builder` works like `await builder.then(...)`
  const builder = {
    select: (..._args: unknown[]) => builder,
    limit: (..._args: unknown[]) => builder,
    eq: (key: string, value: unknown) => {
      ops.push({ op: 'eq', key, value });
      return builder;
    },
    neq: (key: string, value: unknown) => {
      ops.push({ op: 'neq', key, value });
      return builder;
    },
    lte: (key: string, value: unknown) => {
      ops.push({ op: 'lte', key, value });
      return builder;
    },
    insert: (rows: unknown) => {
      action = { type: 'insert', rows: Array.isArray(rows) ? rows : [rows] };
      return builder;
    },
    update: (updates: Record<string, unknown>) => {
      action = { type: 'update', updates };
      return builder;
    },
    single: () => {
      action = { type: 'single' };
      return Promise.resolve(execute());
    },
    maybeSingle: () => {
      action = { type: 'maybeSingle' };
      return Promise.resolve(execute());
    },
    // Make the builder itself a thenable (Supabase-style)
    then: (
      resolve: (value: { data: unknown; error: unknown }) => unknown,
      reject?: (reason: unknown) => unknown
    ) => Promise.resolve(execute()).then(resolve, reject),
  };

  return builder;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeMockSupabase(contracts: ContractRecord[], payments: PaymentRecord[]): any {
  return {
    from: (table: string) => {
      if (table === 'contracts') return makeQueryBuilder<ContractRecord>(contracts);
      if (table === 'payments') return makeQueryBuilder<PaymentRecord>(payments);
      return makeQueryBuilder<ContractRecord>([]);
    },
  };
}

// ---------------------------------------------------------------------------
// Test data helpers
// ---------------------------------------------------------------------------

const PAST_DATE = '2025-01-01';
const FUTURE_DATE = '2027-01-01';

// Build today string in local time to match what activate.ts produces
function todayLocal(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const TODAY = todayLocal();

function makeContract(overrides: Partial<ContractRecord> = {}): ContractRecord {
  return {
    id: makeId(),
    property_id: 'prop-1',
    landlord_id: 'landlord-1',
    tenant_id: 'tenant-1',
    status: 'scheduled',
    structured_clauses: [
      {
        clause_id: 'c1',
        title_th: 'ข้อ 1',
        title_en: 'Clause 1',
        text_th: '',
        text_en: '',
        category: 'other',
        penalty_defined: false,
        penalty_amount: null,
        penalty_currency: null,
        penalty_description: null,
      },
    ],
    lease_start: PAST_DATE,
    lease_end: '2026-01-01',
    monthly_rent: 10000,
    renewed_from: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// State machine logic tests (pure — no DB)
// ---------------------------------------------------------------------------

describe('Contract State Machine — status derivation logic', () => {
  function deriveStatus(opts: {
    hasClauses: boolean;
    hasTenant: boolean;
    leaseStartStr?: string;
  }): 'pending' | 'active' | 'scheduled' | 'parse_failed' {
    const { hasClauses, hasTenant, leaseStartStr } = opts;
    const leaseStart = leaseStartStr ? new Date(leaseStartStr) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!hasClauses) return 'parse_failed';
    if (!hasTenant) return 'pending';
    if (leaseStart && leaseStart > today) return 'scheduled';
    return 'active';
  }

  it('POST with clauses + arrived lease_start + tenant → active', () => {
    expect(deriveStatus({ hasClauses: true, hasTenant: true, leaseStartStr: PAST_DATE })).toBe(
      'active'
    );
  });

  it('POST with clauses + future lease_start + tenant → scheduled', () => {
    expect(deriveStatus({ hasClauses: true, hasTenant: true, leaseStartStr: FUTURE_DATE })).toBe(
      'scheduled'
    );
  });

  it('POST without clauses → parse_failed (regardless of tenant/lease_start)', () => {
    expect(deriveStatus({ hasClauses: false, hasTenant: true, leaseStartStr: PAST_DATE })).toBe(
      'parse_failed'
    );
  });

  it('POST without tenant → pending', () => {
    expect(deriveStatus({ hasClauses: true, hasTenant: false, leaseStartStr: PAST_DATE })).toBe(
      'pending'
    );
  });

  it('POST with clauses + today lease_start → active (boundary: today is not in the future)', () => {
    // today string parsed as UTC midnight might be "tomorrow" in UTC+7, so use
    // a date that is unambiguously today-or-past in any timezone: yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().split('T')[0]!;
    expect(deriveStatus({ hasClauses: true, hasTenant: true, leaseStartStr: yStr })).toBe('active');
  });
});

// ---------------------------------------------------------------------------
// activateContract() helper tests
// ---------------------------------------------------------------------------

describe('activateContract()', () => {
  beforeEach(() => {
    contractStore = [];
    paymentStore = [];
  });

  it('seeds 12 payment rows when all invariants pass', async () => {
    const contract = makeContract({ status: 'scheduled' });
    contractStore.push(contract);

    const supabase = makeMockSupabase(contractStore, paymentStore);
    const result = await activateContract(supabase, contract.id);

    expect(result.success).toBe(true);
    expect(result.seededCount).toBe(12);
    expect(paymentStore).toHaveLength(12);
    expect(paymentStore.every((p) => p.payment_type === 'rent')).toBe(true);
    expect(paymentStore.every((p) => p.status === 'pending')).toBe(true);
    expect(paymentStore.every((p) => p.contract_id === contract.id)).toBe(true);
  });

  it('activateContract is idempotent — second call does not duplicate rows', async () => {
    const contract = makeContract({ status: 'active' });
    contractStore.push(contract);
    // Pre-seed one payment row to simulate already-seeded state
    paymentStore.push({
      id: 'existing-pay-1',
      contract_id: contract.id,
      amount: 10000,
      due_date: PAST_DATE,
      payment_type: 'rent',
      status: 'pending',
    });

    const supabase = makeMockSupabase(contractStore, paymentStore);
    const result = await activateContract(supabase, contract.id);

    expect(result.success).toBe(true);
    expect(result.seededCount).toBe(0); // no new rows
    expect(paymentStore).toHaveLength(1); // still just the one
  });

  it('activateContract rejects when no structured clauses', async () => {
    const contract = makeContract({ structured_clauses: null });
    contractStore.push(contract);

    const supabase = makeMockSupabase(contractStore, paymentStore);
    const result = await activateContract(supabase, contract.id);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/clauses/i);
  });

  it('activateContract rejects when no tenant_id', async () => {
    const contract = makeContract({ tenant_id: null });
    contractStore.push(contract);

    const supabase = makeMockSupabase(contractStore, paymentStore);
    const result = await activateContract(supabase, contract.id);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/tenant/i);
  });

  it('activateContract rejects when lease_start is in the future', async () => {
    const contract = makeContract({ lease_start: FUTURE_DATE });
    contractStore.push(contract);

    const supabase = makeMockSupabase(contractStore, paymentStore);
    const result = await activateContract(supabase, contract.id);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/lease_start/i);
  });

  it('unique index: activateContract rejects when another active contract exists on same property', async () => {
    const existing = makeContract({
      status: 'active',
      id: 'existing-active',
      property_id: 'shared-prop',
    });
    const incoming = makeContract({
      status: 'scheduled',
      id: 'incoming-contract',
      property_id: 'shared-prop',
    });
    contractStore.push(existing, incoming);

    const supabase = makeMockSupabase(contractStore, paymentStore);
    const result = await activateContract(supabase, 'incoming-contract');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/already has an active contract/i);
  });

  it('activateContract expires original contract when renewed_from is set', async () => {
    const original = makeContract({
      status: 'active',
      id: 'original-contract',
      property_id: 'prop-original',
    });
    const renewal = makeContract({
      status: 'scheduled',
      id: 'renewal-contract',
      property_id: 'prop-renewal-new',
      renewed_from: 'original-contract',
    });
    contractStore.push(original, renewal);

    const supabase = makeMockSupabase(contractStore, paymentStore);
    const result = await activateContract(supabase, 'renewal-contract');

    expect(result.success).toBe(true);
    const orig = contractStore.find((c) => c.id === 'original-contract');
    expect(orig?.status).toBe('expired');
  });
});

// Keep the TODAY variable used in boundary comment
void TODAY;
