# RentOS QA — Bug Triage Master List

**Generated:** 2026-04-11  
**Triage by:** Bug Analyst, QA Strike Team  
**Sources:** landlord-flow-bugs.md (14 bugs), tenant-flow-bugs.md (11 bugs), performance-issues.md (15 issues)

---

## Totals

**40 unique bugs** after dedupe (2 cross-tester merges applied):

| Severity                 | Count |
| ------------------------ | ----- |
| P0 — Launch Blocker      | 6     |
| P1 — Must Fix Pre-Launch | 13    |
| P2 — Fix Soon            | 14    |
| P3 — Backlog             | 7     |

**Confidence split:**

- static-confirmed: 33
- needs-browser-verification: 7

---

## Dedupe Notes

**MERGE-01:** BUG-T-03 (Sarabun font relative fetch fails in Node) + PERF-02 (loopback font fetch on every PDF generation) share the same root cause: `fetch('/fonts/Sarabun-*.ttf')` used in server-side Route Handlers. BUG-T-03 gives the functional failure (Thai text broken); PERF-02 gives the performance impact (loopback on every call). Merged into a single entry (BUG-T-03 / PERF-02) at P1. Fix resolves both.

**MERGE-02:** BUG-T-05 (stale closure on `load()` in tenant payments) is the same code defect as the perf-audit #6 item already cited by the perf-tester. Reported once under BUG-T-05.

**MERGE-03 (note):** PERF-06 is classified P0 for its P0 sub-finding (no image compression + serial uploads on 3G can block the OCR flow 60–240s). The serial-upload portion alone is P1. Both sub-findings merged into one entry with the composite P0 rating.

---

## P0 — Launch Blockers (6)

---

### P0-01: AI wizard always creates duplicate property — `?property_id=` prefill ignored on save

- **Category:** Frontend Component / API Route
- **Severity:** P0
- **Confidence:** static-confirmed
- **Source IDs:** BUG-L-01
- **Files:** `app/landlord/contracts/create/page.tsx:322–356`
- **Repro:** Open wizard with `?property_id=X`. Complete all 6 steps. Click Generate. A new `properties` row is created unconditionally at line 323 regardless of the prefill. Every retry or use from an existing property accumulates orphan property rows.
- **Additional impact:** When `output_language === 'english'`, `raw_text_th` is never set; contract is created without Thai text and no clauses — `parse_failed` territory despite `pending` status badge.

---

### P0-02: `handleConfirmPayment` calls wrong endpoint — tenant notification never fires, confirmation metadata missing

- **Category:** API Route / Frontend Component
- **Severity:** P0
- **Confidence:** static-confirmed
- **Source IDs:** BUG-L-02
- **Files:** `app/landlord/payments/page.tsx:173–185`, `app/api/payments/[id]/route.ts`, `app/api/payments/[id]/confirm/route.ts`
- **Repro:** Landlord clicks "Confirm Payment". Handler calls `PATCH /api/payments/{id}` (wrong route) instead of `POST /api/payments/{id}/confirm`. The PATCH route has no notification call and does not write `confirmation_date` or `confirmed_by`. Tenants never receive "Payment Confirmed" notification. Audit trail is permanently incomplete.

---

### P0-03: Renew API has no status guard — any contract in any state can be renewed

- **Category:** API Route
- **Severity:** P0
- **Confidence:** static-confirmed
- **Source IDs:** BUG-L-03
- **Files:** `app/api/contracts/[id]/renew/route.ts:72–78`
- **Repro:** POST to `/api/contracts/{id}/renew` on an expired, terminated, or parse_failed contract. The route checks ownership but not status (line 74). A renewal row with `renewed_from` pointing to an expired contract is inserted as `pending` — a zombie renewal the tenant cannot act on. State machine violation.

---

### P0-04: Penalty appeal silently fails when status is `pending_landlord_review` — RLS policy mismatch

- **Category:** RLS Policy
- **Severity:** P0
- **Confidence:** static-confirmed
- **Source IDs:** BUG-T-01
- **Files:** `supabase/migrations/20260406000001_initial_schema.sql:248–260`, `app/tenant/penalties/appeal/page.tsx:96–97`, `app/api/penalties/[id]/appeal/route.ts:22–25`
- **Repro:** Penalty at `pending_landlord_review`. `canAppeal()` shows Appeal button. Tenant submits appeal. RLS `USING` clause requires `status = 'confirmed'` — UPDATE returns 0 rows without error. API returns unmodified row, no 500. Appeal silently lost; tenant sees no feedback.

---

### P0-05: Contract upload — no client-side image compression; 10–20MB phone photo on 3G blocks OCR flow 60–240s

- **Category:** Frontend Component / Upload
- **Severity:** P0
- **Confidence:** static-confirmed
- **Source IDs:** PERF-06 (P0 sub-finding), PERF-07
- **Files:** `app/landlord/contracts/upload/page.tsx:22` (`MAX_SIZE = 20MB`), `components/landlord/PropertyImageGallery.tsx:48–75`
- **Repro:** Landlord on Thai 3G uploads a phone photo of a lease (typical: 4–15MB JPEG). No client-side compression. Raw file sent in FormData. OCR SSE stream cannot start until upload completes. Wait time: 60–240s. Progress bar reads 0% throughout (no XHR upload progress). Additionally, property image uploads are serial (for-of loop with await), tripling time for multi-file uploads.

---

### P0-06: Sarabun font loaded via relative `fetch('/fonts/...')` in server context — Thai characters broken in all PDFs

- **Category:** API Route / File Handling
- **Severity:** P0 (data integrity: Thai text garbled in all receipts and generated PDFs)
- **Confidence:** static-confirmed
- **Source IDs:** BUG-T-03, PERF-02
- **Files:** `lib/pdf/generatePaymentReceipt.ts:21–23`, `lib/pdf/generateContractPdf.ts:31–32`, `lib/pdf/generateTM30Pdf.ts:22–23`
- **Repro:** Any PDF generated server-side (receipt download, contract PDF, TM30) calls `fetch('/fonts/Sarabun-Regular.ttf')` with a relative URL. In Node.js Route Handler context there is no base URL; `fetch` throws TypeError. `loadFonts` try/catch silently falls back to Helvetica. Thai characters in all PDFs (receipts, contracts, TM30s) render as boxes or empty glyphs. Additionally, this is a loopback HTTP call on every generation — performance penalty even if font were found.
- **Fix:** Replace with `fs.readFileSync(path.join(process.cwd(), 'public/fonts/Sarabun-Regular.ttf'))` in all three PDF generators.

---

## P1 — Must Fix Pre-Launch (13)

---

### P1-01: Generated contract lands as `parse_failed` — no structured clauses, no payment seeding

- **Category:** API Route / AI Pipeline
- **Severity:** P1
- **Confidence:** static-confirmed
- **Source IDs:** BUG-L-04
- **Files:** `app/landlord/contracts/create/page.tsx:334–352`, `app/api/contracts/route.ts:47–63`
- **Repro:** Wizard POSTs `raw_text_th` / `translated_text_en` to `/api/contracts` with no `structured_clauses`. API `initialStatus` logic: `hasClauses = false` → contract status = `parse_failed`. No payment rows seeded. Contract appears broken from first view. OCR upload path does parse clauses first; wizard path does not — the generated text needs a reparse step after creation, or the generate API must supply `structured_clauses` at creation time.

---

### P1-02: `MaintenanceClient.reloadRequests` fetches properties without explicit landlord scope — RLS-only

- **Category:** RLS Policy / State Management
- **Severity:** P1
- **Confidence:** needs-browser-verification
- **Source IDs:** BUG-L-05
- **Files:** `app/landlord/maintenance/MaintenanceClient.tsx:91–100`
- **Repro:** Landlord A updates a maintenance status. `reloadRequests()` fires a client-side `supabase.from('properties').select('id, name')` with no `.eq('landlord_id', ...)`. Relies entirely on RLS. If the `properties` RLS policy has any gap, cross-tenant property names leak into the filter dropdown. Page-level server component scopes correctly; client-side reload does not reproduce that scoping.

---

### P1-03: Dashboard activity timestamps hardcoded English — TH/ZH-CN users see raw English strings

- **Category:** i18n
- **Severity:** P1
- **Confidence:** static-confirmed
- **Source IDs:** BUG-L-06
- **Files:** `app/landlord/dashboard/DashboardClient.tsx:94–98`
- **Repro:** Switch locale to TH or ZH-CN. Dashboard activity feed shows `'Just now'`, `'Yesterday'`, `` `${diffHours}h ago` ``, `` `${diffDays}d ago` `` — all hardcoded English in `relativeTime()`. No `t()` key used.

---

### P1-04: Dashboard activity text strings hardcoded English — "Payment confirmed", "Maintenance filed" not translated

- **Category:** i18n
- **Severity:** P1
- **Confidence:** static-confirmed
- **Source IDs:** BUG-L-07
- **Files:** `app/landlord/dashboard/page.tsx:299–333`
- **Repro:** Switch locale to TH or ZH-CN. Activity feed items (lines 299, 315, 327) are English string literals assembled server-side — `"Payment confirmed — ${propName}"`, `"Maintenance filed — ..."`, `"Contract activated"`. They reach `ActivityItem.text` as baked-in English before any client `t()` context is available.

---

### P1-05: `lease_expiry` custom-rule notification links to `/tenant/contracts` (404)

- **Category:** API Route / i18n
- **Severity:** P1
- **Confidence:** static-confirmed
- **Source IDs:** BUG-T-02
- **Files:** `app/api/cron/daily/route.ts:334`
- **Repro:** Landlord creates a custom `lease_expiry` notification rule. Cron fires. Notification sent with `url: '/tenant/contracts'`. Tenant taps notification → 404. Correct path is `/tenant/contract/view`. Was noted as out-of-scope in T-BUG-11 sprint follow-up; still unfixed.

---

### P1-06: Contract viewer misses `parse_failed` and `scheduled` states — shows "no contract" empty state

- **Category:** Frontend Component / State Management
- **Severity:** P1
- **Confidence:** static-confirmed
- **Source IDs:** BUG-T-04
- **Files:** `app/tenant/contract/view/page.tsx:53–82`
- **Repro:** Contract has status `parse_failed` or `scheduled`. Tenant navigates to `/tenant/contract/view`. Query only covers `active`, `awaiting_signature`, `pending` — `parse_failed`/`scheduled` never fetched. `contract` is null → "You have no active contract" shown. Disorienting when the landlord has just uploaded and the OCR queue is processing or failed.

---

### P1-07: Tenant payments page — stale closure on `load()`, eslint warning suppressed

- **Category:** State Management / Frontend Component
- **Severity:** P1
- **Confidence:** static-confirmed
- **Source IDs:** BUG-T-05
- **Files:** `app/tenant/payments/page.tsx:94–138` (stale closure), line 144 (`eslint-disable-next-line react-hooks/exhaustive-deps`)
- **Repro:** `load` is defined outside `useCallback`. On token rotation or navigate-away-and-back, `load()` captures the stale `user` reference. Payments may reflect the prior user reference. The eslint warning is suppressed rather than fixed.

---

### P1-08: Receipt API — 4 sequential DB queries before PDF bytes; property fetch not parallelized

- **Category:** API Route / Database Query
- **Severity:** P1
- **Confidence:** static-confirmed
- **Source IDs:** PERF-01
- **Files:** `app/api/payments/[id]/receipt/route.ts:16–71`
- **Repro:** Handler runs: payment → contract → property (serial) → [tenant profile + landlord profile] (parallel). Property fetch is awaited alone before the profile `Promise.all`. One unnecessary serial RTT. On Thai 3G (~300ms/RTT): 900ms–1.8s added latency before PDF generation starts.

---

### P1-09: Tenant payments page — client-component waterfall; auth + 2 sequential fetches; no RSC conversion

- **Category:** Frontend Component / Page Load Lag
- **Severity:** P1
- **Confidence:** static-confirmed
- **Source IDs:** PERF-03
- **Files:** `app/tenant/payments/page.tsx:1–145`
- **Repro:** `'use client'` with `useAuth()` guard + sequential fetches: (1) contracts query, then (2) payments query after contract.id known. On 3G: ~1.2s after auth resolves before any payment cards appear. Combined with pre-existing auth waterfall (PERF #1): ~2.4s blank screen. Sprint did not convert to Server Component.

---

### P1-10: Landlord payments page — contracts → payments serial fetch (avoidable waterfall)

- **Category:** Frontend Component / Page Load Lag
- **Severity:** P1
- **Confidence:** static-confirmed
- **Source IDs:** PERF-04
- **Files:** `app/landlord/payments/page.tsx:98–136`
- **Repro:** `loadData()` awaits contracts fetch; payments query starts only inside `if (activeContracts.length > 0)` block after contracts resolves — serial. ~200–350ms avoidable delay on 3G.

---

### P1-11: Contract detail page — serial contract + renewal fetch in client component

- **Category:** Frontend Component / Page Load Lag
- **Severity:** P1
- **Confidence:** static-confirmed
- **Source IDs:** PERF-05
- **Files:** `app/landlord/contracts/[id]/page.tsx:61–86`
- **Repro:** `loadContract()` awaits main contract query; renewal query at line 74 starts only inside `if (data)` after first await resolves. ~200–350ms extra RTT on every contract view.

---

### P1-12: AI contract analysis — non-streaming 8–20s blank spinner; exceeds 3s AI threshold

- **Category:** AI Pipeline / Frontend Component
- **Severity:** P1
- **Confidence:** static-confirmed
- **Source IDs:** PERF-10
- **Files:** `app/landlord/contracts/[id]/renew/page.tsx:204–220`, `app/api/contracts/[id]/analyze/route.ts:151–219`
- **Repro:** "Run AI Analysis" fires synchronous `client.messages.create()` (max_tokens: 8192). Full response arrives at once after 8–20s. Page shows static `analysisLoading` spinner with no partial results. On 3G, connectivity loss during this window causes silent timeout with no recovery.

---

### P1-13: Tenant document upload — no image compression, no XHR upload progress; 25MB limit on 3G

- **Category:** Frontend Component / Upload
- **Severity:** P1
- **Confidence:** static-confirmed
- **Source IDs:** PERF-08
- **Files:** `app/tenant/documents/TenantDocumentsClient.tsx:85–118`
- **Repro:** Tenant uploads ID card photo (3–8MB JPEG) on 3G. Raw file, no compression, no byte-level progress. Submit button shows disabled `submitting` state but no upload progress indicator. 15–40s wait on Fast 3G with no feedback. Same pattern as PERF-07 (contract upload).

---

## P2 — Fix Soon (14)

---

### P2-01: Dashboard `shortDate()` hardcodes `'en-US'` locale — dates always display in English

- **Category:** i18n
- **Severity:** P2
- **Confidence:** static-confirmed
- **Source IDs:** BUG-L-08
- **Files:** `app/landlord/dashboard/DashboardClient.tsx:103–105`
- **Repro:** Switch locale to TH or ZH-CN. Upcoming Payments date badges use `toLocaleDateString('en-US', ...)` — always outputs e.g. "Apr 11".

---

### P2-02: Onboarding "Invite Tenant" step routes to `/landlord/properties` instead of contract pair page

- **Category:** Frontend Component / State Management
- **Severity:** P2
- **Confidence:** static-confirmed
- **Source IDs:** BUG-L-09
- **Files:** `app/landlord/onboarding/page.tsx:337–342`
- **Repro:** Onboarding step 4 "Invite Tenant" click routes to `/landlord/properties`. No contract context — `_createdPropertyId` state exists but is not used to derive a contract ID. First-time user has no path to the pair page.

---

### P2-03: Onboarding step indicator off-by-one — fragile `stepIndex` logic

- **Category:** Frontend Component
- **Severity:** P2
- **Confidence:** static-confirmed
- **Source IDs:** BUG-L-10
- **Files:** `app/landlord/onboarding/page.tsx:114–116`
- **Repro:** Step label uses raw 0-based array index as display number. Currently renders correctly because `stepIndex` for `'property'` happens to be 1. If a step is inserted before `'property'`, the label silently shows the wrong number.

---

### P2-04: Pairing page — no ownership check before Generate button renders; API must be last defense

- **Category:** Auth / API Route
- **Severity:** P2
- **Confidence:** needs-browser-verification
- **Source IDs:** BUG-L-11
- **Files:** `app/landlord/contracts/[id]/pair/page.tsx:27`, `app/api/pairing/generate/route.ts`
- **Repro:** Landlord A navigates directly to `/landlord/contracts/{contract_of_B}/pair`. UI shows Generate button (only checks `!user`). API route must own the ownership check. Needs live test to confirm the API correctly rejects.

---

### P2-05: Upload path — `parse_failed` contracts deleted via anon Supabase client, bypassing ownership-checked DELETE API

- **Category:** Frontend Component / File Handling
- **Severity:** P2
- **Confidence:** static-confirmed
- **Source IDs:** BUG-L-12
- **Files:** `app/landlord/contracts/upload/page.tsx:134–137, 176–182`
- **Repro:** OCR SSE `step === 'error'`: client calls `supabase.from('contracts').delete().eq('id', ...)` directly (anon client). Bypasses cascade logic in `DELETE /api/contracts/{id}` (payments/penalties deletion, placeholder property cleanup). If OCR fails after a tenant is already paired, orphaned payment rows may result.

---

### P2-06: Float arithmetic for `security_deposit` — no `Math.round()` guard; fractional baht can propagate

- **Category:** Frontend Component / Database Query
- **Severity:** P2
- **Confidence:** static-confirmed
- **Source IDs:** BUG-L-13
- **Files:** `app/landlord/contracts/create/page.tsx:341`
- **Repro:** `monthly_rent * security_deposit_months` is JS float multiplication. If UI `number` input allows decimals (0.01 steps), a value like ฿12,333.33 × 2 = 24666.66 propagates as a non-integer to `payments.amount` (stored as Postgres `numeric`).

---

### P2-07: Documents SSR page queries `public_url` directly — always `null` for tenant uploads; "View" broken on load

- **Category:** Frontend Component / Database Query
- **Severity:** P2
- **Confidence:** static-confirmed
- **Source IDs:** BUG-T-06
- **Files:** `app/tenant/documents/page.tsx:36–41`, `app/api/documents/route.ts:225`
- **Repro:** Server-side page query selects `public_url` from DB. Tenant uploads set `public_url: null` at insert time. `TenantDocumentsClient` receives `null`. "View" button opens `null` in a new tab. The landlord GET endpoint generates signed URLs on read, but the SSR page bypasses the API entirely.

---

### P2-08: Maintenance form — no photo upload UI despite API accepting `photo_urls` (max 3)

- **Category:** Frontend Component
- **Severity:** P2
- **Confidence:** static-confirmed
- **Source IDs:** BUG-T-07
- **Files:** `app/tenant/maintenance/TenantMaintenanceClient.tsx:89–134`, `app/api/maintenance/route.ts:11`
- **Repro:** Tenant opens new maintenance request form — title + description only, no photo input. API schema accepts `photo_urls: z.array(z.string().url()).max(3)`. Detail modal renders `photo_urls` correctly for existing requests, but tenants can never attach any.

---

### P2-09: Penalty appeal button shown when `tenant_appeal_note` null at `pending_landlord_review` — compounds P0-04

- **Category:** Frontend Component
- **Severity:** P2
- **Confidence:** static-confirmed
- **Source IDs:** BUG-T-08
- **Files:** `app/tenant/penalties/appeal/page.tsx:152`
- **Repro:** `canAppeal(p.status) && !p.tenant_appeal_note` — button shows when status is `pending_landlord_review` and `tenant_appeal_note` is null. RLS policy then silently rejects the UPDATE (P0-04). The UI logic and the RLS policy disagree about which states are appealable.

---

### P2-10: Payments date formatter hardcodes `en-GB` locale — ignores user locale

- **Category:** i18n
- **Severity:** P2
- **Confidence:** static-confirmed
- **Source IDs:** BUG-T-09
- **Files:** `app/tenant/payments/page.tsx:73–79`
- **Repro:** Switch locale to TH or ZH-CN. All dates in payment list display in `en-GB` format (`"01 Jan 2026"`). The `useI18n` hook exposes a correct `formatDate` used elsewhere, but this page uses its own inline hardcoded formatter.

---

### P2-11: `GET /api/documents` — N signed-URL Supabase Storage calls per document list load; no caching

- **Category:** API Route / Database Query
- **Severity:** P2
- **Confidence:** static-confirmed
- **Source IDs:** PERF-09
- **Files:** `app/api/documents/route.ts:104–111`
- **Repro:** Handler calls `getSignedDocumentUrl()` for every document row in `Promise.all(rows.map(...))`. Parallelized correctly, but each call is a Supabase Storage round-trip. Landlord with 20 documents: 20 simultaneous Storage API calls. No caching of the 1-hour TTL signed URLs. 200–800ms overhead on constrained connections.

---

### P2-12: `<img>` without dimensions in PropertyImageGallery and TenantMaintenanceClient — CLS risk

- **Category:** Frontend Component
- **Severity:** P2
- **Confidence:** static-confirmed
- **Source IDs:** PERF-13
- **Files:** `components/landlord/PropertyImageGallery.tsx:142`, `app/tenant/maintenance/TenantMaintenanceClient.tsx:226`
- **Repro:** Raw `<img>` tags without explicit `width`/`height`. Gallery uses `aspect-square` container (partially mitigates CLS). Maintenance client image grid uses `h-24 w-full` without aspect-ratio container — images jump in height as they load. No `loading="lazy"`.

---

### P2-13: Tenant documents page — no `loading.tsx`; blank screen on RSC fetch on 3G

- **Category:** Frontend Component / Missing Loading State
- **Severity:** P2
- **Confidence:** static-confirmed
- **Source IDs:** PERF-14
- **Files:** `app/tenant/documents/page.tsx` (no `loading.tsx` sibling found)
- **Repro:** Navigate to `/tenant/documents` on Slow 3G. No `loading.tsx` in `app/tenant/documents/`. RSC fetches contracts + documents before rendering. Blank screen for ~500ms–2s. Other tenant routes have loading skeletons; this one does not.

---

### P2-14: `GET /api/documents` and `POST /api/documents` — tier check is a separate DB query on every request

- **Category:** API Route / Database Query
- **Severity:** P2
- **Confidence:** static-confirmed
- **Source IDs:** PERF-15
- **Files:** `app/api/documents/route.ts:47–53` (GET), `app/api/documents/route.ts:122–128` (POST)
- **Repro:** Both handlers fetch `profiles.tier` as a separate `select('tier')` query before any document operation. One extra Supabase RTT (~50–150ms server-side) on every document list load and every upload. `getAuthenticatedUser()` already fetches session but not profile.

---

## P3 — Backlog (7)

---

### P3-01: `renewals_banner_other` uses `{n}` placeholder but `renewals_banner_one` may contain unreplaced `{n}` in TH/ZH locales

- **Category:** i18n
- **Severity:** P3
- **Confidence:** needs-browser-verification
- **Source IDs:** BUG-L-14
- **Files:** `app/landlord/dashboard/DashboardClient.tsx:190–194`
- **Repro:** With exactly 1 expiring contract, `renewals_banner_one` is used with no `.replace('{n}', ...)`. If TH/ZH locale strings for this key contain a literal `{n}`, it renders unreplaced. Needs locale content verification.

---

### P3-02: Notification settings missing `lease_renewal_offer` / `lease_renewal_response` toggles

- **Category:** Frontend Component
- **Severity:** P3
- **Confidence:** static-confirmed
- **Source IDs:** BUG-T-10
- **Files:** `app/tenant/notifications/settings/page.tsx:18–33`
- **Repro:** `NotificationPrefs` interface and `groups` array lack `lease_renewal_offer` and `lease_renewal_response` keys. Notification inbox handles these types and cron sends them, but tenants cannot opt out.

---

### P3-03: Forward-dated contract pairing — `tenant_id` written before activation fails; corrupt partial state

- **Category:** API Route / State Management
- **Severity:** P3
- **Confidence:** static-confirmed
- **Source IDs:** BUG-T-11
- **Files:** `lib/contracts/activate.ts:63–70`, `app/api/pairing/redeem/route.ts:85–88`
- **Repro:** Tenant redeems pairing code for a future-dated contract. `activateContract` returns `{ success: false }`. Redeem route returns HTTP 500. Tenant sees generic "Failed to pair" with no explanation. `tenant_id` was already written at line 71–78 of redeem route before failure — contract has a linked tenant but no `active` status and no payment rows.

---

### P3-04: PWA app-shell does not cache `/landlord/dashboard` or `/tenant/dashboard` — always network-first

- **Category:** PWA
- **Severity:** P3
- **Confidence:** static-confirmed
- **Source IDs:** PERF-12
- **Files:** `public/sw.js:4–11`
- **Repro:** Navigation to dashboard routes always fires a network request on repeat visits. `networkFirstWithFallback` strategy is intentional for auth-gated pages, but a skeleton shell cached in SW would improve perceived load speed on repeat visits.

---

### P3-05: `?filter=expiring` in renewals banner links to unfiltered contracts list (known deferred)

- **Category:** Frontend Component
- **Severity:** P3
- **Confidence:** static-confirmed
- **Source IDs:** BUG-L-UX (UX-L-09), documented in SPRINT_REPORT_BETA_HARDENING.md:153
- **Files:** `app/landlord/contracts/page.tsx:1–5` (redirect), `app/landlord/dashboard/DashboardClient.tsx`
- **Repro:** Dashboard renewals banner "Review" button → `/landlord/contracts?filter=expiring` → redirects to `/landlord/properties` with no filtering. Banner intent is lost.

---

### P3-06: SimulationPanel may ship to all prod users — static import in layout ignores env flag

- **Category:** Frontend Component
- **Severity:** P3
- **Confidence:** needs-browser-verification
- **Source IDs:** PERF — perf-audit.md #10
- **Files:** App layout (SimulationPanel import location)
- **Repro:** Production build with `NEXT_PUBLIC_BETA_SIMULATIONS=false`. If SimulationPanel is statically imported in `layout.tsx` rather than dynamically imported behind the env check, the JS bundle ships to all users regardless of flag. Needs bundle analysis to confirm.

---

### P3-07: Contract wizard `handleGenerate` — sequential post-generation property/contract API calls add ~400–800ms after text is shown

- **Category:** API Route / AI Pipeline
- **Severity:** P3
- **Confidence:** needs-browser-verification
- **Source IDs:** PERF-11
- **Files:** `app/landlord/contracts/create/page.tsx:303–372`
- **Repro:** After AI generate call resolves, `setGeneratedContract(result.contract_text)` fires at line 319 before the `try` block that creates property + contract rows. User sees generated text immediately, but the background property/contract creation adds latency before the page resolves. Static analysis suggests this is non-blocking from the user's perspective; needs browser verification to confirm.

---

## Browser Verification Queue

The following items require live DevTools testing to confirm or fully quantify. Prompts are in the per-tester browser-prompt files.

| Bug ID             | Prompt File                    | Prompt ID          | What to verify                                    |
| ------------------ | ------------------------------ | ------------------ | ------------------------------------------------- |
| BUG-L-05 (P1-02)   | landlord-browser-prompts.md    | BROWSER-L-06       | Cross-tenant property leak via maintenance reload |
| BUG-L-11 (P2-04)   | landlord-browser-prompts.md    | BROWSER-L-05       | API ownership check on pairing generate           |
| BUG-L-14 (P3-01)   | landlord-browser-prompts.md    | BROWSER-L-07       | `renewals_banner_one` `{n}` in TH/ZH locale       |
| PERF-11 (P3-07)    | performance-browser-prompts.md | BROWSER-P-13       | Contract wizard generate blocking check           |
| PERF-06/07 (P0-05) | performance-browser-prompts.md | BROWSER-P-01, P-02 | 3G upload timing and serial vs parallel uploads   |
| BUG-T-05 (P1-07)   | tenant-browser-prompts.md      | BROWSER-T-07       | Stale closure fetch after navigation              |
| BUG-L-03 (P0-03)   | landlord-browser-prompts.md    | BROWSER-L-03       | API 400/403 on expired contract renew             |
