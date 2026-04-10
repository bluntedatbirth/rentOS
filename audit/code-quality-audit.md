# RentOS Code Quality Audit

**Date:** 2026-04-11  
**Auditor:** Senior Fullstack Engineer (static analysis only — no build, no tests run)  
**Scope:** `rental-manager/` — 48 pages, 84 API routes, ~1,200 i18n keys, 2 unit test files + 17 e2e spec files

---

## Executive Summary — Top 5 Maintainability Risks

1. **Supabase type system is hollow.** `as unknown as SomeType` appears ~50 times across API routes and pages. The Database generic is defined but not trusted — every Supabase query result is immediately stripped of its type and re-cast, meaning TypeScript provides no protection at the data access layer. Any schema migration can silently break runtime behavior.

2. **No React error boundaries anywhere.** There is not a single `error.tsx` file in the entire `app/` tree. An unhandled exception in any server component renders the entire page as a white screen. The cron job is 640 lines of try-catch soup that swallows errors into a summary log rather than failing loudly.

3. **Two competing Supabase client factories — one of them is dead code.** `lib/rateLimit.ts` is an orphaned in-memory rate limiter (not imported anywhere). More critically, ~8 API routes bypass `lib/supabase/server.ts::createServiceRoleClient()` and call `createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)` directly, creating duplicate connection logic that will diverge when credentials or options change.

4. **Currency formatting is scattered across 15+ callsites with no shared utility.** Every component invents its own `฿${n.toLocaleString()}` pattern. Some pass `'en-US'` locale explicitly, others omit it — so the same number may format differently in Thai locale vs English locale depending on which component renders it.

5. **The test suite covers UI smoke paths but zero business-logic paths.** 2 unit test files exist. The contract state-machine test is solid. But auth, payments, file upload, tenant pairing, and the billing/Omise webhooks have **no tests at all**. E2e tests are UI-pass/fail checks that assert "page loads" — most critical-path tests are skipped with `test.skip()`.

---

## Findings by Scope Area

---

### 1. Project Structure Coherence

**Finding 1.1** — Severity: **Medium** — Inconsistent shell component pattern

- Location: `app/landlord/layout.tsx` vs `app/tenant/layout.tsx`
- The landlord layout is a ~350-line monolithic Client Component. The tenant layout delegates to `app/tenant/TenantShell.tsx` which is a near-identical copy of the landlord layout (same scroll-hide header logic, same `useRef(0)` pattern, same SimulationPanel dynamic import, same BottomNav + SideNav + MoreSheet wiring). Neither delegates to a shared `AppShell` abstraction.
- **Why it matters:** Any change to the scroll behavior, notification bell, locale toggle, or header design requires editing two files in sync. There's no guarantee they stay in sync.
- **Fix:** Extract a shared `<AppShell role="landlord"|"tenant" navItems={...}>` client component. Both layouts become ~20-line wrappers.

**Finding 1.2** — Severity: **Low** — Data-fetching convention is consistent but undocumented

- Page-level data fetching (server components fetch, pass props to Client components) is used correctly and consistently in `app/landlord/` and `app/tenant/`. Route handlers (`app/api/`) are used for mutations and tenant-facing reads. No server actions are used — this is a valid deliberate choice but is never documented.
- **Why it matters:** A new engineer might add server actions inconsistently.
- **Fix:** Add a one-liner ADR comment in `README.md` or `CLAUDE.md`.

**Finding 1.3** — Severity: **Low** — `lib/i18n/index.ts` is a stale alternative to `lib/i18n/context.tsx`

- Location: `lib/i18n/index.ts:1–26`
- This file exports a module-level singleton `t()` that only supports `th`/`en` (not `zh`) and uses a mutable global variable for locale. It is used only by the unit test `tests/unit/i18n.test.ts`. The real app uses `lib/i18n/context.tsx` (React context + `useI18n`). The two implementations are not in sync: `index.ts` has no `zh` locale and no `zh.json` import.
- **Why it matters:** The unit i18n test is testing a dead code path.
- **Fix:** Delete `lib/i18n/index.ts`. Rewrite `tests/unit/i18n.test.ts` to test `context.tsx` logic or delete it.

---

### 2. Dead Code + Duplication

**Finding 2.1** — Severity: **High** — Dead in-memory rate limiter still present

- Location: `lib/rateLimit.ts:1–34`
- This file exports an in-memory sliding-window rate limiter using a `Map`. It is **not imported by any file** in the codebase. All active rate-limiting uses `lib/rateLimit/persistent.ts` (Supabase-backed). The dead file is misleading — a future engineer might try to use it and unknowingly bypass the persistent limiter.
- **Why it matters:** In-memory rate limiting on Vercel serverless functions resets on every cold start, providing zero protection across requests. Using this file by accident would silently remove rate limiting.
- **Fix:** Delete `lib/rateLimit.ts`.

**Finding 2.2** — Severity: **High** — Inline `createClient()` bypassing the shared factory

- Locations (partial):
  - `app/api/contracts/backfill-payments/route.ts:27–30`
  - `app/api/contracts/[id]/co-tenants/route.ts:16–19`
  - `app/api/pairing/redeem/route.ts:22–25`
  - `app/api/dev/seed-contract/route.ts:23–26`
  - `app/api/dev/seed-penalty/route.ts:23–26`
  - `app/api/dev/test-ocr/route.ts:13–16`
  - `app/api/dev/test-ocr-pdf/route.ts:13–16`
  - `app/api/dev/migrate/route.ts:18`
- All of these call `createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)` directly instead of `createServiceRoleClient()` from `lib/supabase/server.ts`.
- **Why it matters:** If connection pooling, headers, or env var names change, these routes will be missed. The dev routes are less critical but `backfill-payments` and `co-tenants` are production paths.
- **Fix:** Replace all inline `createClient(url, serviceKey)` calls with `createServiceRoleClient()`.

**Finding 2.3** — Severity: **Medium** — Currency formatting has no shared utility

- Locations: `app/landlord/analytics/AnalyticsClient.tsx:44`, `app/landlord/dashboard/DashboardClient.tsx:110`, `app/landlord/dashboard/page.tsx:301`, `app/landlord/contracts/create/page.tsx:770,1275,1345`, `app/landlord/contracts/[id]/page.tsx:191,197`, `components/landlord/ContractClauseCard.tsx:47`, `components/landlord/RenewalBanner.tsx:77,125`, `components/tenant/RenewalNotice.tsx:23,121,127`, `app/landlord/maintenance/MaintenanceClient.tsx:306,315,323`
- Each site does its own flavor: `` `฿${n.toLocaleString()}` ``, `` `฿${n.toLocaleString('en-US')}` ``, or `n.toLocaleString() + ' THB'`. Some inconsistently mix `฿` prefix with `THB` suffix.
- **Why it matters:** In Thai locale, `n.toLocaleString()` without a locale arg will format with Thai numerals on some systems. `DashboardClient` locks to `'en-US'` to avoid this; others don't. The display inconsistency is a visible UI bug waiting to happen.
- **Fix:** Add `lib/format/currency.ts` exporting `formatBaht(n: number): string` that consistently uses `n.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })`. Replace all 15+ callsites.

**Finding 2.4** — Severity: **Medium** — `AnyClient` escape hatch repeated in contract-templates

- Locations: `app/api/contract-templates/route.ts:7`, `app/api/contract-templates/[id]/route.ts` (implicitly, same pattern used 5 times)
- Both files declare `type AnyClient = { from: (table: string) => any }` and cast `serviceClient as unknown as AnyClient` before every query. This is done because `contract_templates` is present in `lib/supabase/types.ts:680` but the Supabase client TypeScript inference doesn't pick it up. The root cause is likely a stale generated types file.
- **Why it matters:** Every query in these files is untyped. The table schema (`Row`, `Insert`, `Update`) is defined in `types.ts` but never used. Insertions use `body as Record<string, string>` (line 67, `contract-templates/route.ts`) with no Zod schema, meaning malformed bodies will either silently insert nulls or throw a runtime error with no helpful message.
- **Fix:** Regenerate Supabase types (`supabase gen types typescript`). Add a Zod schema for the POST body. Remove the `AnyClient` cast.

**Finding 2.5** — Severity: **Low** — Firebase/FCM integration is stub code with TODO comments

- Location: `lib/notifications/fcm.ts:34,71`
- `firebase-admin` is not installed. The file has two `// TODO: When firebase-admin is installed` comments. The `sendPushNotification` function always no-ops, logging a `console.log('[FCM] Not configured')` message.
- **Why it matters:** Push notifications are silently disabled. Any monitoring that checks notification delivery will show 0% FCM delivery with no alert.
- **Fix:** Either install `firebase-admin` and complete the integration, or add a startup warning that makes the disabled state explicit, or delete the file and remove the FCM call in `lib/notifications/send.ts:113`.

---

### 3. TypeScript Honesty

**Finding 3.1** — Severity: **Critical** — `as unknown as T` is the primary data access pattern

- Locations (representative, ~50 total):
  - `lib/contracts/activate.ts:36` — the shared activation helper casts its own Supabase query result to a manually-defined inline type
  - `app/api/contracts/[id]/activate/route.ts:35` — the route handler _also_ re-fetches and re-casts the same contract
  - `app/api/cron/daily/route.ts:60,104,191,214,262,311,372,536,611` — nine separate casts in the cron job alone
  - `app/tenant/dashboard/page.tsx:56,57` — server page casts query results for contracts and renewals
  - `app/landlord/payments/page.tsx:109,129` — casts contract and payment arrays
- The `Database` type in `lib/supabase/types.ts` has correct `Row` types for every table. But instead of letting the TypeScript compiler use them, the codebase immediately strips generic inference with `as unknown as { ... }`. In many cases the inline re-type is a _subset_ of the actual `Row` — fields are omitted — which silently hides access to existing columns.
- **Why it matters:** This is a structural lie. `strict: true` in `tsconfig.json` means nothing if every data access boundary is immediately cast to `any`-equivalent. A schema change (renamed column, added nullable) will not produce a compile error.
- **Fix:** Stop casting. Use `.select()` with explicit column lists and let the Database generic infer the correct narrow type. Where the inferred type is wrong, fix `lib/supabase/types.ts` to match the actual schema (likely via `supabase gen types typescript`).

**Finding 3.2** — Severity: **High** — `body as Record<string, string>` bypasses Zod in one POST route

- Location: `app/api/contract-templates/route.ts:67`
- The POST handler for contract templates has no Zod schema. After parsing JSON, it immediately casts the body: `const { name_en, name_th, ... } = body as Record<string, string>`. If a caller sends `name_en: 123`, TypeScript sees a `string` but the runtime value is a `number`. The downstream Supabase insert will either coerce it or fail with a cryptic DB error.
- The comparable pattern at `app/api/tm30/generate/route.ts:41` does the same thing.
- **Why it matters:** Every other POST route in the codebase uses Zod (`createContractSchema`, `createPenaltySchema`, etc.). These two are inconsistent and vulnerable to type confusion.
- **Fix:** Add Zod schemas to both routes, consistent with every other POST handler.

**Finding 3.3** — Severity: **Medium** — `z.array(z.any())` in the contracts POST schema

- Location: `app/api/contracts/route.ts:16`
- The `structured_clauses` field is typed as `z.array(z.any())`. This means any array content passes validation, including malformed clause objects that will later break the state-machine invariant check in `activateContract()`.
- **Why it matters:** The contract state machine relies on `structured_clauses` being an array of valid `StructuredClause` objects. Accepting arbitrary arrays here can produce contracts that fail activation with confusing errors.
- **Fix:** Define a `structuredClauseSchema` matching `lib/supabase/types.ts::StructuredClause` and use it here.

**Finding 3.4** — Severity: **Medium** — `tsconfig.json` has `strict: true` + `noUncheckedIndexedAccess: true` — good, but undermined

- Location: `tsconfig.json:6,7`
- The config is properly strict. The problem is that `as unknown as T` casts (Finding 3.1) and `// eslint-disable-next-line @typescript-eslint/no-explicit-any` comments (found in `lib/beta/simulations.ts:375,676` and `app/api/contracts/[id]/renew/route.ts:164,190`) surgically disable the guarantees strict mode provides. The compiler is correctly configured but the codebase has learned to fight it rather than use it.

---

### 4. Error Handling Patterns

**Finding 4.1** — Severity: **Critical** — Zero custom error boundaries in Next.js App Router

- No `error.tsx` file exists anywhere under `app/`. Next.js App Router requires `error.tsx` at each segment level to catch component-level errors. Without them, any unhandled `throw` in a Server Component propagates to the root and renders a blank page (or Next.js generic error in dev).
- Confirmed: `find app/ -name "error.tsx"` returns nothing. `not-found.tsx` exists at root only.
- **Why it matters:** A single DB timeout in a dashboard server component kills the entire page with no recovery UI, no retry button, no user-facing message. For a Thai 3G user with intermittent connectivity, this will be the primary failure mode.
- **Fix:** Add `app/landlord/error.tsx` and `app/tenant/error.tsx` at minimum. These should render a localized "something went wrong" message with a retry button.

**Finding 4.2** — Severity: **High** — Cron job (`/api/cron/daily`) uses error-swallowing try-catch

- Location: `app/api/cron/daily/route.ts:49–630`
- The cron job wraps each of its 8 sections in independent try-catch blocks that push errors into a `summary.errors` array. The job always returns HTTP 200 with `{ summary }`. A total failure (all 8 sections throwing) returns `{ errors: [...8 items...] }` with a 200 status.
- **Why it matters:** Vercel Cron will mark every run as "successful" because it sees HTTP 200. A broken cron job is invisible unless someone manually inspects the response body. Payment due reminders, overdue status updates, lease expiry warnings — all silently fail with no alert.
- **Fix:** If `summary.errors.length > 0`, return HTTP 500. This makes Vercel Cron's built-in alerting usable.

**Finding 4.3** — Severity: **High** — `serverError()` leaks internal messages to logs but not callers

- Location: `lib/apiErrors.ts:21–26`
- `serverError(internalMessage)` logs the internal message via `console.error` and returns `{ error: 'internal_error' }` to the caller. This is the right pattern — internal details stay server-side. However: several routes call `return NextResponse.json({ error: fetchError.message }, { status: 500 })` directly (e.g., `app/api/pairing/redeem/route.ts:82`, `app/api/contracts/backfill-payments/route.ts:40`), bypassing `serverError()` and leaking raw Supabase error messages (which can include table names, column names, constraint names) to the client.
- **Why it matters:** Schema information in error responses is an information-disclosure vulnerability.
- **Fix:** Replace all direct `NextResponse.json({ error: dbError.message })` with `serverError(dbError.message)`.

**Finding 4.4** — Severity: **Medium** — Auth callback has diagnostic console.log statements in production path

- Location: `app/auth/callback/route.ts:54,164,171,196,205,213`
- Six `console.log('[callback-diag]', diag)` statements in the auth callback route. These log full diagnostic objects (including session exchange results and profile upsert state) on every login. This is not a dev-only guard.
- **Why it matters:** Session metadata in production logs is a privacy and security concern. Vercel log drains are often forwarded to third-party services.
- **Fix:** Remove the diagnostic logs or wrap them in `if (process.env.NODE_ENV === 'development')`.

**Finding 4.5** — Severity: **Medium** — Tenant dashboard silently renders empty state on DB error

- Location: `app/tenant/dashboard/page.tsx:40–57`
- `Promise.all([contractsResult, renewalsResult])` — but neither result's `.error` is checked. If the contracts query fails, `contractsResult.data` is `null`, `contractsResult.data?.[0]` is `undefined`, and `activeContract` becomes `null`. The page renders the "no contract" empty state with no indication of the error.
- The same pattern appears in `app/landlord/dashboard/page.tsx` where most sub-queries ignore their `.error` returns.
- **Why it matters:** A DB error looks identical to "user has no contracts." Support tickets will be impossible to diagnose.
- **Fix:** Check `contractsResult.error` and throw (to be caught by `error.tsx` once added) or render an explicit error state.

**Finding 4.6** — Severity: **Low** — `activateContract` has a non-atomic write sequence

- Location: `lib/contracts/activate.ts:89–101` (status update) and `:106–114` (expire original)
- The helper first sets `status: 'active'` on the new contract (step 3), then sets `status: 'expired'` on the original (step 4). If step 4 fails, it logs a `console.error` and continues — meaning both the old and new contract can be simultaneously `active`.
- **Why it matters:** The 1-active-per-property invariant is temporarily violated on failure. If the property limit check runs between these two writes, it could block a legitimate activation.
- **Fix:** Run both updates in a single Supabase RPC/transaction, or at minimum make step 4 fatal rather than non-fatal.

---

### 5. i18n Implementation

**Finding 5.1** — Severity: **Medium** — Key counts match across locales but the unit test is testing dead code

- All three locale files (`en.json`, `th.json`, `zh.json`) have exactly 1,439 leaf keys — good parity.
- However, `lib/i18n/index.ts` (used only by `tests/unit/i18n.test.ts`) only loads `th.json` and `en.json`, not `zh.json`. The `zh` locale is entirely absent from the unit-tested code path.
- **Why it matters:** The unit test `tests/unit/i18n.test.ts` passes for `th`/`en` but gives zero coverage signal for `zh`.

**Finding 5.2** — Severity: **Medium** — Hardcoded English strings in auth and admin pages

- Locations (representative):
  - `app/(public)/login/components/ForgotPasswordLink.tsx:54` — `"Reset your password"` (hardcoded, not `t(...)`)
  - `app/(public)/login/components/ForgotPasswordLink.tsx:75` — `"Something went wrong. Please try again."`
  - `app/(public)/login/page.tsx:79` — `"Authentication link expired or invalid."`
  - `app/auth/reset-password/page.tsx:83,101,110,123,127` — multiple hardcoded strings
  - `app/admin/spend/page.tsx:95,96,101,114,182,183` — entire admin page is hardcoded English
  - `app/landlord/documents/tm30/page.tsx:546,552,560,562–566` — TM.30 form labels
- The admin pages are less critical (internal use), but the login flow and reset-password flow are customer-facing. Thai users will see English error messages.
- **Why it matters:** The app is marketed as Thai-first. Login errors in English undermine that claim.
- **Fix:** Add translation keys for all customer-facing error strings in the auth flow. Admin pages can remain English.

**Finding 5.3** — Severity: **Low** — `lang="en"` hardcoded in root layout

- Location: `app/layout.tsx:72`
- `<html lang="en">` is hardcoded. The `I18nProvider` sets `document.documentElement.lang` client-side, but server-rendered HTML will always have `lang="en"` before hydration.
- **Why it matters:** Screen readers and search engines see `lang="en"` for a primarily Thai page. The cookie-based locale detection in middleware could set this correctly on the server, but currently it doesn't.
- **Fix:** Read the `rentos_locale` cookie in the root layout (or middleware) and set `lang` server-side.

**Finding 5.4** — Severity: **Low** — `cycleLocale` marked deprecated but not removed

- Location: `lib/i18n/context.tsx:27`
- `/** @deprecated cycling removed — kept only if external callers import it */`
- This function is exported but the deprecation comment suggests it should be deleted. No callers of `cycleLocale` were found in the app.
- **Fix:** Delete the function.

---

### 6. Test Coverage Reality Check

**Unit tests (Vitest):** 2 files, ~413 lines total

| File                                         | Tests | Quality                                                                                               |
| -------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------- |
| `tests/unit/contracts-state-machine.test.ts` | ~12   | **Good** — real behavior assertions, custom mock Supabase builder, covers all major state transitions |
| `tests/unit/i18n.test.ts`                    | 4     | **Poor** — tests `lib/i18n/index.ts` (dead code path), 4 trivial smoke assertions                     |

**PM said "16 Vitest tests"** — actual count is ~16 `it()` blocks across 2 files, roughly correct.

**E2e tests (Playwright):** 17 spec files. Playwright config targets `http://localhost:3000` and uses a `webServer` block. Tests rely on `app/api/dev/signin-browser` for auth, which embeds credentials and the Supabase URL in a server-rendered HTML page.

**E2e quality assessment:**

| Spec                           | Coverage Type                               | Meaningful?                                                                             |
| ------------------------------ | ------------------------------------------- | --------------------------------------------------------------------------------------- |
| `phase3-auth.spec.ts`          | Login redirects, role separation            | Partially — real auth flow tested, but relies on dev users existing in DB               |
| `phase2-payments.spec.ts`      | UI renders, form visible, button present    | Mostly smoke — `expect(count).toBeGreaterThanOrEqual(0)` is a passing vacuous assertion |
| `phase5-contract.spec.ts`      | "page loads" only — OCR test is `test.skip` | Smoke only                                                                              |
| `phase2-penalties.spec.ts`     | Core test is `test.skip` (line 202)         | Near-zero coverage                                                                      |
| `phase9-notifications.spec.ts` | Core test is `test.skip` (line 33)          | Near-zero coverage                                                                      |
| `phase12-full-flow.spec.ts`    | Core test is `test.skip` (line 117)         | Near-zero coverage                                                                      |

**Critical paths with zero meaningful test coverage:**

- **Contract OCR upload + parse** — the entire `app/api/ocr` → Claude extract → `structured_clauses` pipeline. The only spec is `test.skip`.
- **Tenant pairing** — `app/api/pairing/redeem/route.ts` is one of the most complex endpoints (6-step atomic sequence). Zero tests.
- **Billing/Omise** — `app/api/billing/checkout`, `slots/checkout`, `slots/callback` (webhook). Zero tests. Webhook handling without tests is high-risk.
- **Contract activation state machine** — the unit test covers `activateContract()` lib function well, but the API route wrapper (`app/api/contracts/[id]/activate/route.ts`) is untested.
- **Cron job** — 640 lines, 8 independent sections. Zero tests.
- **File upload to Supabase Storage** — zero tests.

**Verdict on test suite:** The `contracts-state-machine` unit test is genuinely valuable and should be a model for other critical paths. But a green test suite that skips OCR, pairing, billing, and cron is worse than no suite — it signals safety that doesn't exist. The e2e suite's most common assertion pattern (`expect(count).toBeGreaterThanOrEqual(0)`) is a tautology that will always pass regardless of application state.

---

## Tech-Debt Priority List

_Ranked by "pain per unit of fix effort" — highest impact, lowest effort first._

| #   | Item                                                                                      | Severity | Effort  | Why First                                                                             |
| --- | ----------------------------------------------------------------------------------------- | -------- | ------- | ------------------------------------------------------------------------------------- |
| 1   | Add `app/landlord/error.tsx` + `app/tenant/error.tsx`                                     | Critical | 1–2 hrs | One file each, eliminates white-screen-of-death for all server component failures     |
| 2   | Fix cron job to return HTTP 500 on errors                                                 | High     | 30 min  | One-line change enables Vercel Cron alerting; currently all failures are invisible    |
| 3   | Remove diagnostic `console.log` from `app/auth/callback/route.ts`                         | High     | 15 min  | Privacy/security risk; trivial fix                                                    |
| 4   | Replace inline `createClient(url, key)` with `createServiceRoleClient()` in 8 routes      | High     | 1 hr    | Grep-and-replace; eliminates diverging connection logic                               |
| 5   | Delete dead `lib/rateLimit.ts`                                                            | Medium   | 5 min   | Zero effort; removes a trap that could accidentally restore broken in-memory limiting |
| 6   | Replace `NextResponse.json({ error: dbError.message })` with `serverError()` in ~5 routes | High     | 30 min  | Stops schema information disclosure; consistent error envelope                        |
| 7   | Add `lib/format/currency.ts::formatBaht()` and replace 15+ callsites                      | Medium   | 2 hrs   | Eliminates locale-inconsistent currency display; one utility, one fix                 |
| 8   | Add Zod schema to `app/api/contract-templates/route.ts` POST handler                      | High     | 1 hr    | The only POST route without input validation; low complexity                          |
| 9   | Write unit tests for `app/api/pairing/redeem` + `app/api/contracts/[id]/activate`         | High     | 4–6 hrs | Highest-risk untested paths; state-machine test is already the template to follow     |
| 10  | Delete `lib/i18n/index.ts` + rewrite `tests/unit/i18n.test.ts`                            | Low      | 1 hr    | Removes dead code and the misleading test that covers it                              |

---

## Verdict

**Can a future engineer read this codebase without rage-quitting?**

**Conditionally yes.** The architecture is coherent: App Router pages fetch on the server, Client Components handle interactions, API routes use a consistent auth/error helper pattern, Zod validates inputs on most routes, and the contract state machine is well-modeled and genuinely tested. A senior engineer will recognize the intent and be able to navigate it.

The rage-quit trigger is the type system. When every Supabase query result is immediately cast with `as unknown as { ... }`, TypeScript becomes a formality. A new engineer will trust the types, make a change that the compiler accepts, and discover the lie in production. The hollow type system is the single biggest long-term maintainability risk — not because it's hard to fix, but because it creates false confidence in the correctness of every data access in the codebase.

The missing error boundaries and the test suite's heavy reliance on `test.skip` are the other two things that will cause immediate pain: the first on the first user-visible 500 error, the second on the first billing or pairing regression.

Fix the cron error code, add two error boundary files, and delete the dead rate limiter — those three changes alone (under 3 hours total) materially reduce operational risk before launch.
