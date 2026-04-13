# Tenant Flow Bug Report

**Total bugs:** 11 (1 P0, 4 P1, 4 P2, 2 P3)

**Methodology:** Static code walk — no live app run. All findings are from reading source files in
`app/tenant/`, `app/api/`, `supabase/migrations/`, `lib/`, and `middleware.ts`. Prior sprint reports
(SPRINT_REPORT_BETA_HARDENING.md, SPRINT_REPORT_TENANT_HARDENING.md) were read first to avoid
re-reporting closed issues.

---

### BUG-T-01: Appeal API bypasses RLS when status is `pending_landlord_review`

- **Severity:** P0
- **Locale:** all
- **Flow:** Penalties appeal
- **File(s):**
  - `app/tenant/penalties/appeal/page.tsx:96–97` — `canAppeal` includes `pending_landlord_review`
  - `supabase/migrations/20260406000001_initial_schema.sql:248–260` — RLS USING clause only allows UPDATE when `status = 'confirmed'`
  - `app/api/penalties/[id]/appeal/route.ts:22–25` — API updates `status → 'pending_tenant_appeal'`
- **Repro:**
  1. Landlord raises a penalty; status progresses to `pending_landlord_review` (after a prior appeal cycle)
  2. Tenant visits `/tenant/penalties/appeal`
  3. "Appeal" button is rendered (`canAppeal` returns true for `pending_landlord_review`)
  4. Tenant submits appeal note
  5. API hits Supabase UPDATE via the anon-key (user-session) client
- **Expected:** Appeal succeeds regardless of whether status is `confirmed` or `pending_landlord_review`
- **Actual:** RLS policy `penalties_tenant_appeal` USING condition requires `status = 'confirmed'`. A penalty at `pending_landlord_review` fails the USING check silently — the UPDATE returns 0 rows without a Supabase error code, so the API returns the unmodified row (no 500 thrown). The appeal is lost and the tenant sees no error.
- **Confidence:** static-confirmed

---

### BUG-T-02: `lease_expiry` custom-rule notification links to `/tenant/contracts` (404)

- **Severity:** P1
- **Locale:** all
- **Flow:** Notifications → tap a `lease_expiry` notification fired by a custom rule
- **File(s):** `app/api/cron/daily/route.ts:334` — `url: '/tenant/contracts'`
- **Repro:**
  1. Landlord creates a custom notification rule for `lease_expiry`
  2. Cron fires; custom rule path sends notification with `url: '/tenant/contracts'`
  3. Tenant taps notification in `/tenant/notifications`
- **Expected:** Routes to `/tenant/contract/view`
- **Actual:** Routes to `/tenant/contracts` which is a 404 (no such page exists). This is the secondary path noted as out-of-scope in T-BUG-11 sprint follow-up — it was not fixed.
- **Confidence:** static-confirmed

---

### BUG-T-03: PDF receipt Sarabun font loaded via relative `fetch('/fonts/...')` — fails in server-side Node context

- **Severity:** P1
- **Locale:** all
- **Flow:** Payments → Download Receipt
- **File(s):** `lib/pdf/generatePaymentReceipt.ts:21–23` — `fetch('/fonts/Sarabun-Regular.ttf')` and `fetch('/fonts/Sarabun-Bold.ttf')`
- **Repro:**
  1. Tenant clicks "Download Receipt" on a paid payment
  2. `GET /api/payments/[id]/receipt` runs inside a Next.js Route Handler (Node.js runtime)
  3. `generatePaymentReceipt` calls `fetch('/fonts/Sarabun-Regular.ttf')` with a relative URL
- **Expected:** Sarabun fonts are embedded in the PDF; Thai text renders correctly
- **Actual:** In Node.js (server context), `fetch` with a relative path (`/fonts/...`) has no base URL and throws a TypeError ("Failed to parse URL"). The outer `try/catch` in `loadFonts` silently falls back to Helvetica. Thai characters in the receipt (property names, landlord names, bilingual labels) render as replacement glyphs or empty boxes.
- **Confidence:** static-confirmed (relative `fetch` in Node is a known failure mode)

---

### BUG-T-04: Contract viewer — `parse_failed` and `scheduled` contract states not handled

- **Severity:** P1
- **Locale:** all
- **Flow:** Tenant contract viewer (known hotspot)
- **File(s):** `app/tenant/contract/view/page.tsx:53–82` — 3-step priority query: `active → awaiting_signature → pending`
- **Repro:**
  1. A contract exists with status `parse_failed` or `scheduled` (states added per contract state-machine memory)
  2. Tenant navigates to `/tenant/contract/view`
- **Expected:** Either shows the contract with a relevant status notice, or shows a contextual "your contract is being processed" message
- **Actual:** The query only checks `active`, `awaiting_signature`, `pending`. A `parse_failed` or `scheduled` contract is never fetched. `contract` is null → "You have no active contract" empty state is shown. This is particularly disorienting if the landlord has just uploaded and parsed the contract but it failed or is queued.
- **Confidence:** static-confirmed

---

### BUG-T-05: `TenantPaymentsPage` — stale closure on `load()` function

- **Severity:** P1 (silent stale data bug, mismatches landlord view)
- **Locale:** all
- **Flow:** Payments page — re-auth or user changes
- **File(s):** `app/tenant/payments/page.tsx:94–138` — `load` defined outside `useCallback`; `useEffect` suppresses exhaustive-deps lint rule
- **Repro:**
  1. Tenant loads payments page → `user` is captured in closure
  2. User session refreshes (token rotation) or navigates away and back
  3. `load()` is called again but captures the stale `user` reference
- **Expected:** Payments always reflect the current authenticated user's active contract
- **Actual:** Stale closure may fetch payments for the old user reference. Noted as perf-audit item #6. The `eslint-disable-next-line react-hooks/exhaustive-deps` at line 144 is the suppressed warning.
- **Confidence:** static-confirmed (matches perf-audit finding #6)

---

### BUG-T-06: Documents page SSR — `select('public_url')` but storage path not resolved server-side

- **Severity:** P2
- **Locale:** all
- **Flow:** Documents page initial load
- **File(s):** `app/tenant/documents/page.tsx:36–41` — server query selects `public_url` column directly from DB; `lib/storage/signedUrl.ts` signed-URL generation is NOT called here
- **Repro:**
  1. Tenant navigates to `/tenant/documents`
  2. SSR query runs: `select('id, category, public_url, ...')`
  3. `TenantDocumentsClient` receives the raw `public_url` from DB
- **Expected:** Documents list shows working "View" links (signed URLs)
- **Actual:** The `public_url` column in the DB is set to `null` for all tenant-uploaded documents (confirmed in `app/api/documents/route.ts:225` — tenant branch sets `public_url: null` at insert time). The server-side page query does not call `getSignedDocumentUrl`. The "View" button in the document list will open `null` in a new tab (broken link). The landlord GET endpoint (`app/api/documents/route.ts:103–111`) does generate signed URLs on read, but the SSR page bypasses the API entirely.
- **Confidence:** static-confirmed

---

### BUG-T-07: Maintenance form — no photo upload UI despite API accepting `photo_urls`

- **Severity:** P2
- **Locale:** all
- **Flow:** Submit maintenance request
- **File(s):**
  - `app/tenant/maintenance/TenantMaintenanceClient.tsx:89–134` — form has title + description only
  - `app/api/maintenance/route.ts:11` — schema accepts `photo_urls: z.array(z.string().url()).max(3)`
- **Repro:**
  1. Tenant opens new maintenance request form
  2. Looks for photo attachment option
- **Expected:** Tenant can attach up to 3 photos per their maintenance request (API supports it)
- **Actual:** No file/photo input exists in the form. The API schema documents up to 3 photo URLs but the tenant UI has no mechanism to upload or attach them. Maintenance detail modal does render `photo_urls` correctly (line 222–229), so photos from other sources would show — but tenants can never attach any.
- **Confidence:** static-confirmed

---

### BUG-T-08: Penalty appeal button visible when `tenant_appeal_note` already set AND status is `pending_landlord_review`

- **Severity:** P2
- **Locale:** all
- **Flow:** Penalties appeal — second appeal attempt
- **File(s):** `app/tenant/penalties/appeal/page.tsx:152` — condition: `canAppeal(p.status) && !p.tenant_appeal_note`
- **Repro:**
  1. Penalty status becomes `pending_landlord_review` AFTER a prior appeal was already submitted (i.e., `tenant_appeal_note` is set from the prior appeal but the landlord is re-reviewing)
  2. Tenant views penalties page
- **Expected:** Appeal button not shown (already appealed)
- **Actual:** When `tenant_appeal_note` is set, the `!p.tenant_appeal_note` guard hides the button — this is correct. But if `tenant_appeal_note` is null at `pending_landlord_review` (e.g., landlord moved to that status without a prior tenant appeal), the button is shown. The RLS policy then silently fails (BUG-T-01). The two bugs compound.
- **Confidence:** static-confirmed

---

### BUG-T-09: `TenantPaymentsPage` date formatter ignores user locale — always uses `en-GB`

- **Severity:** P2
- **Locale:** TH, ZH-CN
- **Flow:** Payment history date display
- **File(s):** `app/tenant/payments/page.tsx:73–79` — local `formatDate` function hardcodes `'en-GB'` locale
- **Repro:**
  1. Tenant switches locale to TH or ZH-CN
  2. Views payments page
- **Expected:** Dates formatted according to selected locale (e.g., Thai Buddhist calendar style or ZH short format)
- **Actual:** All dates in the payment list display in `en-GB` format (e.g., "01 Jan 2026") regardless of locale. The `useI18n` hook exposes `formatDate` (used correctly in maintenance and document pages), but payments page uses its own inline formatter.
- **Confidence:** static-confirmed

---

### BUG-T-10: Notification settings page missing `lease_renewal_offer` and `lease_renewal_response` toggles

- **Severity:** P3
- **Locale:** all
- **Flow:** Notification settings
- **File(s):** `app/tenant/notifications/settings/page.tsx:18–33` — `NotificationPrefs` interface; `groups` array lines 87–148
- **Repro:**
  1. Tenant navigates to notification settings
  2. Reviews available toggle groups
- **Expected:** Toggles for lease renewal offer and response notifications are present
- **Actual:** `NotificationPrefs` interface does not include `lease_renewal_offer` or `lease_renewal_response` keys. The notification inbox (`TYPE_ROUTES_TENANT`) handles these types and they are sent by the cron/events system, but there is no way to opt out of them via settings.
- **Confidence:** static-confirmed

---

### BUG-T-11: `activateContract` silently skips activation when `lease_start` is in the future

- **Severity:** P3
- **Locale:** all
- **Flow:** Pairing code redemption for a forward-dated contract
- **File(s):** `lib/contracts/activate.ts:63–70` — guard: `if (!leaseStart || leaseStart > today) return { success: false, ... }`; `app/api/pairing/redeem/route.ts:85–88` — returns 500 on `!result.success`
- **Repro:**
  1. Landlord creates a contract with `lease_start` in the future (e.g., next month)
  2. Landlord generates a pairing code
  3. Tenant redeems the code today
- **Expected:** Tenant is successfully paired to the contract; contract transitions to `active` on lease_start date (or a scheduled/pending state with clear messaging)
- **Actual:** `activateContract` returns `{ success: false, error: 'lease_start ... has not arrived yet' }`. The redeem route returns HTTP 500 to the tenant. The tenant sees a generic error "Failed to pair" with no explanation. The contract's `tenant_id` was already written in Step 1 (line 71–78 of redeem route) before the activation fails — the contract now has a tenant linked but is not active and has no payment rows. This leaves the contract in a corrupt partial state.
- **Confidence:** static-confirmed
