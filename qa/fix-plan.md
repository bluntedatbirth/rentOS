# RentOS Pre-Launch Fix Plan

**Generated:** 2026-04-11  
**Author:** Fix Planner, QA Strike Team  
**Inputs:** bug-triage.md, ux-pain-points.md, landlord-flow-bugs.md, tenant-flow-bugs.md, performance-issues.md

---

## Sprint Summary

| Sprint                | Items | Complexity    |
| --------------------- | ----- | ------------- |
| Hotfix (P0 + fast P1) | 9     | 3×S, 4×M, 2×L |
| Pre-Launch            | 12    | 4×S, 5×M, 3×L |
| Post-Launch           | 14    | 7×S, 5×M, 2×L |
| Backlog               | 7+UX  | 5×S, 2×M      |

---

## P0 — Launch Blockers

---

### P0-01: AI Wizard Always Creates Duplicate Property

- **Source:** BUG-L-01
- **Files:** `app/landlord/contracts/create/page.tsx:322–356`
- **Fix sketch:** At line 322, before calling `POST /api/properties`, check if `searchParams.get('property_id')` is set. If yes, skip the property creation entirely and use the existing property ID for the subsequent `POST /api/contracts`. Add `Math.round()` guard around `security_deposit` calculation at line 341 (see P2-06 dependency).
- **Secondary fix (same file):** When `output_language === 'english'`, ensure `raw_text_th` is populated (even as an empty string or a copy of the translated text) so the contract does not land in `parse_failed`. See P1-01 for the clauses issue.
- **Complexity:** M
- **Dependencies:** None (but P1-01 must land in the same sprint — partial fix here + P1-01 together produce a correct wizard flow)
- **Sprint:** Hotfix
- **Confidence:** High (static-confirmed)

---

### P0-02: handleConfirmPayment Calls Wrong Endpoint

- **Source:** BUG-L-02
- **Files:** `app/landlord/payments/page.tsx:173–185`
- **Fix sketch:** At line 173, change the fetch call from `PATCH /api/payments/${id}` to `POST /api/payments/${id}/confirm`. No other changes required — the `/confirm` route already exists with full notification + metadata logic.
- **Complexity:** S
- **Dependencies:** None
- **Sprint:** Hotfix
- **Confidence:** High (static-confirmed)

---

### P0-03: Renew API Allows Any Contract Status

- **Source:** BUG-L-03
- **Files:** `app/api/contracts/[id]/renew/route.ts:72–78`
- **Fix sketch:** After the ownership check at line 74, add: `if (original.status !== 'active') return NextResponse.json({ error: 'Only active contracts can be renewed' }, { status: 400 })`. This single guard closes the state machine hole.
- **Complexity:** S
- **Dependencies:** None
- **Sprint:** Hotfix
- **Confidence:** High (static-confirmed)

---

### P0-04: Penalty Appeal Silently Fails — RLS Mismatch

- **Source:** BUG-T-01
- **Files:** `supabase/migrations/20260406000001_initial_schema.sql:248–260`, `app/tenant/penalties/appeal/page.tsx:96–97`
- **Fix sketch (two parts):**
  1. **RLS migration:** Create a new migration file `supabase/migrations/20260412000001_fix_penalty_appeal_rls.sql`. Change the `penalties_tenant_appeal` policy USING clause from `status = 'confirmed'` to `status IN ('confirmed', 'pending_landlord_review')` so that tenants can appeal in both valid states.
  2. **Frontend guard:** In `canAppeal()` at `app/tenant/penalties/appeal/page.tsx:96–97`, ensure the set of statuses matches the updated RLS policy exactly. No change needed if it already includes both states — verify they are in sync.
- **Complexity:** M (requires migration file + policy test)
- **Dependencies:** P2-09 (UI button visibility fix) should land in the same deploy to complete the fix
- **Sprint:** Hotfix
- **Confidence:** High (static-confirmed)

---

### P0-05: No Client-Side Image Compression on Contract Upload

- **Source:** PERF-06, PERF-07
- **Files:** `app/landlord/contracts/upload/page.tsx:91` (handleUploadAndProcess), `components/landlord/PropertyImageGallery.tsx:48–75`
- **Fix sketch:**
  1. **Contract upload** (`upload/page.tsx`): Before appending file to FormData at line 91, add a canvas-based compression helper: if `file.type.startsWith('image/')`, downscale to max 1920×1920 at 80% JPEG quality targeting ~300–500KB. Replace raw file with compressed Blob in FormData. Switch from `fetch()` to `XMLHttpRequest` with `upload.onprogress` to drive the progress bar with real byte-level progress rather than a static spinner.
  2. **Property image gallery** (`PropertyImageGallery.tsx:48–75`): Change the `for...of` loop with `await` to `Promise.all(Array.from(files).map(async (file) => { ... }))`. Apply the same canvas compression before each upload.
- **Complexity:** L (compression helper is reusable; XHR refactor touches upload flow)
- **Dependencies:** Recommend extracting compression to `lib/upload/compressImage.ts` so PERF-08 (P1-13) reuses it
- **Sprint:** Hotfix
- **Confidence:** High (static-confirmed)

---

### P0-06: Sarabun Font Loaded via Relative fetch() in Server Context — All PDFs Broken

- **Source:** BUG-T-03, PERF-02
- **Files:** `lib/pdf/generatePaymentReceipt.ts:21–23`, `lib/pdf/generateContractPdf.ts:31–32`, `lib/pdf/generateTM30Pdf.ts:22–23`
- **Fix sketch:** In all three files, replace `fetch('/fonts/Sarabun-Regular.ttf')` and `fetch('/fonts/Sarabun-Bold.ttf')` with:
  ```ts
  import fs from 'fs';
  import path from 'path';
  const regularFont = fs.readFileSync(path.join(process.cwd(), 'public/fonts/Sarabun-Regular.ttf'));
  const boldFont = fs.readFileSync(path.join(process.cwd(), 'public/fonts/Sarabun-Bold.ttf'));
  ```
  This also eliminates the loopback HTTP penalty (PERF-02). The font bytes can be cached at module level if the file becomes a shared `lib/pdf/fonts.ts` singleton.
- **Complexity:** M (3 files, same pattern, low risk)
- **Dependencies:** None
- **Sprint:** Hotfix
- **Confidence:** High (static-confirmed; relative fetch in Node.js is a well-known failure mode)

---

## P1 — Must Fix Pre-Launch

---

### P1-01: Generated Contract Lands as parse_failed — No Structured Clauses

- **Source:** BUG-L-04
- **Files:** `app/landlord/contracts/create/page.tsx:334–352`, `app/api/contracts/route.ts:47–63`
- **Fix sketch:** After the AI generation call resolves and the contract row is created, trigger a reparse: call `POST /api/contracts/${contractId}/reparse` (if it exists on the OCR path) or inline the clause extraction. The cleanest fix is to have the generate API (`/api/contracts/generate` or equivalent) return `structured_clauses` alongside `contract_text` — these should be extractable from the same AI response with a second structured extraction pass. Alternatively, call `/api/contracts/${id}/reparse` immediately after creation in `handleGenerate`. Must land with P0-01 fix.
- **Complexity:** M
- **Dependencies:** P0-01 (same wizard flow)
- **Sprint:** Hotfix (paired with P0-01)
- **Confidence:** High (static-confirmed)

---

### P1-02: MaintenanceClient reloadRequests — No Explicit Landlord Scoping

- **Source:** BUG-L-05
- **Files:** `app/landlord/maintenance/MaintenanceClient.tsx:91–100`
- **Fix sketch:** Add `.eq('landlord_id', user.id)` to the `supabase.from('properties').select('id, name')` query at line 93. Even if RLS is correct, defense-in-depth requires an explicit filter at the query level. Verify that `user` is available in scope at this call site; if not, thread it through props or context.
- **Complexity:** S
- **Dependencies:** None (needs-browser-verification for full cross-tenant data leak, but the fix is correct regardless of RLS state)
- **Sprint:** Pre-Launch
- **Confidence:** Medium (fix is correct regardless; impact depends on RLS policy)

---

### P1-03 + P1-04: Dashboard Activity Feed — All Strings Hardcoded English (TH/ZH Broken)

- **Source:** BUG-L-06 (timestamps), BUG-L-07 (activity text)
- **Files:** `app/landlord/dashboard/DashboardClient.tsx:94–98` (relativeTime), `app/landlord/dashboard/page.tsx:299–333` (activity text)
- **Fix sketch (two parts):**
  1. **Timestamps** (`DashboardClient.tsx:94–98`): Replace hardcoded `'Just now'`, `'Yesterday'`, `` `${diffHours}h ago` ``, `` `${diffDays}d ago` `` in `relativeTime()` with `t('dashboard.just_now')`, `t('dashboard.yesterday')`, `t('dashboard.hours_ago', { n: diffHours })`, `t('dashboard.days_ago', { n: diffDays })`. Add missing keys to all three locale files (en/th/zh-CN).
  2. **Activity text** (`page.tsx:299–333`): The server-side page assembles activity text as English string literals. Extract `type` and relevant params (`propName`, `amount`, `title`) as structured data props on `ActivityItem`. Move string assembly to a client-side helper that calls `t()` with the correct locale. This is a slightly larger refactor but the only correct solution — baked server-side strings cannot be translated.
- **Complexity:** M
- **Dependencies:** None
- **Sprint:** Pre-Launch
- **Confidence:** High (static-confirmed)

---

### P1-05: lease_expiry Notification Links to 404

- **Source:** BUG-T-02
- **Files:** `app/api/cron/daily/route.ts:334`
- **Fix sketch:** At line 334, change `url: '/tenant/contracts'` to `url: '/tenant/contract/view'`.
- **Complexity:** S
- **Dependencies:** None
- **Sprint:** Hotfix (1-line fix, ships with P0 batch)
- **Confidence:** High (static-confirmed)

---

### P1-06: Contract Viewer Misses parse_failed and scheduled States

- **Source:** BUG-T-04
- **Files:** `app/tenant/contract/view/page.tsx:53–82`
- **Fix sketch:** Extend the query priority chain to include `parse_failed` and `scheduled`. When contract is found in one of these states, render a status-aware card instead of the "You have no active contract" empty state: for `parse_failed` → "Your contract could not be processed — your landlord has been notified"; for `scheduled` → "Your contract starts on [lease_start] — you're all set."
- **Complexity:** M
- **Dependencies:** None
- **Sprint:** Pre-Launch
- **Confidence:** High (static-confirmed)

---

### P1-07: Tenant Payments — Stale Closure on load()

- **Source:** BUG-T-05
- **Files:** `app/tenant/payments/page.tsx:94–138, 144`
- **Fix sketch:** Wrap `load` in `useCallback` with `[user]` in the dependency array. Remove the `eslint-disable-next-line react-hooks/exhaustive-deps` comment at line 144. If `user` is from an auth hook, ensure the hook returns a stable reference (common issue with `useAuth` implementations — if not stable, memoize the user ID separately).
- **Complexity:** S
- **Dependencies:** None (P1-09 RSC conversion would supersede this, but is a larger change — fix the closure as a stop-gap)
- **Sprint:** Pre-Launch
- **Confidence:** High (static-confirmed)

---

### P1-08: Receipt API — Sequential DB Queries (Avoidable RTT)

- **Source:** PERF-01
- **Files:** `app/api/payments/[id]/receipt/route.ts:16–71`
- **Fix sketch:** After fetching the payment and contract rows (steps 1–2, which must stay serial), fire property + tenant profile + landlord profile in a single `Promise.all` at step 3:
  ```ts
  const [propertyResult, tenantResult, landlordResult] = await Promise.all([
    supabase.from('properties').select('name, address').eq('id', contract.property_id).single(),
    tenantId
      ? supabase.from('profiles').select('id, full_name, email').eq('id', tenantId).single()
      : Promise.resolve({ data: null }),
    landlordId
      ? supabase.from('profiles').select('id, full_name').eq('id', landlordId).single()
      : Promise.resolve({ data: null }),
  ]);
  ```
- **Complexity:** S
- **Dependencies:** P0-06 (font fix should land first so PDF is actually correct before optimizing its delivery path)
- **Sprint:** Pre-Launch
- **Confidence:** High (static-confirmed)

---

### P1-09: Tenant Payments Page — Client Component Waterfall

- **Source:** PERF-03
- **Files:** `app/tenant/payments/page.tsx:1–145`
- **Fix sketch:** Convert to async Server Component. Use `createServerSupabaseClient()` + `getServerSession()` server-side. Fetch contract and payments in `Promise.all` (pass `contract.id` from the user's active contract which is deterministic per-user). Pass data as props to a thin client sub-component for any interactive elements (claim button, etc.). Remove `'use client'` and `useAuth()` guard from the top-level page.
- **Complexity:** L
- **Dependencies:** P1-07 (stale closure fix is superseded by this, but they can land in parallel)
- **Sprint:** Pre-Launch
- **Confidence:** High (static-confirmed)

---

### P1-10: Landlord Payments Page — Serial contracts→payments Fetch

- **Source:** PERF-04
- **Files:** `app/landlord/payments/page.tsx:98–136`
- **Fix sketch:** Refactor `loadData()` to fire contracts and payments fetches in parallel. Since the payments query currently depends on contract IDs, use the landlord's `user.id` as the payments filter anchor via a join query: `supabase.from('payments').select('*, contracts!inner(landlord_id)').eq('contracts.landlord_id', user.id)`. This eliminates the serial dependency entirely.
- **Complexity:** M
- **Dependencies:** None
- **Sprint:** Pre-Launch
- **Confidence:** High (static-confirmed)

---

### P1-11: Contract Detail Page — Serial contract + renewal Fetch

- **Source:** PERF-05
- **Files:** `app/landlord/contracts/[id]/page.tsx:61–86`
- **Fix sketch:** In `loadContract()`, replace the nested await with `Promise.all`:
  ```ts
  const [contractResult, renewalResult] = await Promise.all([
    supabase.from('contracts').select('...').eq('id', id).single(),
    supabase
      .from('contracts')
      .select('id, status, lease_start, lease_end, monthly_rent')
      .eq('renewed_from', id)
      .in('status', ['pending', 'awaiting_signature'])
      .limit(1),
  ]);
  ```
- **Complexity:** S
- **Dependencies:** None
- **Sprint:** Pre-Launch
- **Confidence:** High (static-confirmed)

---

### P1-12: AI Contract Analysis — Non-Streaming; 8–20s Blank Spinner

- **Source:** PERF-10
- **Files:** `app/landlord/contracts/[id]/renew/page.tsx:204–220`, `app/api/contracts/[id]/analyze/route.ts:151–219`
- **Fix sketch:** Convert `analyze/route.ts` to a streaming endpoint: replace `client.messages.create({...})` with `client.messages.stream({...})` and pipe through a `ReadableStream` SSE response (same pattern as `app/api/ocr/route.ts`). On the client, read SSE chunks and progressively populate analysis cards as content arrives. At minimum as a fast fix: add an estimated time banner ("Analysis takes 8–15 seconds…") and a pulsing skeleton to the loading state even without streaming.
- **Complexity:** L
- **Dependencies:** None
- **Sprint:** Pre-Launch
- **Confidence:** High (static-confirmed)

---

### P1-13: Tenant Document Upload — No Compression, No Progress UI

- **Source:** PERF-08
- **Files:** `app/tenant/documents/TenantDocumentsClient.tsx:85–118`
- **Fix sketch:** Apply the same compression helper extracted for P0-05 (`lib/upload/compressImage.ts`). Replace `fetch()` with `XMLHttpRequest` to expose `upload.onprogress` for byte-level progress display. Consider reducing `MAX_UPLOAD_BYTES` to 10MB for images.
- **Complexity:** M
- **Dependencies:** P0-05 (reuse the compression helper created there)
- **Sprint:** Pre-Launch
- **Confidence:** High (static-confirmed)

---

## P2 — Fix Soon (Post-Launch Sprint)

---

### P2-01: Dashboard shortDate() Hardcodes en-US

- **Source:** BUG-L-08
- **Files:** `app/landlord/dashboard/DashboardClient.tsx:103–105`
- **Fix sketch:** Replace `toLocaleDateString('en-US', ...)` with `toLocaleDateString(currentLocale, ...)` where `currentLocale` is derived from the `useI18n()` hook's locale value. One-line change.
- **Complexity:** S
- **Sprint:** Post-Launch

---

### P2-02: Onboarding "Invite Tenant" Routes to /landlord/properties

- **Source:** BUG-L-09
- **Files:** `app/landlord/onboarding/page.tsx:337–342`
- **Fix sketch:** After contract creation in step 3 (upload path), store the resulting `contractId` in component state. In step 4, use that ID to navigate to `/landlord/contracts/${contractId}/pair`. If step 3 was skipped, fall back to `/landlord/contracts` with a "Create a contract first" prompt.
- **Complexity:** M
- **Sprint:** Post-Launch

---

### P2-03: Onboarding Step Indicator Fragile Index Logic

- **Source:** BUG-L-10
- **Files:** `app/landlord/onboarding/page.tsx:114–116`
- **Fix sketch:** Replace raw `STEPS.indexOf(currentStep)` with an explicit display number map: `const STEP_DISPLAY_NUMBERS: Record<Step, number> = { welcome: 0, property: 1, upload: 2, invite: 3 }`. Use `STEP_DISPLAY_NUMBERS[currentStep]` for display. Future step insertions won't silently break the indicator.
- **Complexity:** S
- **Sprint:** Post-Launch

---

### P2-04: Pairing Page — No UI Ownership Check Before Generate Button

- **Source:** BUG-L-11
- **Files:** `app/landlord/contracts/[id]/pair/page.tsx:27`, `app/api/pairing/generate/route.ts`
- **Fix sketch:** In the page component, fetch the contract by ID server-side (or add a client-side ownership check against `user.id === contract.landlord_id`) before rendering the Generate button. The API route should already own this check (needs-browser-verification) — the UI guard is defense-in-depth and prevents confusing a landlord browsing a foreign contract URL.
- **Complexity:** S
- **Sprint:** Post-Launch

---

### P2-05: Upload Path Deletes parse_failed Contracts via Anon Client

- **Source:** BUG-L-12
- **Files:** `app/landlord/contracts/upload/page.tsx:134–137, 176–182`
- **Fix sketch:** Replace direct `supabase.from('contracts').delete()` calls with `fetch('/api/contracts/${contractId}', { method: 'DELETE' })`. This routes through the ownership-checked API route which also handles cascade cleanup (payments, penalties, placeholder properties).
- **Complexity:** S
- **Sprint:** Post-Launch

---

### P2-06: Float Arithmetic for security_deposit

- **Source:** BUG-L-13
- **Files:** `app/landlord/contracts/create/page.tsx:341`
- **Fix sketch:** Wrap the multiplication with `Math.round()`: `security_deposit: Math.round(data.monthly_rent * data.security_deposit_months)`. Also add `step="1"` to the monthly_rent `<input>` to prevent decimal input in the UI.
- **Complexity:** S
- **Sprint:** Post-Launch (also needed as part of P0-01 wizard fix — can ship together)

---

### P2-07: Documents SSR Selects public_url = null for Tenant Uploads

- **Source:** BUG-T-06
- **Files:** `app/tenant/documents/page.tsx:36–41`
- **Fix sketch:** Change the SSR page to call `GET /api/documents` instead of querying the DB directly. The API route already generates signed URLs. Alternatively, if keeping direct DB access, add a call to `getSignedDocumentUrl()` for each row before passing data to the client component — matching what the landlord API route does.
- **Complexity:** M
- **Sprint:** Post-Launch

---

### P2-08: Maintenance Form — No Photo Upload UI

- **Source:** BUG-T-07
- **Files:** `app/tenant/maintenance/TenantMaintenanceClient.tsx:89–134`
- **Fix sketch:** Add a file input (max 3 files, image/\* types) to the maintenance request form. On form submit, upload each file to Supabase Storage (reuse the tenant documents upload pattern) to get URLs, then include them in the `photo_urls` array in the POST body. The API already accepts this field.
- **Complexity:** M
- **Sprint:** Post-Launch

---

### P2-09: Penalty Appeal Button Visible When Should Be Hidden (Compounds P0-04)

- **Source:** BUG-T-08
- **Files:** `app/tenant/penalties/appeal/page.tsx:152`
- **Fix sketch:** After P0-04 RLS fix, update `canAppeal()` to exactly match the new RLS policy: `status IN ('confirmed', 'pending_landlord_review')`. The existing `&& !p.tenant_appeal_note` guard correctly hides re-appeal when already appealed. Verify the combined condition is correct for all penalty state transitions.
- **Complexity:** S
- **Dependencies:** P0-04 must land first to define the correct set of appealable states
- **Sprint:** Hotfix (ships with P0-04 in same deploy)

---

### P2-10: Tenant Payments Date Formatter Hardcodes en-GB

- **Source:** BUG-T-09
- **Files:** `app/tenant/payments/page.tsx:73–79`
- **Fix sketch:** Remove the local `formatDate` function and replace all uses with the `formatDate` from `useI18n()` hook (already used correctly elsewhere in the app). One function removal + variable swap.
- **Complexity:** S
- **Sprint:** Post-Launch

---

### P2-11: GET /api/documents — N Signed-URL Calls, No Caching

- **Source:** PERF-09
- **Files:** `app/api/documents/route.ts:104–111`
- **Fix sketch:** Lazy-generate signed URLs on demand (when the user clicks "View") rather than pre-signing all documents on list load. Change the list endpoint to return `storage_path` instead of signed URL. Add a thin `GET /api/documents/${id}/signed-url` endpoint that generates + caches the signed URL (store in a `signed_url_cache` column with `expires_at`; return cached value if `expires_at > now() + 10min`).
- **Complexity:** M
- **Sprint:** Post-Launch

---

### P2-12: img Without Dimensions — CLS Risk

- **Source:** PERF-13
- **Files:** `components/landlord/PropertyImageGallery.tsx:142`, `app/tenant/maintenance/TenantMaintenanceClient.tsx:226`
- **Fix sketch:** For PropertyImageGallery: add `loading="lazy"` to existing `<img>` tags (the `aspect-square` container already handles sizing). For TenantMaintenanceClient: wrap each `<img>` in a `<div className="aspect-square">` container and add `loading="lazy"`.
- **Complexity:** S
- **Sprint:** Post-Launch

---

### P2-13: Tenant Documents — No loading.tsx

- **Source:** PERF-14
- **Files:** `app/tenant/documents/` (new file needed)
- **Fix sketch:** Create `app/tenant/documents/loading.tsx` exporting a skeleton component with 4 placeholder card rows — matches the pattern used in `/tenant/payments/loading.tsx` and landlord routes.
- **Complexity:** S
- **Sprint:** Post-Launch

---

### P2-14: GET/POST /api/documents — Extra Tier-Check DB Query

- **Source:** PERF-15
- **Files:** `app/api/documents/route.ts:47–53, 122–128`
- **Fix sketch:** Extend `getAuthenticatedUser()` in `lib/supabase/api.ts` to also return the user's `profile` row (joining `profiles` in the same query or caching in a module-level LRU). This eliminates the extra `select('tier')` call on both document endpoints and any other route that needs profile data.
- **Complexity:** M
- **Sprint:** Post-Launch

---

## P3 — Backlog

---

### P3-01: renewals_banner_one May Have Unreplaced {n} in TH/ZH

- **Source:** BUG-L-14
- **Files:** `app/landlord/dashboard/DashboardClient.tsx:190–194`
- **Fix sketch:** Check locale files for `renewals_banner_one` key in TH and ZH-CN. If `{n}` appears in the string value, add `.replace('{n}', '1')` at the call site, or rewrite the key to not use a placeholder (use a static "1 contract expiring soon" translation).
- **Complexity:** S
- **Sprint:** Backlog (needs-browser-verification)

---

### P3-02: Notification Settings Missing lease_renewal_offer / lease_renewal_response Toggles

- **Source:** BUG-T-10
- **Files:** `app/tenant/notifications/settings/page.tsx:18–33`
- **Fix sketch:** Add `lease_renewal_offer` and `lease_renewal_response` keys to `NotificationPrefs` interface and add corresponding toggle groups to the `groups` array with appropriate labels.
- **Complexity:** S
- **Sprint:** Backlog

---

### P3-03: Forward-Dated Contract Pairing — Partial State on Activation Failure

- **Source:** BUG-T-11
- **Files:** `lib/contracts/activate.ts:63–70`, `app/api/pairing/redeem/route.ts:85–88`
- **Fix sketch:** In `redeem/route.ts`, do not write `tenant_id` before calling `activateContract`. Move the `tenant_id` write inside the success branch, or wrap both operations in a transaction. Also return a 422 (not 500) with a user-readable error message: "Your lease starts on [date]. You will be able to activate it from [date]."
- **Complexity:** M
- **Sprint:** Backlog

---

### P3-04: PWA App-Shell Doesn't Cache Dashboard Routes

- **Source:** PERF-12
- **Files:** `public/sw.js:4–11`
- **Fix sketch:** Add a stale-while-revalidate skeleton shell for the dashboard route (not the data — just the HTML/CSS skeleton). The skeleton shows immediately while the network fetch completes. This is intentional for auth-gated routes; the skeleton approach threads the needle.
- **Complexity:** M
- **Sprint:** Backlog

---

### P3-05: ?filter=expiring Banner Link Lands on Unfiltered List

- **Source:** BUG-L-UX / UX-L-09
- **Files:** `app/landlord/contracts/page.tsx:1–5`, `app/landlord/dashboard/DashboardClient.tsx`
- **Fix sketch:** Option B from UX plan: change banner link to `/landlord/properties` with a toast/highlight on rows with expiring contracts (saffron badge). Simpler than implementing a full filter on the contracts page.
- **Complexity:** M
- **Sprint:** Backlog

---

### P3-06: SimulationPanel May Ship to All Prod Users

- **Source:** PERF (perf-audit.md #10)
- **Files:** App layout (SimulationPanel import location — needs bundle analysis)
- **Fix sketch:** Verify via `NEXT_ANALYZE=true next build` that SimulationPanel is not in the main bundle when `NEXT_PUBLIC_BETA_SIMULATIONS=false`. If it is, convert to `dynamic(() => import('./SimulationPanel'), { ssr: false })` behind the env check.
- **Complexity:** S
- **Sprint:** Backlog (needs-browser-verification)

---

### P3-07: Contract Wizard Post-Generation Sequential API Calls Add Minor Latency

- **Source:** PERF-11
- **Files:** `app/landlord/contracts/create/page.tsx:303–372`
- **Fix sketch:** As noted in triage, `setGeneratedContract` fires before the property/contract API calls, so this is not user-visible blocking. If the API calls are still in the critical path in the live app (needs-browser-verification), consider parallelizing any independent post-generation work.
- **Complexity:** S
- **Sprint:** Backlog (needs-browser-verification)

---

## UX Pain Points — Implementation Specs

---

### UX-L-04: "Confirm Payment" Identical Label for Claimed vs Unclaimed (Rank 1)

- **Files:** `app/landlord/payments/page.tsx` (payment confirmation UI section)
- **Before:** Single "Confirm Payment" button regardless of payment state; color difference only (amber vs green).
- **After:** Two distinct UI paths: (1) Amber/claimed path shows a "Verify Claimed Payment" section with the tenant's claim note and copy "Your tenant says they paid on [date]. Tap below to confirm you received it." with confirm + reject buttons. (2) Green/unclaimed path shows a simpler "Mark as Paid" confirmation prompt. Labels, copy, and visual affordance are distinct.
- **Dependency:** Ships with P0-02 fix (same file)
- **Sprint:** Pre-Launch

---

### UX-T-06: "No Contract" Dead End on Every Tenant Page (Rank 2)

- **Files:** `app/tenant/dashboard/page.tsx`, `app/tenant/maintenance/`, `app/tenant/payments/page.tsx`, `app/tenant/penalties/`, `app/tenant/co-tenants/`
- **Before:** Plain `t('tenant.no_contract')` string on every page with no further guidance.
- **After:** A reusable `<NoPairCard />` component (create in `components/tenant/NoPairCard.tsx`) with: title "Pair with your landlord" / "จับคู่กับเจ้าของบ้าน", body "Enter the 6-character code your landlord shared with you", CTA button → `/tenant/pair`. Replace every bare `no_contract` string render with `<NoPairCard />`.
- **Sprint:** Pre-Launch

---

### UX-L-03: Wizard Creates New Property With No Warning When Prefilled (Rank 3)

- **Files:** `app/landlord/contracts/create/page.tsx` (step 6 Generate UI)
- **Before:** No indication whether Generate will create a new property or use an existing one.
- **After:** On the Generate step, show a summary card: if `?property_id=` is present → "Saving contract under: [existing property name]". If new → "Creating new property: [name from step 1]". This is purely a UI addition; the actual fix is in P0-01.
- **Dependency:** P0-01 must land first
- **Sprint:** Pre-Launch (attach to P0-01 PR)

---

### UX-L-02: Wizard Exits to Upload Page — State Lost on Back (Rank 4)

- **Files:** `app/landlord/onboarding/page.tsx:337` (upload step CTA)
- **Before:** `router.push('/landlord/contracts/upload')` — user leaves wizard, state is lost on Back.
- **After:** Change to `window.open('/landlord/contracts/upload', '_blank')` as a near-term fix so the wizard stays open behind the upload tab. Longer term (post-launch): embed an inline file picker in the wizard step using the same upload API.
- **Sprint:** Pre-Launch

---

### UX-T-01: Pair Page — No Guidance on Where to Find the Code (Rank 5)

- **Files:** `app/tenant/pair/page.tsx` (or equivalent pair redemption page)
- **Before:** Input with placeholder "ABC123" and no context.
- **After:** Add a one-line callout below the page title: "Ask your landlord for a 6-character pairing code" / "ขอรหัส 6 ตัวอักษรจากเจ้าของบ้าน". One-line copy addition.
- **Sprint:** Hotfix (S, ships with P0 batch — pure copy)

---

### UX-L-07: Pairing Page — QR and Code Share No Clear Hierarchy (Rank 6)

- **Files:** `app/landlord/contracts/[id]/pair/page.tsx`
- **Before:** QR code, "Or enter code" label, monospace code, expiry time, and 3-step instruction list at equal visual weight.
- **After:** Primary section: large bold "Share this code: XXXXXX" with a LINE/copy share button that pre-fills "Join RentOS — your code is XXXXXX. Enter it at [url]". Secondary section (smaller, below): QR code with label "Or scan this QR code in person". Expiry time moves to a caption under the code.
- **Sprint:** Pre-Launch

---

### UX-L-01: Skip Step in Onboarding Visually Suppressed (Rank 7)

- **Files:** `app/landlord/onboarding/page.tsx` (upload step layout)
- **Before:** "Upload Contract" is saffron primary button; "Skip this step" is secondary border button below it.
- **After:** Move "Skip / I'll do this later" above the upload CTA as a ghost button or plain link. Downgrade upload to a secondary/outline button. Add note: "You can upload your contract anytime from the Properties page." Upload becomes opt-in, not the implied default.
- **Sprint:** Pre-Launch

---

### UX-T-02: "I've Paid This" Button Label Ambiguous (Rank 8)

- **Files:** `app/tenant/payments/page.tsx` (claim button label key), locale files
- **Before:** `payments.claim_paid` key (presumably "I've Paid This" or similar) — implies payment is recorded immediately.
- **After:** Relabel to "Notify landlord I paid" / "แจ้งเจ้าของบ้านว่าชำระแล้ว". Add a hint below the button: "Your landlord will confirm receipt before this is marked complete."
- **Sprint:** Pre-Launch (copy + locale change)

---

### UX-L-05: No Landlord-Side Maintenance Request Creation (Rank 9)

- **Files:** `app/landlord/maintenance/MaintenanceClient.tsx` (header area)
- **Before:** No "+ New Request" button for landlord.
- **After:** Add "+ New Request" button in the maintenance page header. Open a form (modal or inline panel) with: contract dropdown, title, description, photo upload. Pre-fill `raised_by` with `user.id`. POST to the existing `POST /api/maintenance` endpoint.
- **Sprint:** Post-Launch

---

### UX-L-08: Empty Dashboard Dead-End for Returning Users (Rank 10)

- **Files:** `app/landlord/dashboard/page.tsx` or `DashboardClient.tsx` (empty state section)
- **Before:** Four stat cards showing "0" + empty-state messages with no CTA.
- **After:** When `totalPropertyCount === 0`, render a full-width empty-state card: "Welcome back! Add a property to get started." Primary CTA → `/landlord/onboarding`. Replace all four zero-stat cards with this single card.
- **Sprint:** Post-Launch

---

### UX-T-03: Auto-Reparse Triggers window.location.reload() — Looks Like Crash (Rank 11)

- **Files:** `app/tenant/contract/view/page.tsx` (auto-reparse logic)
- **Before:** Silent `window.location.reload()` on successful reparse — blank screen for 3–5s on Android.
- **After:** Show a subtle status banner ("Updating contract terms…") while reparse fires. On success, update state from the API response directly rather than reloading the page.
- **Sprint:** Post-Launch

---

### UX-L-06: Renewal Defaults to 12 Months Regardless of Original Lease (Rank 12)

- **Files:** `app/landlord/contracts/[id]/renew/page.tsx` (default lease end calculation)
- **Before:** `leaseEnd = addYears(prevEnd, 1)` always.
- **After:** `const originalDurationMs = originalLeaseEnd.getTime() - originalLeaseStart.getTime(); defaultEnd = new Date(prevEnd.getTime() + originalDurationMs)`. 12-month override still available via date picker.
- **Sprint:** Post-Launch

---

### UX-T-05: Co-Tenants "Remove" Fires With No Confirmation (Rank 13)

- **Files:** `app/tenant/co-tenants/` (remove button component)
- **Before:** `handleRemove` fires DELETE API immediately on tap.
- **After:** On tap, replace Remove button with inline two-button confirm: "[Remove] [Cancel]". Only fires DELETE on the second [Remove] tap. No modal needed.
- **Sprint:** Post-Launch

---

### UX-T-04: Maintenance Cost Shown Without Context — Tenants Assume Charge (Rank 14)

- **Files:** `app/tenant/maintenance/TenantMaintenanceClient.tsx` (detail modal, cost lines)
- **Before:** Bare `฿2,000` currency values with no attribution.
- **After:** Add caption "Repair cost (charged to landlord)" / "(ค่าซ่อมที่เจ้าของบ้านรับผิดชอบ)" below each cost line, or an info icon tooltip.
- **Sprint:** Post-Launch

---

### UX-T-07: Documents "View" Strands Tenant Outside App for Images (Rank 15)

- **Files:** `app/tenant/documents/TenantDocumentsClient.tsx` (View button handler)
- **Before:** `<a target="_blank">` for all documents including images — opens in raw browser tab.
- **After:** For `image/*` MIME types, show an in-app lightbox overlay instead of a new tab. PDF behavior (new tab) remains unchanged.
- **Sprint:** Post-Launch

---

### UX-L-09: ?filter=expiring Banner Link Lands on Unfiltered List (Rank 16)

- See P3-05 above (same fix).
- **Sprint:** Backlog

---

## Dependency Graph

```
P0-01 (wizard duplicate property)
  └── P1-01 (wizard parse_failed) — must ship together
  └── UX-L-03 (wizard summary card) — attaches to P0-01 PR

P0-02 (confirm payment endpoint)
  └── UX-L-04 (claimed vs unclaimed payment UX) — same file, same PR

P0-04 (RLS mismatch)
  └── P2-09 (UI button state) — must ship in same deploy

P0-05 (contract upload compression)
  └── P1-13 (tenant doc upload compression) — reuses compressImage helper from P0-05

P0-06 (Sarabun font)
  └── P1-08 (receipt API parallelization) — font fix first, then optimize delivery
```

All other items are independent.

---

## Browser Verification Queue (7 items)

These need live DevTools before final severity call:

| Bug ID             | What to verify                                    | Sprint impact                                                 |
| ------------------ | ------------------------------------------------- | ------------------------------------------------------------- |
| P1-02 (BUG-L-05)   | Cross-tenant property leak via maintenance reload | Stay P1 if leak confirmed; downgrade to P3 if RLS is airtight |
| P2-04 (BUG-L-11)   | API ownership check on pairing generate           | If API check is missing → escalate to P1                      |
| P3-01 (BUG-L-14)   | renewals_banner_one {n} in TH/ZH                  | If confirmed → P2                                             |
| P3-07 (PERF-11)    | Contract wizard generate blocking                 | If user-visible → escalate to P1                              |
| P0-05 (PERF-06/07) | 3G upload timing and serial vs parallel           | P0 confirmed static; browser run quantifies severity          |
| P1-07 (BUG-T-05)   | Stale closure after navigation                    | P1 confirmed static                                           |
| P0-03 (BUG-L-03)   | API 400/403 on expired contract renew             | P0 confirmed static; browser confirms UX impact               |
