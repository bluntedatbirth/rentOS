# Code Quality Fixes — Sprint Report

**Branch:** `quality/audit-fixes`  
**Date:** 2026-04-11  
**Engineer:** Code Quality Agent (Sonnet 4.6)

---

## Summary

All Phase 0-G, Phase 1-M, Phase 1-L, Phase 1-F, and bonus dead-code items completed. TypeScript clean throughout. 16 Vitest tests passing.

---

## P0-G — React Error Boundaries

**Status:** Completed (committed by `performance-engineer` as part of P1-H commit `6e0af98`)

**Files touched:**
- `app/error.tsx` (new)
- `app/landlord/error.tsx` (new)
- `app/tenant/error.tsx` (new)
- `locales/en.json` — added `error.title`, `error.description`, `error.try_again`
- `locales/th.json` — same
- `locales/zh.json` — same

**Before:** No `error.tsx` files existed anywhere. Any server component exception rendered a blank page.

**After:** Three `'use client'` error boundaries using `useI18n()` for localized text. Warm white card, charcoal text, saffron "Try again" button calling `reset()`. Root `error.tsx` wraps in `<html><body>` as required by Next.js App Router for global errors.

**Commit SHA:** `6e0af98` (performance-engineer; quality-engineer confirmed complete)

---

## P1-M — Delete Dead `lib/rateLimit.ts`

**Status:** Completed

**Files touched:** `lib/rateLimit.ts` (deleted)

**Before:**
```ts
// lib/rateLimit.ts — not imported anywhere
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
export function rateLimit(key, maxRequests, windowMs) { ... }
setInterval(() => { /* periodic cleanup */ }, 60000);
```

**After:** File deleted. `lib/rateLimit/persistent.ts` (Supabase-backed) is the only rate limiter remaining.

**Commit SHA:** `8deca53`

---

## P1-L — Stop Leaking DB Error Messages to Clients

**Status:** Completed

**Files touched:**
- `app/api/contracts/backfill-payments/route.ts`
- `app/api/pairing/redeem/route.ts`

**Before (both files):**
```ts
return NextResponse.json({ error: fetchError.message }, { status: 500 });
// leaks table names, column names, constraint names to caller
```

**After (both files):**
```ts
return serverError(fetchError.message);
// logs internally; returns { error: 'internal_error' } to caller
```

`serverError` import added from `@/lib/supabase/api` (which re-exports from `lib/apiErrors.ts`).

Dev routes (`app/api/dev/*`) excluded — they contain the same pattern but are deleted by security-engineer (P0-E).

**Commit SHA:** `3a08fb3`

---

## P1-F — Replace Inline `createClient(url, key)` with `createServiceRoleClient()`

**Status:** Completed

**Files touched:**
- `app/api/contracts/backfill-payments/route.ts`
- `app/api/contracts/[id]/co-tenants/route.ts`
- `app/api/pairing/redeem/route.ts`

**Before (all three files):**
```ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
// ...
const adminClient = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

**After (all three files):**
```ts
import { createServiceRoleClient } from '@/lib/supabase/server';
// ...
const adminClient = createServiceRoleClient();
```

Dev routes (`app/api/dev/*`) excluded — handled by security-engineer.

**Commit SHA:** `bb9a996`

---

## Bonus — Delete `lib/i18n/index.ts` and Rewrite `tests/unit/i18n.test.ts`

**Status:** Completed

**Files touched:**
- `lib/i18n/index.ts` (deleted)
- `tests/unit/i18n.test.ts` (rewritten)

**Before:** `lib/i18n/index.ts` exported a module-level singleton `t()` that only supported `th`/`en` (no `zh`). Only the unit test imported it. `i18n.test.ts` had 4 trivial assertions on this dead code path.

**After:** `lib/i18n/index.ts` deleted. `i18n.test.ts` rewritten to test the real locale JSON files:
- Key parity across all 3 locales (en/th/zh)
- `error.*` keys (added in P0-G) present in all 3 locales
- `detectSystemLocale()` returns `null` in Node/SSR context

**Commit SHA:** `51c90d5`

---

## NEW ISSUE — Hardcoded Bilingual Strings in TM.30 Page

**Discovered via:** bonus i18n gap scan  
**Location:** `app/landlord/documents/tm30/page.tsx:562–566`  
**Severity:** Low (already flagged in audit Finding 5.2)

Five `<li>` elements contain hardcoded English/Thai inline bilingual text (e.g., `"File within 24 hours of foreigner moving in (ยื่นภายใน 24 ชม. หลังเข้าพัก)"`). These are not behind `t()` calls. The audit noted them as known. Recommending addition of i18n keys for these strings in a dedicated i18n sprint.

**Action required:** Tech-lead to log as backlog item for i18n sprint.

---

## Deferrals / Blockers

- **0-G was completed by performance-engineer** (bundled into P1-H commit `6e0af98`). No conflict — same content, quality-engineer confirms acceptance.
- **Dev route `.message` leaks** (in `app/api/dev/*`): not fixed because security-engineer is deleting those files in P0-E on their branch. Merged branch will be clean.
- **1-F dev routes** (`app/api/dev/seed-contract`, `seed-penalty`, `test-ocr`, etc.): same — deferred to security-engineer deletion.
- **Bonus: contract state machine Vitest test (1-B)**: deferred pending `database-engineer` landing their 1-B migration. Recommend coordinating in follow-up sprint.

---

## Build/Test Status

| Check | Result |
|-------|--------|
| `tsc --noEmit` | CLEAN |
| `vitest run` (16 tests) | ALL PASS |
| `npm run build` | Not run (worktree shares node_modules; full build requires merged branches) |

---

## Commits on `quality/audit-fixes`

| SHA | Message |
|-----|---------|
| `bb9a996` | P1-F: replace inline createClient(url,key) with createServiceRoleClient() |
| `51c90d5` | bonus: delete dead lib/i18n/index.ts; rewrite i18n.test.ts |
| `3a08fb3` | P1-L: stop leaking DB error messages to clients via serverError() |
| `8deca53` | P1-M: delete dead lib/rateLimit.ts in-memory rate limiter |
| `6e0af98` | P1-H: (performance-engineer) includes P0-G error boundaries |
| `a0e591a` | P1-K: (pre-existing) JSONB exclusion |
