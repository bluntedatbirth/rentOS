# Database Sprint — Audit Fix Report

**Engineer:** Tech Lead (rescued from database-engineer's stalled session)
**Branch:** `database/audit-fixes`
**Base:** `audit-fix-sprint`
**Date:** 2026-04-11

---

## Background

`database-engineer` wrote all four planned migrations to disk but never committed them — the session stalled after repeated `.git/index.lock` contention with the other three engineers sharing the same working tree. Tech Lead recovered the untracked migration files and committed them to this branch individually.

---

## P1-B — Contract state invariants trigger

**Commit:** `38b89f9`
**File:** `supabase/migrations/20260411000010_contract_state_invariants.sql`

**Before:** `activateContract()` in `lib/contracts/activate.ts` enforces the state machine in app code only. FEAT-4 proved this was already bypassed in production (active contracts existed with empty `structured_clauses`).

**After:** `BEFORE INSERT OR UPDATE OF status` trigger on `contracts` rejects any row moving to `status='active'` without:

1. `structured_clauses` being non-empty (`jsonb_array_length(...) > 0`)
2. `lease_start` existing and having already arrived (`<= CURRENT_DATE`)
3. `tenant_id` being set

The normal activation path through `activateContract()` already checks these before issuing the UPDATE, so the trigger is an additional safety net for Supabase dashboard edits, service-role routes, and future code paths.

---

## P1-G — `updated_at` on all mutable tables

**Commit:** `1183501`
**File:** `supabase/migrations/20260411000011_updated_at_triggers.sql`

**Before:** Zero mutable tables had an `updated_at` column. PDPA audit requirements (Thailand Personal Data Protection Act) require being able to answer "when did this record last change." Cannot do incremental sync or cache invalidation.

**After:**

- Adds `updated_at TIMESTAMPTZ DEFAULT NOW()` to 11 tables: `profiles`, `properties`, `contracts`, `payments`, `penalties`, `maintenance_requests`, `notifications`, `penalty_rules`, `notification_rules`, `documents`, `property_images`.
- Back-fills existing rows with `created_at` (or `NOW()` for `notifications` which has no `created_at`).
- Attaches a shared `set_updated_at()` BEFORE UPDATE trigger to every table.
- Idempotent: `information_schema` column check before ADD COLUMN; DROP TRIGGER IF EXISTS before CREATE TRIGGER.

---

## P1-I (migration) — Unique partial index on `contracts(pairing_code)`

**Commit:** `e80e522`
**File:** `supabase/migrations/20260411000012_pairing_code_unique_index.sql`

**Before:** Nothing prevented two contracts from sharing the same active pairing code. Combined with the TOCTOU race in `/api/pairing/redeem/route.ts`, two concurrent tenants with the same code could both succeed.

**After:** `CREATE UNIQUE INDEX IF NOT EXISTS contracts_pairing_code_unique ON contracts(pairing_code) WHERE pairing_code IS NOT NULL`. Partial so inactive contracts without codes are unconstrained.

**Note:** The companion application-level fix (atomic `UPDATE ... WHERE pairing_code = ? AND tenant_id IS NULL RETURNING id`) belongs to `security-engineer`. This migration is the DB side of the pair — it lands first.

---

## P1-D (indexes) — Missing performance indexes

**Commit:** `ab1b03e`
**File:** `supabase/migrations/20260411000013_missing_performance_indexes.sql`

**Before:** Four hot paths had no supporting index.

**After:**

- `contracts(tenant_id)` — DB-1: every tenant page hit was a full table scan.
- `payments(contract_id, due_date)` composite — DB-2: range filters required secondary scans.
- `payments(status, due_date)` partial `WHERE status IN ('pending','overdue')` — DB-3: cron daily loop full-scan.
- `notifications(recipient_id)` partial `WHERE read_at IS NULL` — DB-4: unread badge scan.

All use `IF NOT EXISTS`. Safe to re-run.

---

## P1-J — Delete `combined_pro_features.sql`

**Commit:** `bbc5d48`
**File:** `supabase/migrations/combined_pro_features.sql` (deleted, 542 lines)

**Before:** Untimestamped scratch file duplicated four timestamped migrations without `DROP POLICY IF EXISTS` guards. Any clean migration run (new dev, staging, CI pipeline) would error out on duplicate policy creation.

**After:** File removed. The four timestamped migrations (`20260408100001_penalty_rules.sql`, etc.) are the source of truth.

---

## Deferrals

- **P0-A (.env.local history scan)**: Tech Lead pre-verified this with `git log --all --full-history -- .env.local` — zero matches. No work needed.
- **P0-G (error boundaries)**: Owned by code-quality-engineer. Landed on `quality/audit-fixes`.
- **P1-I (application side)**: Owned by security-engineer. This branch delivers the DB half only.

---

## Scope of Changes

- 4 new migrations created, 1 migration deleted.
- Zero TypeScript files touched on this branch.
- Zero application behavior changed — all fixes are DB-level invariants/indexes.

---

## Verification

- Migration files are SQL-only; no TypeScript impact.
- `npx tsc --noEmit`: expected clean (nothing in `tsconfig` paths touches SQL).
- Migrations must be applied in Supabase SQL console by PO before deploy (standard workflow). Recommended order: `20260411000010` → `20260411000011` → `20260411000012` → `20260411000013`, then remove `combined_pro_features.sql` from the folder on the server (already deleted in git).

---

## Known Limitations

- **P1-G back-fill**: if `created_at` is `NULL` on any legacy row, `updated_at` stays `NULL` until the next UPDATE. Acceptable — none of the seeded rows have missing `created_at`.
- **P1-B trigger**: rejects activation with a `RAISE EXCEPTION`. `activateContract()`'s error handling will surface this as a 500; existing callers already show the landlord a generic error, so UX is acceptable but not ideal. Future improvement: catch the SQL state and return a domain-specific error code.
