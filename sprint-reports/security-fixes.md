# Security Fixes Sprint Report

**Branch:** `security/audit-fixes`
**Date:** 2026-04-11
**Engineer:** security-engineer

---

## Summary

All Phase 0 and Phase 1 security items in scope were completed. Build passes clean. TypeScript reports zero errors.

---

## Completed Fixes

### P0-F — Middleware fail-closed
**Commit:** `8e4e454`
**Files touched:** `middleware.ts`, `app/maintenance/page.tsx` (new)

**Before:**
```ts
// Skip auth checks if Supabase is not configured
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  return response; // pass-through — all protected routes publicly accessible
}
```

**After:**
```ts
// Fail-closed: if Supabase is not configured, block all traffic
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  return NextResponse.redirect(new URL('/maintenance', request.url));
}
```

Added `/maintenance` static page with hardcoded EN+TH bilingual text (no i18n context dependency). The page renders "Service unavailable — configuration error" / "บริการไม่พร้อมใช้งาน — ข้อผิดพลาดในการกำหนดค่า".

---

### P0-B — Gate mock billing checkout
**Commit:** `e4fa799`
**Files touched:** `app/api/billing/checkout/route.ts`

**Before:**
```ts
export async function POST(request: Request) {
  const { user } = await getAuthenticatedUser();
  // immediately upgrades user to Pro with no payment
```

**After:**
```ts
export async function POST(request: Request) {
  if (process.env.ALLOW_MOCK_CHECKOUT !== 'true') {
    return NextResponse.json({ error: 'not_available' }, { status: 403 });
  }
  const { user } = await getAuthenticatedUser();
```

Do NOT set `ALLOW_MOCK_CHECKOUT=true` in the Vercel production environment. Remove the guard entirely when Omise is wired.

---

### P1-C — Remove listUsers from magic-link route
**Commit:** `1f6251b`
**Files touched:** `app/api/auth/magic-link/route.ts`

**Before:** Lines 41–54 called `admin.auth.admin.listUsers({ perPage: 1000 })` on every magic link request, silently truncating at 1,000 users and creating a timing oracle.

**After:** Deleted the entire `listUsers` block (15 lines). The `magiclink` type creates users if they don't exist — the existence check was unused (confirmed by `void userExists;` comment in original code).

---

### P1-E — Gate middleware and callback diagnostic logs
**Commit:** `147ee99`
**Files touched:** `middleware.ts`, `app/auth/callback/route.ts`

**Before:** 7 `console.log('[middleware]', ...)` calls fire on every request in all environments, logging user roles and redirect decisions to Vercel logs.

**After:** All 7 middleware logs and all 6 `console.log('[callback-diag]', diag)` calls in `app/auth/callback/route.ts` are wrapped in `if (process.env.NODE_ENV === 'development')`. Zero logs in production.

---

### P0-D — OCR route ownership check before download
**Commit:** `7602774`
**Files touched:** `app/api/ocr/route.ts`

**Before:** Route accepted client-supplied `file_url`, downloaded via service-role client, then checked ownership _after_ the download. Path-traversal guard (`includes('..')`) was bypassable.

**After:**
1. Fetch contract via **session client** (RLS-enforced) before any storage access
2. Explicit `contract.landlord_id !== user.id` check as belt-and-suspenders
3. Derive storage path server-side: `original_file_url.split('/storage/v1/object/public/contracts/')[1]`
4. Removed `includes('..')` path check (replaced by ownership verification)
5. `file_url` field in request schema is now optional and ignored

```ts
// Before: download first, check ownership after
const { data: fileData } = await adminClient.storage.from('contracts').download(file_url);
// ... many lines later ...
if (!currentContract || currentContract.landlord_id !== user.id) { /* too late */ }

// After: ownership first, path derived server-side
const { data: contract } = await sessionClient.from('contracts')
  .select('id, property_id, landlord_id, original_file_url').eq('id', contract_id).single();
if (!contract || contract.landlord_id !== user.id) return forbidden();
const storagePath = contract.original_file_url?.split('/storage/v1/object/public/contracts/')[1];
```

**Note on storage path:** The `contracts` table stores `original_file_url` (a public URL from `getPublicUrl()`), not a `storage_path` column. The path is extracted from the URL. This is safe — the URL is written server-side at upload time and never touches the client. A future improvement would be to add a `storage_path` column to store the path directly (avoids URL parsing dependency).

---

### P0-E — Delete app/api/dev/ directory
**Commit:** `3261314`
**Files touched:** 10 route files deleted, `lib/devGuard.ts` deleted, `tests/e2e/helpers/auth.ts` updated, `tests/e2e/helpers/seed.ts` updated

Deleted all routes under `app/api/dev/`:
- `migrate/route.ts`
- `reset-my-data/route.ts`
- `seed-contract/route.ts`
- `seed-penalty/route.ts`
- `seed-user/route.ts`
- `signin-browser/route.ts`
- `signin/route.ts`
- `test-ocr/route.ts`
- `test-ocr-pdf/route.ts`
- `token-usage/route.ts`

`lib/devGuard.ts` deleted — no callers remain outside the now-deleted dev routes.

**E2E test deferral:** `tests/e2e/helpers/auth.ts` and `tests/e2e/helpers/seed.ts` now throw descriptive errors with `TODO(0-E)` comments. E2e tests that call `loginAsLandlord`, `loginAsTenant`, or `seedTestUsers` will fail until updated to use a Supabase test helper. This is a deliberate deferral — the e2e update requires a dedicated Supabase Admin API auth helper which is out of scope for this sprint.

**Notified:** `code-quality-engineer` via DM so they can start 1-F.

---

### P0-C — Fix slot purchase callback
**Commit:** `d6f22d3`
**Files touched:** `app/api/billing/slots/callback/route.ts`, `supabase/migrations/20260411000003_drop_slot_purchases_user_insert.sql` (new)

**Migration:** `20260411000003_drop_slot_purchases_user_insert.sql`
```sql
DROP POLICY IF EXISTS slot_purchases_insert_own ON slot_purchases;
NOTIFY pgrst, 'reload schema';
```

**Route — added prod gate (mirroring P0-B):**
```ts
if (process.env.ALLOW_MOCK_CHECKOUT !== 'true') {
  return NextResponse.json({ error: 'not_available' }, { status: 403 });
}
```

**Route — added omise_charge_id null check:**
```ts
// Before: no check — any pending purchase could be marked paid
if (purchase.status !== 'pending') { return badRequest(...); }
// Immediately marks paid and credits slots

// After: require real charge ID
if (!purchase.omise_charge_id) {
  return badRequest('invalid_purchase');
}
```

---

## Deferrals

### E2E test auth (part of P0-E)
The e2e test helpers (`auth.ts`, `seed.ts`) previously used `/api/dev/signin-browser` and `/api/dev/seed-user`. These now throw errors with TODO comments. Updating them to use real Supabase test auth is deferred — it requires a dedicated test user migration or Supabase Admin API integration that is outside this sprint's scope.

**Impact:** E2e test suite will fail on any test that calls `loginAsLandlord`, `loginAsTenant`, or `seedTestUsers`. This was already the case in practice (dev routes were gated and may not have been running in CI).

---

## New Issues Discovered

1. **`contracts` table lacks a `storage_path` column** (discovered during P0-D): The storage path for uploaded contracts is not persisted in the database — only the `original_file_url` (a public URL) is stored. The OCR fix derives the path by splitting the URL, which works but creates a coupling to the URL format. A future migration to add `storage_path TEXT` to `contracts` and populate it on upload would be cleaner. Low risk for now since the URL format is stable and server-written.

2. **`middleware.ts` dead `/api/dev` guard** (lines ~57-62): After P0-E deleted the dev routes, this block became dead code. Notified `code-quality-engineer` — they confirmed 1-F was already done (`bb9a996`) and removed the dead guard in commit `084a384` on `quality/audit-fixes`.

3. **Branch collision in shared working directory**: During this sprint, multiple agents sharing the same git working directory caused branch switches mid-work, leading to commits landing on wrong branches and Prettier pre-commit hooks failing on other agents' modified files. Resolved by creating an isolated git worktree (`git worktree add ../security-fixes security/audit-fixes`). Recommend using worktrees by default for future multi-agent sprints.

---

## Build & Type Check

- `npx tsc --noEmit`: clean (0 errors)
- `npm run build`: successful, all 100 static/dynamic pages generated
- `/maintenance` page visible in build output
- No `/api/dev/*` routes in build output
