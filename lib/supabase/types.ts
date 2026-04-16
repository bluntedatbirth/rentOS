// ============================================================
// Supabase type surface
// ============================================================
// The `Database` interface is auto-generated from the live DB
// schema and lives in `types.generated.ts`. To refresh it after
// a schema change, run:
//
//   npm run gen:types
//
// Domain types that are NOT part of the DB shape (e.g. shapes
// stored inside a JSONB column) live in this file below the
// re-export so that future codegens never clobber them.
// ============================================================

export type { Database, Json } from './types.generated';

// ------------------------------------------------------------
// Domain types — hand-maintained. Describe the parsed shape of
// JSON payloads or client-side view-models, not raw DB rows.
// ------------------------------------------------------------

export interface StructuredClause {
  clause_id: string;
  title_th: string;
  title_en: string;
  text_th: string;
  text_en: string;
  category:
    | 'payment'
    | 'deposit'
    | 'maintenance'
    | 'pets'
    | 'subletting'
    | 'utilities'
    | 'noise'
    | 'penalties'
    | 'renewal'
    | 'termination'
    | 'other';
  penalty_defined: boolean;
  penalty_amount: number | null;
  penalty_currency: string | null;
  penalty_description: string | null;
}

export interface TenantBill {
  id: string;
  tenant_id: string;
  name: string;
  amount: number;
  due_day: number;
  is_recurring: boolean;
  category: 'rent' | 'electric' | 'water' | 'internet' | 'phone' | 'insurance' | 'other';
  status: 'active' | 'paused' | 'deleted';
  created_at: string;
}

export interface TenantBillPayment {
  id: string;
  bill_id: string;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue';
  paid_date: string | null;
  notes: string | null;
  created_at: string;
}
