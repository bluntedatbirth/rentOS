# RentOS Pre-Launch Fix List

**Date:** 2026-04-11  
**Scope:** Items that must or should be resolved before opening public signup  
**How to use:** Each Phase 0 item is a launch blocker. Do them in listed order — dependencies are called out. Phase 1 items should land in the sprint immediately after launch unblocking. Phase 2 items are post-launch backlog.

---

## Phase 0 — Launch Blockers

### 0-A: Verify `.env.local` was never committed to git history

- **Source:** security-audit.md §3 Finding 3.1
- **Why it matters:** `.env.local` contains the live Supabase service role key and Anthropic API key. If committed even once in history, the entire database is permanently compromised — service role bypasses all RLS. The repo is currently public.
- **Fix sketch:** Run `git log --all --full-history -- .env.local` and `git log --all --full-history -- "*.env*"`. If any output appears, rotate ALL secrets immediately: Supabase service role key (requires resetting the Supabase project or key rotation in dashboard), Supabase anon key, Anthropic API key. Then make the repo private. If history is clean, proceed to 0-B.
- **Complexity:** S (verification) or L (if rotation is needed)
- **Dependency:** None — this is prerequisite #0; do it before any other fix

---

### 0-B: Gate mock billing checkout in production

- **Source:** security-audit.md §2 Finding 2.1; code-quality-audit.md Finding 2.2 (dev routes)
- **Why it matters:** `POST /api/billing/checkout` immediately upgrades any authenticated user to Pro tier with zero payment verification. It is live on the public URL right now. Any user can give themselves Pro for free with a single curl command.
- **Fix sketch:** At the top of `app/api/billing/checkout/route.ts`, before any other logic, add: `if (process.env.ALLOW_MOCK_CHECKOUT !== 'true') { return NextResponse.json({ error: 'not_available' }, { status: 403 }); }`. Do NOT set `ALLOW_MOCK_CHECKOUT=true` in the production Vercel environment. Remove this guard entirely when real Omise integration is wired.
- **Complexity:** S
- **Dependency:** 0-A (if secrets are leaked, patching checkout is secondary)

---

### 0-C: Fix slot purchase callback — remove user INSERT RLS and add payment verification

- **Source:** security-audit.md §1 Finding 1.3 + §2 Finding 2.2; data-model-audit.md (cross-reference with security)
- **Why it matters:** The `slot_purchases` INSERT RLS policy allows any authenticated user to insert their own row with any `slots_added` value. The callback at `app/api/billing/slots/callback/route.ts` then marks it paid without verifying an Omise charge. Combined: unlimited free slots for any user.
- **Fix sketch:** (1) In `supabase/migrations/`, add a new migration that drops the `slot_purchases_insert_own` policy entirely — slot purchase rows must only be created by service-role (from the server-side checkout initiation). (2) In `app/api/billing/slots/callback/route.ts`, add a check: if `purchase.omise_charge_id` is null or empty, return HTTP 400 with `{ error: 'invalid_purchase' }`. When Omise is fully wired, add a call to verify charge status against the Omise API before crediting. (3) Gate the entire callback similarly to 0-B with `ALLOW_MOCK_CHECKOUT` if mock flows are needed in dev.
- **Complexity:** M
- **Dependency:** 0-A

---

### 0-D: Fix OCR route — move ownership check before file download

- **Source:** security-audit.md §2 Finding 2.3
- **Why it matters:** `app/api/ocr/route.ts` accepts a caller-controlled `file_url` and downloads it using the service-role client BEFORE verifying the caller owns the contract. This allows any landlord to read any other landlord's uploaded contract files. The existing path-traversal guard is bypassable.
- **Fix sketch:** (1) Extract contract ownership verification to the top of the handler, before any storage call. Fetch the contract by ID using the authenticated user's session client (not service role), verify `contract.landlord_id === user.id`. (2) Derive the storage path server-side from the contract record: `${contract.property_id}/${contract.id}.pdf` (or whatever the stored pattern is) — do NOT use the client-supplied `file_url` as the download path at all. (3) Remove the weak `includes('..')` path check; it is not a substitute for ownership verification.
- **Complexity:** M
- **Dependency:** 0-A

---

### 0-E: Delete `app/api/dev/` directory entirely

- **Source:** security-audit.md §2 Findings 2.5, 2.6, 3.4; code-quality-audit.md Finding 2.2
- **Why it matters:** `/api/dev/signin` and `/api/dev/seed-user` contain hardcoded credentials (`test123456`) that appear in plaintext in the public repo. `/api/dev/seed-user` returns the password in its JSON response. `/api/dev/signin-browser` injects env vars into a `<script>` tag. These endpoints are gated by `NODE_ENV` and `DEV_ENDPOINTS_ENABLED` — but Vercel preview deployments may not set `NODE_ENV=production`, and a single misconfigured env var exposes them.
- **Fix sketch:** Delete the entire `app/api/dev/` directory. Search for any imports of these routes and remove them. The `devGuard()` utility in `lib/utils/devGuard.ts` (or wherever it lives) can be deleted if it has no other callers. The E2E test suite uses `/api/dev/signin-browser` for auth — update `tests/e2e/` to use a Supabase test helper or a dedicated test user seeded by a migration-only path.
- **Complexity:** M (the e2e auth change is the fiddly part)
- **Dependency:** 0-A

---

### 0-F: Change middleware to fail-closed when Supabase env vars are missing

- **Source:** security-audit.md §6 Finding 6.2; middleware.ts:25-27
- **Why it matters:** If `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing (misconfigured Vercel preview branch), all protected routes (`/landlord/*`, `/tenant/*`, `/admin/*`) become publicly accessible with zero auth check. This is an entire authentication bypass that's one missing env var away.
- **Fix sketch:** Replace lines 25-27 in `middleware.ts` with: `if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) { return NextResponse.redirect(new URL('/maintenance', request.url)); }` Add a `/maintenance` static page that renders "Service unavailable — configuration error." This fails closed rather than open.
- **Complexity:** S
- **Dependency:** None

---

### 0-G: Add React error boundaries for landlord and tenant app sections

- **Source:** code-quality-audit.md §4 Finding 4.1
- **Why it matters:** Zero `error.tsx` files exist in the app. Any unhandled error in a server component (a DB timeout, a null dereference) renders a white screen with no recovery UI and no user-facing message. For a Thai 3G user with intermittent connectivity, this is the primary failure mode they will see.
- **Fix sketch:** Create `app/landlord/error.tsx` and `app/tenant/error.tsx`. Each should be a `'use client'` component that renders a localized "Something went wrong" message with a "Try again" button that calls `reset()`. Use the `useI18n` hook for localization. Add `app/error.tsx` at root as a global fallback. This is ~30 lines per file.
- **Complexity:** S
- **Dependency:** None

---

### 0-H: Fix cron job to return HTTP 500 on errors

- **Source:** code-quality-audit.md §4 Finding 4.2
- **Why it matters:** The cron job wraps all 8 sections in independent try-catch and always returns HTTP 200 with a summary. Vercel Cron marks every broken run as successful. Payment reminders, overdue status updates, and lease expiry warnings all fail silently with no alert.
- **Fix sketch:** At the end of `app/api/cron/daily/route.ts`, change the final return to: `if (summary.errors.length > 0) { return NextResponse.json({ summary }, { status: 500 }); }` This one-line change makes Vercel Cron's built-in alerting usable.
- **Complexity:** S
- **Dependency:** None

---

### 0-I: Delete `combined_pro_features.sql` from migrations folder

- **Source:** data-model-audit.md Finding SI-1
- **Why it matters:** This untimstamped scratch file duplicates four timestamped migrations (`20260408100001` through `20260408100005`) without `DROP POLICY IF EXISTS` guards. Adding a CI migration runner (required before any team growth) will error out on duplicate policy names. It is already a latent time bomb.
- **Fix sketch:** Delete `supabase/migrations/combined_pro_features.sql`. Verify that all four constituent migrations (`20260408100001` through `20260408100004`) are present in the timestamped files. If any table or policy exists only in `combined_pro_features.sql` (not in a timestamped file), extract it into a new correctly-named migration first.
- **Complexity:** S
- **Dependency:** None

---

## Phase 1 — High Priority

These should land in the first post-launch sprint (within 2 weeks of opening public signup).

---

### 1-A: Fix `getLandlordAnalytics` 12-query N+1 loop

- **Source:** performance-audit.md Finding AR-1 + SR-1
- **Why it matters:** 12 sequential Supabase queries = ~5s of RTT alone on 3G before any DB processing. Will hit Vercel's 10s serverless timeout under moderate concurrent load. This makes the Analytics page effectively unusable and will cascade to timeout errors.
- **Fix sketch:** Replace the `for (let i = 11; i >= 0; i--)` loop in `lib/analytics/getLandlordAnalytics.ts:185-218` with a single query: `SELECT paid_date, amount FROM payments WHERE contract_id = ANY(?) AND paid_date >= now() - interval '12 months'`, then group by month in application code. Add `unstable_cache` wrapper with 1-hour TTL and a cache key of `analytics-${userId}`. Also collapse the redundant `activeContracts` + `allContracts` double-fetch (AR-3) into a single query.
- **Complexity:** M
- **Dependency:** None

---

### 1-B: Add DB-level contract state machine trigger

- **Source:** data-model-audit.md Finding CL-1; sprint report FEAT-4 narrative
- **Why it matters:** The state machine was already bypassed in production (FEAT-4 narrative: "every contract paired via the real QR/code flow in the beta was being activated by a raw update"). App-code-only enforcement is proven insufficient. A trigger is the only reliable guarantee.
- **Fix sketch:** Write a new migration adding the `enforce_contract_state_invariants()` trigger function and `contracts_state_invariants BEFORE INSERT OR UPDATE` trigger — the exact SQL is in data-model-audit.md Finding CL-1. The trigger should raise exceptions for: `status='active'` with empty/null `structured_clauses`; `status='active'` with null or future `lease_start`; `status='active'` with null `tenant_id`.
- **Complexity:** M
- **Dependency:** None

---

### 1-C: Fix `magic-link` route — remove `listUsers` call

- **Source:** security-audit.md §6 Finding 6.1
- **Why it matters:** `app/api/auth/magic-link/route.ts` calls `admin.auth.admin.listUsers({ perPage: 1000 })` on every magic link request. The auditor confirmed this result is unused (line 54 comment: `void userExists; // used for logging/future use only`). At 1,000+ users it silently truncates, causing magic links to fail for users past page 1. Also creates a timing oracle for user enumeration.
- **Fix sketch:** Delete lines 42-54 of `app/api/auth/magic-link/route.ts`. The `listUsers` call and `userExists` variable are unused — remove them entirely. No logic change is needed. Test that magic link still works after removal.
- **Complexity:** S
- **Dependency:** None

---

### 1-D: Fix cron — batch notification inserts and dedup check

- **Source:** performance-audit.md Finding AR-4 + SR-3
- **Why it matters:** The cron fires one dedup SELECT per payment, serially. At 100 landlords × 3 contracts × 1 payment each = 300 dedup queries + 300 inserts = 600 sequential DB round-trips per cron run. Will exceed Vercel timeout at ~50 active landlords.
- **Fix sketch:** At the start of the cron run, bulk-fetch recent notifications: `SELECT recipient_id, body FROM notifications WHERE sent_at >= now() - interval '24h'`. Build an in-memory `Set<string>` keyed by `${recipient_id}:${body}`. Replace the per-payment dedup query with a Set.has() check. Collect all notifications to send in an array, then `supabase.from('notifications').insert([...allNotifications])` in one call.
- **Complexity:** M
- **Dependency:** None

---

### 1-E: Fix middleware diagnostic `console.log` statements and auth callback logs

- **Source:** security-audit.md §6 Finding 6.4; code-quality-audit.md Finding 4.4
- **Why it matters:** `middleware.ts` logs `profile_via_service_role` values (user roles, redirect decisions) on every single request. `app/auth/callback/route.ts` logs session exchange results and profile state on every login. Vercel logs are not encrypted and may be accessible to team members or forwarded to third-party drains.
- **Fix sketch:** In `middleware.ts`, wrap all `console.log('[middleware]', ...)` calls in `if (process.env.NODE_ENV === 'development')`. In `app/auth/callback/route.ts`, remove or gate the six `console.log('[callback-diag]', diag)` statements the same way. This is a grep-and-wrap operation.
- **Complexity:** S
- **Dependency:** None

---

### 1-F: Replace inline `createClient(url, key)` with `createServiceRoleClient()` in production API routes

- **Source:** code-quality-audit.md Finding 2.2
- **Why it matters:** `app/api/contracts/backfill-payments/route.ts` and `app/api/pairing/redeem/route.ts` (production paths) bypass the shared `createServiceRoleClient()` factory. If connection options, pooling, or env var names change, these routes are silently missed.
- **Fix sketch:** Grep for `createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)` across the codebase. In the two production routes, replace with `import { createServiceRoleClient } from '@/lib/supabase/server'` and use that. The dev routes will be deleted in 0-E so don't bother fixing those.
- **Complexity:** S
- **Dependency:** 0-E (dev routes deleted first, then fix the remaining production routes)

---

### 1-G: Add `updated_at` column and trigger to all mutable tables

- **Source:** data-model-audit.md Findings SI-4 + AT-1
- **Why it matters:** No mutable table has `updated_at`. Cannot answer "when did this contract go active?", "when did this user's tier change?" for dispute resolution. Direct PDPA compliance gap for Thailand. Also required for any future incremental sync or cache invalidation strategy.
- **Fix sketch:** Write a single migration that: (1) adds `updated_at TIMESTAMPTZ DEFAULT NOW()` to `profiles`, `properties`, `contracts`, `payments`, `penalties`, `maintenance_requests`, `notifications`, `penalty_rules`, `notification_rules`, `documents`, `property_images`; (2) creates a shared trigger function `set_updated_at()` that sets `NEW.updated_at = NOW()`; (3) attaches a `BEFORE UPDATE` trigger calling this function on all the above tables.
- **Complexity:** M
- **Dependency:** None

---

### 1-H: Add property photo optimization — Supabase transforms + `next/image`

- **Source:** performance-audit.md Findings IM-1 + IM-2
- **Why it matters:** Property photos are served as raw originals (up to 10 MB) via a plain `<img>` tag. A 6-photo gallery at 2 MB each = ~96 seconds on 3G. This is the single biggest bandwidth risk for Thai users and makes the properties page unusable in the field.
- **Fix sketch:** In `components/landlord/PropertyImageGallery.tsx:142`, replace `<img src={img.public_url}>` with `<Image>` from `next/image`, with explicit `width` and `height` props. Append `?width=400&quality=75` to the Supabase storage URL for gallery thumbnails; use `?width=1200&quality=85` for the full-size lightbox view. Verify the Supabase image transform endpoint domain is in the CSP `img-src` directive (performance-audit.md Finding IM-4). Apply the same fix to maintenance thumbnails in `TenantMaintenanceClient.tsx:226`.
- **Complexity:** M
- **Dependency:** None

---

### 1-I: Fix pairing TOCTOU race condition

- **Source:** data-model-audit.md Finding PA-2
- **Why it matters:** Two concurrent tenants using the same pairing code can both pass the `tenant_id IS NULL` check before either write completes. The second write silently overwrites the first — one tenant has a contract, the other has no contract and no error.
- **Fix sketch:** In `app/api/pairing/redeem/route.ts`, replace the check-then-update pattern with a single atomic statement: `UPDATE contracts SET tenant_id = $userId, pairing_code = NULL, pairing_expires_at = NULL WHERE pairing_code = $code AND tenant_id IS NULL AND status IN ('pending', 'active') RETURNING id`. If 0 rows are returned, the code was already claimed or expired — return a `{ error: 'code_already_used' }` 409 response. Also add the unique index on `contracts(pairing_code) WHERE pairing_code IS NOT NULL` (data-model-audit.md Finding PA-1).
- **Complexity:** M
- **Dependency:** None

---

### 1-J: Add missing DB indexes

- **Source:** performance-audit.md Findings DB-1, DB-2, DB-3, DB-4
- **Why it matters:** `contracts(tenant_id)` — every tenant page load does a full contracts table scan. `payments(status, due_date)` — every cron run does a full payments table scan. `payments(contract_id, due_date)` composite — date-range filters require secondary scans. These are fast to add and have zero application code impact.
- **Fix sketch:** Write a single migration adding: `CREATE INDEX idx_contracts_tenant_id ON contracts(tenant_id);` `CREATE INDEX idx_payments_contract_due ON payments(contract_id, due_date);` `CREATE INDEX idx_payments_status_due ON payments(status, due_date) WHERE status IN ('pending', 'overdue');` `CREATE INDEX idx_notifications_recipient_unread ON notifications(recipient_id) WHERE read_at IS NULL;`
- **Complexity:** S
- **Dependency:** None

---

### 1-K: Fix `GET /api/contracts` wildcard select — exclude heavy JSONB columns

- **Source:** performance-audit.md Finding AR-5 + SR-2
- **Why it matters:** `select('*')` on contracts returns `raw_text_th`, `translated_text_en`, and `structured_clauses` JSONB on every list fetch. At 20 contracts × 50 kB of clause data = 1 MB JSON for a list view that never displays this data.
- **Fix sketch:** In `app/api/contracts/route.ts:25`, change `select('*, properties(...)')` to an explicit column list excluding `raw_text_th`, `translated_text_en`, and `structured_clauses`. Reserve those columns for the individual contract detail endpoint (`/api/contracts/[id]`).
- **Complexity:** S
- **Dependency:** None

---

### 1-L: Fix `serverError()` usage — stop leaking DB error messages to clients

- **Source:** code-quality-audit.md Finding 4.3
- **Why it matters:** Several routes call `return NextResponse.json({ error: fetchError.message }, { status: 500 })` directly, leaking raw Supabase error messages (which include table names, column names, constraint names) to the client. This is an information disclosure vulnerability.
- **Fix sketch:** Grep for `NextResponse.json({ error: .*\.message` across API routes. Replace each with `return serverError(fetchError.message)` using the existing `lib/apiErrors.ts::serverError()` helper, which logs internally and returns `{ error: 'internal_error' }` to the caller. Affected routes: `app/api/pairing/redeem/route.ts:82`, `app/api/contracts/backfill-payments/route.ts:40`, and others identified by the grep.
- **Complexity:** S
- **Dependency:** None

---

### 1-M: Delete dead `lib/rateLimit.ts` in-memory rate limiter

- **Source:** code-quality-audit.md Finding 2.1
- **Why it matters:** This file exports an in-memory rate limiter that is not imported anywhere. On Vercel serverless functions, in-memory state resets on every cold start — using this accidentally would silently remove all rate limiting. Its presence is a trap.
- **Fix sketch:** Delete `lib/rateLimit.ts`. Run `grep -r "rateLimit"` across the codebase to confirm no imports remain.
- **Complexity:** S
- **Dependency:** None

---

## Phase 2 — Post-Launch

These are important but not urgent. Schedule for the growth sprint (after the first 20 landlords sign up, before 100).

---

### 2-A: Regenerate Supabase TypeScript types and remove `as unknown as T` casts

- **Source:** code-quality-audit.md Finding 3.1
- **Why it matters:** ~50 `as unknown as T` casts across the codebase gut TypeScript's guarantees. Any schema migration can silently break runtime behavior without a compile error. The `Database` type exists in `lib/supabase/types.ts` but is not used.
- **Fix sketch:** Run `supabase gen types typescript --project-id <id> > lib/supabase/types.ts`. Then systematically remove `as unknown as T` casts starting from the most-called files (cron job, dashboard, contracts routes). Replace with `.select()` explicit column lists and let the Database generic infer the correct narrow type. This is a multi-session refactor — do it in passes by feature area.
- **Complexity:** L
- **Dependency:** None (but do after schema is stable post-launch)

---

### 2-B: Convert high-traffic `'use client'` pages to RSC + client islands

- **Source:** performance-audit.md Finding PL-1 (34 of 48 pages)
- **Why it matters:** The properties, payments, notifications, and contracts list pages are fully client-rendered, adding 1-2s of blank-screen time on 3G compared to the correctly-architected dashboard pages. The template pattern exists in the codebase — the dashboards are the model.
- **Fix sketch:** Prioritize by user frequency: (1) `app/landlord/properties/page.tsx`, (2) `app/landlord/payments/page.tsx`, (3) `app/landlord/contracts/[id]/page.tsx`, (4) `app/tenant/payments/page.tsx`. For each: move data fetching to the page component (RSC), extract interactive mutations into small `'use client'` child components, pass serialized data as props. Use the landlord dashboard as the reference implementation.
- **Complexity:** L
- **Dependency:** None

---

### 2-C: Add `claimed` payment status and fix notification type on confirmation

- **Source:** data-model-audit.md Findings PM-1 + PM-4
- **Why it matters:** A payment that has `claimed_at IS NOT NULL` still shows `status='pending'`, indistinguishable from unclaimed in queries. Landlord payment lists cannot distinguish "waiting for tenant" from "tenant claims paid, awaiting confirmation." The confirmation notification fires with type `payment_due` (wrong) instead of `payment_confirmed`.
- **Fix sketch:** (1) Add `'claimed'` to the payments status CHECK constraint. (2) When `claimed_at` is set by `/api/payments/[id]/claim`, also update `status='claimed'`. (3) In `/api/payments/[id]/confirm`, accept `status IN ('claimed', 'pending', 'overdue')` (not just pending/overdue). (4) Add `'payment_confirmed'` to the notification type CHECK. (5) Update the confirm route to send `type: 'payment_confirmed'`.
- **Complexity:** M
- **Dependency:** None

---

### 2-E: Implement proper PDPA-compliant soft deletes on financial tables

- **Source:** data-model-audit.md Finding AT-3
- **Why it matters:** Hard `DELETE` on properties cascades through contracts → payments → penalties, permanently destroying financial history. Thai commercial law requires 5-year retention of financial records. PDPA requires data subjects can request deletion but this must be balanced against retention requirements.
- **Fix sketch:** Add `deleted_at TIMESTAMPTZ` to `properties`, `contracts`, and `payments`. Change `ON DELETE CASCADE` to `ON DELETE SET NULL` or `ON DELETE RESTRICT` on the payments and penalties FK to contracts. Update the account-delete route to soft-delete (set `deleted_at`) rather than hard-delete for data within the 5-year retention window. Add RLS policies that filter `WHERE deleted_at IS NULL` on SELECT.
- **Complexity:** L
- **Dependency:** 1-G (`updated_at` migration) should be done first for consistency

---

### 2-F: Add unit tests for pairing redeem, billing callback, and cron job sections

- **Source:** code-quality-audit.md §6
- **Why it matters:** `app/api/pairing/redeem/route.ts`, `app/api/billing/slots/callback/route.ts`, and `app/api/cron/daily/route.ts` (640 lines, 8 sections) have zero test coverage. A regression in any of these ships undetected. The contract state-machine test is the template to follow.
- **Fix sketch:** Write Vitest unit tests for each path using the pattern established in `tests/unit/contracts-state-machine.test.ts` — mock the Supabase client with a typed builder, assert on the specific DB calls and response shapes for each branch (happy path, error path, race condition path for pairing). Aim for the 8 cron sections to each have at least one test of their notification-generation logic.
- **Complexity:** L
- **Dependency:** 0-E (dev routes deleted), 1-I (pairing fixed atomically)

---

### 2-G: Add `lib/format/currency.ts` shared utility and replace 15+ callsites

- **Source:** code-quality-audit.md Finding 2.3
- **Why it matters:** 15+ components each do their own `฿${n.toLocaleString()}` with inconsistent locale args. In Thai locale, `toLocaleString()` without a locale arg formats with Thai numerals — some components lock to `'en-US'` to avoid this, others don't. The display inconsistency is a visible UI bug.
- **Fix sketch:** Create `lib/format/currency.ts` exporting `formatBaht(n: number): string` using `n.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })` (or the locale from user context). Grep for all `฿` and `THB` formatting patterns. Replace all callsites. Verify the output matches design intent (symbol prefix vs suffix).
- **Complexity:** M
- **Dependency:** None

---

### 2-H: Make `debug/auth-state` require admin authentication even when DEBUG_ENDPOINTS_ENABLED

- **Source:** security-audit.md §2 Finding 2.4
- **Why it matters:** When `DEBUG_ENDPOINTS_ENABLED=true`, the endpoint returns full session and profile data to any unauthenticated request. If accidentally enabled in production, it's an information disclosure endpoint with no auth gate.
- **Fix sketch:** Add `getAuthenticatedUser()` + admin check (compare `user.id` to `ADMIN_USER_IDS`) at the top of `app/api/debug/auth-state/route.ts` before reading any data. Return 401 if not authenticated, 403 if not admin.
- **Complexity:** S
- **Dependency:** None

---

### 2-I: Restrict contract reparse to landlords only; fix notification send type hardcoding

- **Source:** security-audit.md §2 Findings 2.9 + 2.10
- **Why it matters:** Tenants can trigger an AI re-parse of a contract, costing money and potentially overwriting structured_clauses the landlord set. The notification send endpoint hardcodes `type: 'maintenance_raised'` for all notifications, breaking any type-based filtering.
- **Fix sketch:** In `app/api/contracts/[id]/reparse/route.ts`, add a role check: if `user.role !== 'landlord'` return 403. In `app/api/notifications/send/route.ts`, accept `type` as a validated field in the request body (add it to the Zod schema with an enum of valid notification types), and use the provided type rather than the hardcoded constant.
- **Complexity:** S
- **Dependency:** None

---

_Total Phase 0: 9 items (estimated 2-3 days of engineering time)_  
_Total Phase 1: 13 items (estimated 1-2 week sprint)_  
_Total Phase 2: 9 items (backlog, schedule by user growth)_
