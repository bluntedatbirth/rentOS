# RentOS Architecture Review

**Date:** 2026-04-11  
**Reviewer:** Staff Engineer / Final Synthesizer  
**Input:** Four specialist audits (security, performance, data model, code quality) + sprint reports + middleware/package review  
**Verdict: DO NOT OPEN PUBLIC SIGNUP**

---

## Letter Grades

| Domain                   | Grade  | Justification                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Security**             | **D**  | Three Criticals that are trivially exploitable right now, on a public repo. Any user can self-grant Pro tier (checkout bypass) and unlimited property slots (callback bypass). Cross-tenant file read via OCR route. `.env.local` contains real production keys and must be verified clean from git history. The P0 security sprint patched some issues but left the payment holes wide open.                                                                                                                                            |
| **Performance**          | **C-** | The two dashboard pages are correctly server-rendered and are the app's best asset (~1.5s on 3G). Everything else is a regression: 34 of 48 pages are fully client-rendered (blank-screen on 3G), the analytics endpoint fires 12 sequential DB round-trips (~5s RTT alone), and property photos are served unoptimized at up to 10 MB each. Workable for 1 landlord; will visibly degrade before reaching 20.                                                                                                                           |
| **Data Model**           | **C**  | The relational schema is well-structured and FKs are mostly correct. However the contract state machine has zero DB-level enforcement — invariants that were already violated in production (the sprint report's FEAT-4 narrative proves it) are only enforced in app code. No `updated_at` on any table is a PDPA compliance gap. The phantom `combined_pro_features.sql` migration will break any clean CI migration run. The pairing TOCTOU race and missing payment status `claimed` are real correctness bugs.                      |
| **Code Quality**         | **C**  | The architecture is coherent and intentional. Zod validation, a consistent API error helper, and the contract state machine unit test are genuine strengths. The type system is a lie (~50 `as unknown as T` casts that gut TypeScript's guarantees), zero error boundaries mean any server component exception white-screens the page, the cron job swallows all errors and always returns HTTP 200, and two out of hundreds of POST routes have no Zod validation. Maintainable by a careful engineer; fragile for a rotating AI team. |
| **Test Coverage**        | **F**  | The contract state-machine unit test is genuinely good. Everything else provides false confidence. Tenant pairing, billing/Omise webhooks, OCR pipeline, and the entire 640-line cron job have zero tests. The e2e suite's most common assertion is `expect(count).toBeGreaterThanOrEqual(0)` — a tautology. 16 Vitest tests for a 47-page, 83-route app is not a test suite; it is a stub. A billing regression or pairing regression would ship undetected.                                                                            |
| **Production Readiness** | **D**  | No error boundaries, no observability, cron silently returns HTTP 200 on total failure, middleware logs session data on every request, dev routes with hardcoded credentials exist in the codebase (gated only by env var), no backup strategy documented, no incident runbook. The app has never been load-tested. Firebase/FCM push notifications are stubbed out and silently no-op.                                                                                                                                                  |

---

## Top 5 Launch Blockers

These must be resolved before any public user signs up. Not doing these is accepting known critical vulnerabilities or monetization-defeating holes.

### Blocker 1 — Mock billing checkout grants free Pro to any user

`app/api/billing/checkout/route.ts` immediately upgrades the calling user to Pro with zero payment verification. The code is live on a public URL, the repo is public, and the "trick" is one line of curl. Any beta user or casual attacker will discover this. Gate it immediately behind `ALLOW_MOCK_CHECKOUT !== 'true'` returning HTTP 403 in production, or delete the handler body entirely until Omise is wired.
**Compound risk:** The security and data model auditors independently found this. It is not theoretical.

### Blocker 2 — Slot purchase callback grants unlimited slots with no payment

`app/api/billing/slots/callback/route.ts` + `slot_purchases` INSERT RLS = complete bypass. Any authenticated user inserts their own row (`slots_added=500`, `status='pending'`), calls the callback with that row's ID, and gets credited. Omise charge ID is nullable and never checked. Fix requires: (a) removing the user INSERT policy on `slot_purchases`; (b) making the callback verify a non-null `omise_charge_id` against the Omise API.
**Compound risk:** Security auditor (Finding 1.3 + 2.2) and data model auditor (PA-2 area) both flag this chain.

### Blocker 3 — OCR route cross-tenant file read

`app/api/ocr/route.ts` accepts a client-controlled `file_url`, downloads the file using the service-role client BEFORE verifying the caller owns the contract. The path-traversal guard (`..` and `//` check) is easily bypassed with URL encoding. Any landlord can read any other landlord's uploaded contract files. Fix: move ownership verification before the download; derive the storage path server-side from the authenticated contract record.

### Blocker 4 — `.env.local` contains real production secrets; repo is public

The security audit found and printed the actual Supabase service role key, Supabase URL/anon key, and Anthropic API key from `.env.local`. The file is in `.gitignore` but that only prevents future commits. If it was ever committed once, the entire database is permanently compromised (service role bypasses all RLS). Run `git log --all --full-history -- .env.local` immediately. If it appears in history: rotate every secret, reset the Supabase project, and invalidate all JWTs before any further action.
**Prerequisite to all other work:** if the service role key is leaked, fixing the other blockers is pointless.

### Blocker 5 — `/api/dev/*` routes in production codebase with hardcoded credentials

`/api/dev/signin` signs in with hardcoded `landlord@rentos.dev` / `test123456`. `/api/dev/seed-user` returns the plaintext password in the response body and creates Pro-tier accounts. The devGuard checks `NODE_ENV !== 'production'` — but Vercel preview deployments may not set `NODE_ENV=production` by default, and `DEV_ENDPOINTS_ENABLED=true` in a misconfigured preview env exposes these. The hardcoded password is in the public GitHub repo. Delete the entire `app/api/dev/` directory before public launch.

---

## Top 5 High-Priority Items

Not launch blockers by themselves, but should be resolved within the first sprint after blockers.

### High 1 — Middleware fails open when Supabase env vars are unset

`middleware.ts:25-27` returns a pass-through response if `NEXT_PUBLIC_SUPABASE_URL` is not set. A misconfigured Vercel preview branch with missing env vars makes all of `/landlord/*`, `/tenant/*`, `/admin/*` publicly accessible. Change to fail-closed: redirect to a 503/maintenance page if Supabase is not configured.

### High 2 — Zero React error boundaries; cron always returns HTTP 200

No `error.tsx` exists anywhere in `app/`. Every server component exception white-screens the page with no recovery UI. The cron job pushes errors into a summary array and returns 200 regardless — Vercel Cron sees broken runs as successful, payment reminders silently fail. Two files (`app/landlord/error.tsx`, `app/tenant/error.tsx`) and one cron status-code fix (<30 min) close both.

### High 3 — Contract state machine has no DB-level enforcement

`activateContract()` enforces the state machine in app code only. The sprint report's FEAT-4 narrative proves this was already bypassed in production (active contracts with no payment rows). Add the `BEFORE INSERT OR UPDATE` trigger documented in data-model-audit.md Finding CL-1. Without this, any future direct DB edit or service-role route that bypasses `activateContract()` silently corrupts contract state.

### High 4 — `getLandlordAnalytics` fires 12 sequential DB queries in a loop

`lib/analytics/getLandlordAnalytics.ts:185-218` — 12 × 400ms RTT = ~5s of pure network wait on 3G before any DB processing. Will hit Vercel's serverless timeout under concurrent load. Replace with a single date-range aggregation query + `unstable_cache` with 1-hour TTL. This is the single highest-ROI performance fix.

### High 5 — `combined_pro_features.sql` will break any clean migration run

This untimstamped scratch file duplicates four timestamped migrations without `DROP POLICY IF EXISTS` guards. Running migrations from scratch (new dev environment, staging, or any CI pipeline) will error out. Delete the file before any CI pipeline is added.

---

## Tech Debt to Watch at 100+ Landlords

These are acceptable for now but will hurt at scale. Flag for the first "growth" sprint.

- **Type system is hollow (~50 `as unknown as T` casts):** TypeScript is configured correctly but the codebase fights it. Any schema migration can silently break runtime behavior without a compile error. At scale with more developers/agents, this becomes the primary source of production regressions. Fix: regenerate types with `supabase gen types typescript`, remove casts.
- **No `updated_at` on any mutable table:** Cannot do incremental sync, cache invalidation, or dispute resolution auditing. PDPA compliance in Thailand requires being able to answer "when did this change." Adds one migration with triggers; delay past launch only if necessary.
- **Cron notification loop is sequential and will timeout at ~50 landlords:** `app/api/cron/daily/route.ts` — 300 sequential dedup queries + inserts per run at 100 landlords. Exceeds Vercel's 10s hobby timeout well before 100 landlords. Batching fixes this in one pass.
- **34/48 pages are fully `'use client'` with no RSC shell:** Produces 1-2s blank-screen flash on every navigation for Thai 3G users. The landlord/tenant dashboards are the correct template. This is the highest-impact UX fix, but it's a significant refactor — do it in phases, starting with the properties and payments pages.
- **Property photos served at full resolution, no `next/image`:** `components/landlord/PropertyImageGallery.tsx:142` — a 6-photo gallery at 2MB each = ~96 seconds on 3G. One Supabase storage transform param (`?width=400&quality=75`) + `next/image` fixes this.
- **Pairing TOCTOU race condition:** `app/api/pairing/redeem/route.ts` — two concurrent tenants with the same code can both succeed; the first gets silently overwritten. Low probability now (1 landlord), guaranteed to hit at scale. Fix: atomic `UPDATE ... WHERE pairing_code = ? AND tenant_id IS NULL RETURNING id`.
- **Duplicate payment rows possible on concurrent activation:** No unique index on `payments(contract_id, due_date)` for rent rows. A race between two concurrent activation calls (unlikely but possible) seeds 24 rows instead of 12. Low risk now.

---

## Final Verdict

**NO. Do not open public signup.**

The app is not safe for public users in its current state. The reasons are not cosmetic or theoretical — they are trivially exploitable right now:

1. Any user can self-grant Pro tier for free (checkout bypass).
2. Any user can self-grant unlimited property slots for free (callback bypass).
3. Any landlord can read any other landlord's uploaded contracts (OCR route).
4. Real production secrets may be in public git history (unverified).
5. Dev routes with hardcoded credentials exist in the production codebase.

**Minimum work bar to reach "yes":**

1. Run `git log --all --full-history -- .env.local`. If the file is in history, stop all other work and rotate every secret. If it is clean, proceed.
2. Remove or gate the mock billing checkout (`/api/billing/checkout`) so it returns HTTP 403 in any non-dev environment.
3. Remove the `slot_purchases` user INSERT RLS policy. Add Omise charge verification to the callback.
4. Move OCR ownership check before the file download in `app/api/ocr/route.ts`.
5. Delete `app/api/dev/` entirely from the codebase.
6. Change middleware to fail-closed when Supabase env vars are missing.
7. Add `app/landlord/error.tsx` and `app/tenant/error.tsx` (two files, ~30 lines each).
8. Fix cron to return HTTP 500 when `summary.errors.length > 0`.
9. Delete `combined_pro_features.sql` from the migrations folder.

Items 1–5 are security-critical and cannot be deferred. Items 6–9 are operational correctness fixes that prevent invisible failures. None of them require more than a full day of engineering time. The entire minimum bar should be achievable in a single focused sprint.

Once these nine items are done, the app has no known critical vulnerabilities, won't silently degrade under first-landlord use, and the monetization model is not immediately defeatable. That is the bar for public signup — not perfection, but "not trivially broken."

---

## Gaps the Auditors Missed

The four specialist audits covered their domains thoroughly. The following categories were either lightly touched or absent:

**Operational readiness (not audited at all):**

- No backup strategy was examined. Supabase provides point-in-time recovery on Pro tier but whether it is enabled, how often backups run, and how restoration would work in an incident is undocumented. This is a gap for any production app.
- No incident runbook. What does the operator (the PM) do if the cron job stops running, if a landlord reports their data is wrong, if Vercel reports a function timeout spike? There are no Slack alerts, no PagerDuty equivalent, no documented recovery steps.
- Vercel logs contain session metadata on every request (middleware `console.log`). This is a privacy concern depending on Vercel's log retention and access policies.

**PDPA / Thai legal compliance (not audited):**

- Thailand's Personal Data Protection Act (PDPA) requires data subjects to be able to request deletion or correction of their data, and requires records of when data was processed. The absence of `updated_at` on any table (flagged by data model audit) is a direct PDPA gap. The account-delete route hard-deletes all data including financial records — Thai commercial law typically requires 5-year retention of financial records. This intersection of account deletion, cascade-delete behavior, and PDPA/commercial law was not examined.
- The app handles lease contracts (legally binding documents in Thailand) and processes them through an AI (Claude) for clause extraction and analysis. The terms of service and landlord consent flows for AI-processing of legal documents were not reviewed.

**Abuse vectors from bad-faith users (not audited):**

- The AI endpoints (analyze, QA, reparse, suggest-clauses) have rate limiting, but a free-tier user with a valid account can still exhaust the Anthropic API spend cap by staying within rate limits. The spend cap in memory is $100/month on the Anthropic console — at scale with free users, this is reachable.
- The notification system has no spam protection from landlords to tenants. A landlord can send unlimited custom notifications to their tenant. The rate limiting on the notification send endpoint was not reviewed.
- The `magic-link` endpoint calls `listUsers({ perPage: 1000 })` on every request. At public scale this is both a performance problem and a DoS amplification vector.

**Deployment pipeline (not audited):**

- There is no CI/CD pipeline visible in the codebase. Deployments appear to be manual Vercel pushes. No migration health check runs before deployment. `combined_pro_features.sql` sitting in the migrations folder would break any automated migration run silently.
- The `README.md` is the default Next.js boilerplate — no deployment instructions, no environment setup guide, no migration runbook. Onboarding a new engineer (or a future AI agent team) to this project from scratch would require reverse-engineering the setup.
