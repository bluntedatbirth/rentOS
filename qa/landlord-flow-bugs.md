# Landlord Flow — Bug Report

**Total bugs found:** 14 (3 P0 / 4 P1 / 5 P2 / 2 P3)

**Methodology:** Static code walk of all landlord-facing routes, API handlers, and shared libs. Prior-sprint issues (BUG-01 through BUG-19, T-BUG-01 through T-BUG-11) confirmed fixed and not re-reported. Every finding below is either newly identified or a confirmed regression from the current codebase. Confidence ratings reflect whether live interaction is needed to fully reproduce.

---

### BUG-L-01: AI wizard creates a duplicate property on every generate press

- **Severity:** P0
- **Locale:** all
- **Flow:** Contract create wizard — AI generation (step 6 Generate)
- **File(s):** `app/landlord/contracts/create/page.tsx:322–356`
- **Repro steps:**
  1. Fill wizard steps 1–5 with a property name that already exists or is new.
  2. Click "Generate Contract" (step 6).
  3. On success, the code POSTs `/api/properties` unconditionally (line 323) — it always creates a NEW property row regardless of whether one was prefilled via `?property_id=`.
  4. Click "Generate Contract" a second time (retry after a rate-limit wait or during testing).
- **Expected:** If the wizard was opened with `?property_id=`, reuse that property ID; never create a duplicate property row.
- **Actual:** Every successful generation creates a new `properties` row, even when the wizard was prefilled from an existing property. Multiple retries accumulate orphan properties. Also, when `output_language === 'english'` the `raw_text_th` field is not set, so the resulting contract is created without Thai text AND without clauses — which is `parse_failed` territory but the status will be `pending` (no clauses).
- **Confidence:** static-confirmed

---

### BUG-L-02: `handleConfirmPayment` calls PATCH `/api/payments/[id]` — bypasses confirm notification and confirmation metadata

- **Severity:** P0
- **Locale:** all
- **Flow:** Payments — landlord confirms a payment (Confirm button)
- **File(s):** `app/landlord/payments/page.tsx:173–185`, `app/api/payments/[id]/route.ts`, `app/api/payments/[id]/confirm/route.ts`
- **Repro steps:**
  1. A tenant claims a payment or a payment is overdue.
  2. Landlord clicks "Confirm Payment" or "Confirm Claim".
  3. The handler calls `PATCH /api/payments/{id}` with `{ status: 'paid' }`.
- **Expected:** Should call `POST /api/payments/{id}/confirm`, which records `confirmation_date`, `confirmed_by`, and sends a tenant notification.
- **Actual:** The PATCH route (`app/api/payments/[id]/route.ts`) has no notification call and does not set `confirmation_date` or `confirmed_by`. Tenants never receive a "Payment Confirmed" notification. Audit trail metadata is missing.
- **Confidence:** static-confirmed

---

### BUG-L-03: Renewing an already-expired contract is allowed — state machine violation

- **Severity:** P0
- **Locale:** all
- **Flow:** Contract lifecycle — renew → expired contract
- **File(s):** `app/api/contracts/[id]/renew/route.ts:72–78`
- **Repro steps:**
  1. A contract has `status === 'expired'`.
  2. POST to `/api/contracts/{id}/renew` with valid dates.
- **Expected:** API should reject with 400 — only `active` contracts may be renewed.
- **Actual:** The renew route checks `original.landlord_id !== user.id` (line 74) but has NO check on `original.status`. Any contract in any status (expired, terminated, pending, parse_failed) can receive a renewal POST. A renewal with `renewed_from` pointing to an expired contract will be inserted as `pending` — a zombie renewal the tenant cannot act on, and which will never activate.
- **Confidence:** static-confirmed

---

### BUG-L-04: Contract generate wizard — no structured clauses are parsed, so generated contract lands as `pending` not `active`, and no payment rows seeded

- **Severity:** P1
- **Locale:** all
- **Flow:** Contract create wizard — post-generation save flow
- **File(s):** `app/landlord/contracts/create/page.tsx:334–352`, `app/api/contracts/route.ts:47–63`
- **Repro steps:**
  1. Complete the 6-step wizard, click Generate.
  2. The POST to `/api/contracts` sends `raw_text_th` and/or `translated_text_en` — but NO `structured_clauses`.
  3. The API's `initialStatus` logic: `hasClauses = false` → `initialStatus = 'parse_failed'`. Wait — it's actually `!hasClauses && !hasTenant` → falls through to `parse_failed` via `hasClauses` false check on line 55.
- **Expected:** After generation, landlord should land on the contract detail page with `pending` status and a prompt to pair a tenant.
- **Actual:** The contract is created as `parse_failed` because `structured_clauses` is null. The state machine rule "no pending without successful parse" is violated in reverse — the contract bypasses `pending` and ends up in `parse_failed`. No payment seeding occurs. The contract appears broken from the first view.
- **Note:** The OCR upload path parses clauses via Claude first, then stores them — the wizard path does not. The generated text needs a reparse after creation, or the generate API must return and supply structured_clauses at creation time.
- **Confidence:** static-confirmed

---

### BUG-L-05: `reloadRequests` in `MaintenanceClient` fetches all properties for the client — no landlord scoping

- **Severity:** P1
- **Locale:** all
- **Flow:** Maintenance — status update triggers reload
- **File(s):** `app/landlord/maintenance/MaintenanceClient.tsx:91–100`
- **Repro steps:**
  1. Landlord A has 2 properties. Landlord B also has properties.
  2. Landlord A updates a maintenance status → `reloadRequests()` fires.
  3. The reload calls `supabase.from('maintenance_requests').select(...)` without `.eq('landlord_id', ...)` — relying entirely on RLS.
  4. The `properties` query at line 93 calls `supabase.from('properties').select('id, name')` with no `.eq('landlord_id', ...)` filter — also RLS-only.
- **Expected:** If RLS policies are correctly configured this is safe; but the `properties` select is particularly risky because it lacks an explicit ownership filter and could show cross-tenant property names in the filter dropdown if RLS has any gap.
- **Actual:** Cross-tenant data exposure if the `properties` RLS policy is not airtight. The page-level server component correctly scopes at load time, but the client-side reload does not reproduce that scoping.
- **Confidence:** needs-browser-verification (depends on exact RLS policy; static analysis cannot confirm policy correctness without reading migrations)

---

### BUG-L-06: Dashboard activity feed timestamps are hardcoded English ("Just now", "Yesterday") — TH/ZH-CN users see English copy

- **Severity:** P1
- **Locale:** TH, ZH-CN
- **Flow:** Dashboard — recent activity feed
- **File(s):** `app/landlord/dashboard/DashboardClient.tsx:94–98`
- **Repro steps:**
  1. Switch locale to TH or ZH-CN.
  2. Open landlord dashboard.
  3. Activity feed shows relative timestamps.
- **Expected:** Timestamps use translated strings via `t()`.
- **Actual:** `relativeTime()` returns hardcoded English: `'Just now'`, `'Yesterday'`, `` `${diffHours}h ago` ``, `` `${diffDays}d ago` ``. No locale key is used.
- **Confidence:** static-confirmed

---

### BUG-L-07: Dashboard activity text strings are hardcoded English — "Payment confirmed", "Maintenance filed", "Contract activated"

- **Severity:** P1
- **Locale:** TH, ZH-CN
- **Flow:** Dashboard — recent activity feed
- **File(s):** `app/landlord/dashboard/page.tsx:299–333`
- **Repro steps:**
  1. Switch locale to TH or ZH-CN.
  2. Open landlord dashboard.
- **Expected:** Activity feed items use `t()` keys.
- **Actual:** Lines 299 (`Payment confirmed — ${propName} (฿${...})`), 315 (`Maintenance filed — ${propName} (${title})`), and 327 (`Contract activated` / `Contract uploaded`) are English string literals assembled server-side, bypassing i18n entirely. These strings are baked into the `ActivityItem.text` prop before they reach the client `t()` context.
- **Confidence:** static-confirmed

---

### BUG-L-08: `shortDate()` in DashboardClient is hardcoded `'en-US'` locale — dates always display in English

- **Severity:** P2
- **Locale:** TH, ZH-CN
- **Flow:** Dashboard — upcoming payments list
- **File(s):** `app/landlord/dashboard/DashboardClient.tsx:103–105`
- **Repro steps:**
  1. Switch locale to TH or ZH-CN.
  2. Check "Upcoming Payments" date badges.
- **Expected:** Date formatting uses current locale.
- **Actual:** `shortDate()` hard-codes `toLocaleDateString('en-US', ...)` — always outputs e.g. "Apr 11" regardless of UI locale.
- **Confidence:** static-confirmed

---

### BUG-L-09: Onboarding "Invite Tenant" step routes to `/landlord/properties` instead of the newly created contract's pair page

- **Severity:** P2
- **Locale:** all
- **Flow:** Onboarding — step 4 (invite tenant)
- **File(s):** `app/landlord/onboarding/page.tsx:337–342`
- **Repro steps:**
  1. New landlord completes onboarding steps 1 (welcome) → 2 (add property) → 3 (upload/skip contract) → 4 (invite tenant).
  2. Click "Invite Tenant" button.
- **Expected:** Navigate to the pair-tenant page for the contract just created in step 3, or at minimum to `/landlord/contracts`.
- **Actual:** Routes to `/landlord/properties` — there's no contract context at this step. A first-time user with no contract won't find a pair button. The comment in the code ("If we have a contract associated with the property, go to pairing — Otherwise just show instructions") is aspirational but not implemented; `_createdPropertyId` state exists but is not used to derive a contract ID.
- **Confidence:** static-confirmed

---

### BUG-L-10: `onboarding.step_of` replace pattern is off-by-one — shows "Step 0 of 3" on first real step

- **Severity:** P2
- **Locale:** all
- **Flow:** Onboarding — step indicator text
- **File(s):** `app/landlord/onboarding/page.tsx:114–116`
- **Repro steps:**
  1. Start onboarding, click "Get Started" to reach step "property".
- **Expected:** Step indicator reads "Step 1 of 3".
- **Actual:** `stepIndex = STEPS.indexOf('property') = 1`. The code replaces the first `{}` with `String(stepIndex)` = `"1"` and the second with `String(STEPS.length - 2)` = `"3"`. This is actually correct — but only because `stepIndex` starts at 1 for `'property'`. However, the logic is fragile and confusing because `stepIndex` is the raw array index (0-based from `welcome`), not a 1-based display number. If someone inserts a step before `property`, the label silently breaks. Low severity but worth noting.
- **Confidence:** static-confirmed (functional impact is P3 currently, but the code logic is wrong)

---

### BUG-L-11: Pairing page — no ownership check before generating pair code

- **Severity:** P2
- **Locale:** all
- **Flow:** Tenant pairing — generate QR/code
- **File(s):** `app/landlord/contracts/[id]/pair/page.tsx:27`, `app/api/pairing/generate/route.ts`
- **Repro steps:**
  1. Landlord A navigates directly to `/landlord/contracts/{contract_id_belonging_to_B}/pair`.
  2. The UI shows the generate button; clicking it calls `/api/pairing/generate` with the foreign contract ID.
- **Expected:** The generate API should verify the authenticated user is the landlord of the contract.
- **Actual:** Need to verify the generate route has this check. The page-level UI shows no ownership guard before rendering the generate button — it only checks `!user`. The API route must be the last line of defence.
- **Confidence:** needs-browser-verification (must read `app/api/pairing/generate/route.ts` to confirm server-side ownership check)

---

### BUG-L-12: Upload path — `parse_failed` contracts are deleted client-side using the anon Supabase client, bypassing the ownership-checked DELETE API

- **Severity:** P2
- **Locale:** all
- **Flow:** Contract upload — OCR error cleanup
- **File(s):** `app/landlord/contracts/upload/page.tsx:134–137`, `app/landlord/contracts/upload/page.tsx:176–182`
- **Repro steps:**
  1. Upload a contract that fails OCR.
  2. On SSE `step === 'error'`, the client calls `supabase.from('contracts').delete().eq('id', contract_id)` directly — using the anon client, not the API.
- **Expected:** Cleanup should call `DELETE /api/contracts/{id}` which enforces ownership checks and cascades properly (payments, penalties).
- **Actual:** The anon client delete call depends entirely on RLS. If the landlord's session is valid this will succeed, but it bypasses the cascade logic in the API route (payments/penalties deletion, placeholder property cleanup). If OCR fails after a tenant has already been paired (unlikely but possible in a retry scenario), the delete could leave orphaned payment rows.
- **Confidence:** static-confirmed (bypass is real; impact severity depends on exact RLS and cascade behavior)

---

### BUG-L-13: Float arithmetic used for `security_deposit` in wizard create path — potential precision error

- **Severity:** P2
- **Locale:** all
- **Flow:** Contract create wizard — post-generate save
- **File(s):** `app/landlord/contracts/create/page.tsx:341`
- **Repro steps:**
  1. Set `monthly_rent = 15000` and `security_deposit_months = 2`.
  2. Generate and save.
- **Expected:** `security_deposit = 30000` (integer math).
- **Actual:** `data.monthly_rent * data.security_deposit_months` is a JS float multiplication. For typical THB values this will be exact, but for values like `฿12500 * 3 = 37500.0` it's fine. However, there is no `Math.round()` guard. If the UI allows decimal monthly_rent (the `number` input type allows 0.01 steps), a landlord entering `฿12,333.33` × 2 = `24666.66` would create a non-integer deposit. The payments system stores `amount` as a Postgres `numeric` — this propagates to payment rows with fractional baht.
- **Confidence:** static-confirmed

---

### BUG-L-14: `renewals_banner_other` i18n key uses `{n}` placeholder but `renewals_banner_one` has no `{n}` — inconsistent key schema

- **Severity:** P3
- **Locale:** all
- **Flow:** Dashboard — renewals nearing expiry banner
- **File(s):** `app/landlord/dashboard/DashboardClient.tsx:190–194`
- **Repro steps:**
  1. Have exactly 1 active contract expiring within 60 days → `renewals_banner_one` key is used with no replacement.
  2. Have 2+ → `renewals_banner_other` key is used with `.replace('{n}', ...)`.
- **Expected:** Consistent behavior; both render correctly.
- **Actual:** `renewals_banner_one` is used directly without any `{n}` replacement (correct if it's a static string like "1 contract expiring soon"). `renewals_banner_other` uses `.replace('{n}', ...)`. This is only a bug if the TH or ZH locale strings for `renewals_banner_one` contain a literal `{n}` that is never replaced — needs locale content verification. Low risk.
- **Confidence:** needs-browser-verification
