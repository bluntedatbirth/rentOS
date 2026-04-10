# PO Verification Checklist — Audit Fix Sprint

**Branch:** `audit-fix-sprint`
**Date:** 2026-04-11
**Purpose:** Click-path UI tests to verify every Phase 0 + Phase 1 fix before opening public signup. All tests follow the project convention: UI-only, no curl, no CLI. One test per fix, one action per line. Check each box as you go.

---

## Pre-flight

Before any UI testing:

- [ ] Merge `audit-fix-sprint` → `master` (or deploy directly from the branch on a Vercel preview)
- [ ] In Supabase SQL console, run the 5 migrations in this order:
  - [ ] `20260411000003_drop_slot_purchases_user_insert.sql`
  - [ ] `20260411000010_contract_state_invariants.sql`
  - [ ] `20260411000011_updated_at_triggers.sql`
  - [ ] `20260411000012_pairing_code_unique_index.sql`
  - [ ] `20260411000013_missing_performance_indexes.sql`
- [ ] Verify Vercel environment variables:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL` is set
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` is set
  - [ ] `ALLOW_MOCK_CHECKOUT` is **NOT** set (or is set to anything other than the literal string `'true'`)
- [ ] Open the deployed URL on your phone (test 3G if possible)

---

## Phase 0 — Launch Blockers

### 0-B — Mock billing checkout is 403

- [ ] Sign in as a landlord on the free tier
- [ ] Open `/landlord/billing` (or wherever the "upgrade to Pro" button lives)
- [ ] Click the upgrade button
- [ ] **Expect:** an error / 403 response, the user does NOT get upgraded to Pro
- [ ] Open the landlord dashboard — tier is still `free`

### 0-C — Slot callback requires real payment

- [ ] As a free-tier landlord, navigate to the slot-purchase flow
- [ ] Attempt to complete a purchase
- [ ] **Expect:** an error — slot count does not increase
- [ ] Check `/landlord/dashboard` — property slot count unchanged

### 0-D — OCR route rejects cross-tenant reads

- [ ] Sign in as landlord A, upload a contract PDF
- [ ] Observe the contract file URL in the app (My Contracts → details)
- [ ] Sign out, sign in as landlord B
- [ ] As landlord B, try to access the OCR endpoint for landlord A's file via the normal UI flow
- [ ] **Expect:** access denied / the file does not render for landlord B
- [ ] Landlord B's "Contracts" list does not include landlord A's file

### 0-E — Dev routes are gone

- [ ] In a logged-out browser, visit `/api/dev/signin` (paste into URL bar)
- [ ] **Expect:** 404 Not Found
- [ ] Visit `/api/dev/seed-user`
- [ ] **Expect:** 404 Not Found
- [ ] Try to create a new landlord account via the normal signup flow — this must still work

### 0-F — Fail-closed middleware

- [ ] (Hard to test without breaking the env) — skipping unless you want to verify: temporarily unset `NEXT_PUBLIC_SUPABASE_URL` in a Vercel preview branch
- [ ] Visit any `/landlord/*` URL
- [ ] **Expect:** redirect to `/maintenance`
- [ ] Re-set the env var to restore service

### 0-G — Error boundaries

- [ ] Sign in as landlord
- [ ] Navigate to the dashboard
- [ ] Open DevTools → Console. No errors should appear on a normal load
- [ ] Navigate to a non-existent page like `/landlord/fake-route-xyz`
- [ ] **Expect:** a 404 page, not a white screen
- [ ] (The error boundary is only triggered by server component exceptions; hard to force manually — the code is in place)

### 0-H — Cron returns 500 on errors

- [ ] (Operational, not UI) — after deploy, check Vercel dashboard → Crons → daily
- [ ] **Expect:** Vercel reports failed runs as failed (red) instead of always green

### 0-I — `combined_pro_features.sql` deleted

- [ ] Navigate to your Supabase dashboard → Database → Migrations folder (or check the deploy logs)
- [ ] **Expect:** no file named `combined_pro_features.sql` in the migrations folder
- [ ] The four timestamped migrations `20260408100001..5` are present

---

## Phase 1 — High Priority

### 1-A — Analytics loads fast

- [ ] Sign in as a landlord with at least 3 contracts with payment history
- [ ] Navigate to `/landlord/dashboard` (the analytics page)
- [ ] Stopwatch the load time
- [ ] **Expect:** page renders in under 2 seconds on 4G, under 4 seconds on 3G (was ~8–10s before)
- [ ] Hard-refresh the page — second load should be near-instant (cached)
- [ ] Change a payment (mark one as paid from a different tab) — cache TTL is 1 hour so the analytics page may still show old data. Acceptable.

### 1-B — Contract state invariants trigger

- [ ] Sign in as landlord, create a new contract
- [ ] Complete the upload-and-parse flow successfully
- [ ] Generate a pairing code
- [ ] Sign in as tenant, pair the contract
- [ ] **Expect:** contract becomes active, payment rows seeded
- [ ] Back as landlord, open Supabase SQL console, try manually `UPDATE contracts SET status='active' WHERE id='<some-unparsed-contract-id>';`
- [ ] **Expect:** SQL error — "Cannot set contract active: structured_clauses is empty"

### 1-C — Magic-link still works

- [ ] On the login page, request a magic link to your email
- [ ] **Expect:** email arrives, clicking the link signs you in normally
- [ ] No visible change from the old behavior — this was a dead-code removal

### 1-D — Cron batch dedup

- [ ] (Operational, not UI) — the cron run time should drop. After one daily run, check Vercel cron logs — duration should be lower than before
- [ ] Payment reminder notifications still arrive correctly (for tenants with overdue payments)

### 1-E — No diagnostic logs in production

- [ ] Deploy to production
- [ ] Visit any protected route
- [ ] Check Vercel function logs → middleware
- [ ] **Expect:** no `[middleware] profile_via_service_role:` entries (only errors and warnings)
- [ ] On a dev environment (`npm run dev` locally), the logs should still appear

### 1-F — `createServiceRoleClient()` in use

- [ ] (Code-level, no UI change)
- [ ] Visit landlord pairing code generation — still works
- [ ] Visit tenant pairing redemption — still works
- [ ] Visit contract payment backfill (landlord → contract details → backfill) — still works

### 1-G — `updated_at` columns

- [ ] In Supabase dashboard → Table Editor → `profiles` — confirm `updated_at` column exists
- [ ] Same for `contracts`, `payments`, `properties`, `maintenance_requests`, `notifications`
- [ ] Update your profile display name
- [ ] Refresh the row in Supabase → `updated_at` is now NOW()

### 1-H — Property photo loading speed

- [ ] Sign in as landlord, navigate to a property with 3+ photos
- [ ] Stopwatch the gallery load on 3G (or throttle DevTools to 3G)
- [ ] **Expect:** gallery visible in under 5 seconds (was ~90+ seconds before)
- [ ] Open DevTools → Network tab → filter for images
- [ ] **Expect:** thumbnail requests include `?width=400&quality=75` in the URL
- [ ] Click a thumbnail — full-size view loads

### 1-I — Atomic pairing

- [ ] As landlord, create a new contract and generate a pairing code
- [ ] As tenant A, open the pair page, type the code, click redeem
- [ ] **Expect:** success
- [ ] As tenant B on a different device, try the same code immediately after tenant A
- [ ] **Expect:** "code already used" error, not a silent overwrite
- [ ] Landlord's contract shows tenant A (not tenant B) as the paired tenant

### 1-J — Index-backed queries

- [ ] (Operational, no UI change)
- [ ] Landing pages that depend on contracts/payments queries should feel faster
- [ ] No explicit PO test — verified by 1-A passing

### 1-K — Contract list is lightweight

- [ ] Sign in as landlord with 5+ contracts
- [ ] Open DevTools → Network tab
- [ ] Navigate to `/landlord/contracts`
- [ ] Find the `GET /api/contracts` request
- [ ] **Expect:** response body size is well under 100 KB (was ~1 MB before with 20 contracts)
- [ ] All contracts render correctly in the list

### 1-L — No DB errors leaked to client

- [ ] Sign in as tenant, open the pair page
- [ ] Type an invalid pairing code (1 character)
- [ ] **Expect:** "Invalid pairing code" — not a Postgres error message
- [ ] Submit a code that doesn't exist
- [ ] **Expect:** "code already used" (409) — no table/column names leaked

### 1-M — No dead rate limiter

- [ ] (Code-level, no UI change)
- [ ] AI endpoints (parse contract, Q&A) still rate-limited correctly via the `rateLimit/check.ts` Supabase-backed version

---

## Smoke test — nothing regressed

- [ ] Sign in / sign out as landlord
- [ ] Sign in / sign out as tenant
- [ ] Language switch TH → EN → ZH on any page
- [ ] Landlord dashboard loads
- [ ] Tenant dashboard loads
- [ ] Tenant maintenance form submits
- [ ] Tenant payments page renders
- [ ] Notification inbox loads for both roles
- [ ] Profile settings page saves successfully

---

## If any box fails

- Screenshot the failure and the URL
- Note which sprint-report file the fix is from (`security-fixes.md`, `performance-fixes.md`, etc.)
- Open a P0 ticket naming the owning team
- Revert the branch and go back to `master` if the failure is in a core flow (login, dashboard, pairing)

---

## When all boxes are green

- Sign off in the team chat with "Audit fix sprint verified, ready to merge."
- Merge `audit-fix-sprint` → `master`
- Tag the commit `pre-launch-audit-fix-v1`
- Proceed to the next planned sprint (Omise integration / public signup opening)
