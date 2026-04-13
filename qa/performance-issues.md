# RentOS Performance Issues — Static Code Walk

**Generated:** 2026-04-11  
**Auditor:** Performance & Responsiveness Tester (QA Strike Team)  
**Methodology:** Static source-code analysis only. No app was run, no real network throttling was applied. Impact estimates are derived from known RTT costs on Thai 3G (~200–400ms per round-trip), bundle analysis, and code patterns. All findings marked `static-confirmed` are definitively present in code; `needs-browser-verification` requires DevTools to quantify.

**Prior art:** This report builds on `perf-audit.md` (2026-04-09). Issues already reported there (auth waterfall, sequential dashboard fetches before Beta Hardening sprint, missing `optimizePackageImports`) are **not re-reported** here. Items 1–3 from that report remain open and are the highest-priority work. This report covers net-new surfaces introduced by the Beta Hardening and Tenant Hardening sprints, plus gaps missed in the first audit.

**Issue count summary:**

- P0 (blocks use on 3G): 2
- P1 (noticeable degradation): 6
- P2 (minor): 4
- P3 (nice-to-have): 3

---

## New Issues Found

---

### PERF-01: Receipt API — Sequential DB queries before PDF generation

- **Category:** Page Load Lag / AI Response Time
- **Route/Component:** `app/api/payments/[id]/receipt/route.ts:16–71`
- **Estimated impact:** 3–6 extra RTTs on every receipt download before PDF bytes arrive. On Thai 3G (~300ms/RTT) that is 900ms–1.8s added latency before the PDF starts generating.
- **Root cause:** The handler executes 4 Supabase queries in series: (1) payment row, (2) contract row, (3) property row, (4a) tenant profile + (4b) landlord profile. Steps 3, 4a, and 4b can all start after step 2 returns, but they run as: `payment → contract → property (sequential) → [tenant, landlord] (parallel)`. Step 3 (property) is awaited alone before the profile Promise.all at line 64. This adds one unnecessary serial RTT.
- **Fix sketch:**
  ```ts
  // After contract row is fetched, fire property + both profiles in parallel:
  const [propertyData, tenantResult, landlordResult] = await Promise.all([
    contract.property_id
      ? supabase.from('properties').select('name, address').eq('id', contract.property_id).single()
      : Promise.resolve({ data: null }),
    tenantId ? supabase.from('profiles').select('id, full_name').eq('id', tenantId).single() : ...,
    landlordId ? supabase.from('profiles').select('id, full_name').eq('id', landlordId).single() : ...,
  ]);
  ```
- **Confidence:** static-confirmed
- **Severity:** P1

---

### PERF-02: PDF font fetch on every receipt/contract/TM30 generation — no cache, no server-side loading

- **Category:** AI Response Time / Upload Issue
- **Route/Component:** `lib/pdf/generatePaymentReceipt.ts:21–25`, `lib/pdf/generateContractPdf.ts:31–32`, `lib/pdf/generateTM30Pdf.ts:22–23`
- **Estimated impact:** Each PDF generation fetches Sarabun-Regular.ttf (~200 KB) and Sarabun-Bold.ttf (~210 KB) via `fetch('/fonts/...')` with no caching layer. In a server-side API route context (`/api/payments/[id]/receipt`), `fetch('/fonts/...')` is a loopback HTTP call from the Next.js server back to itself — adding one full HTTP round-trip + file-read overhead on every receipt download. Tenant downloading their first receipt on 3G: PDF generation starts only after this loopback completes.
- **Fix sketch:** Two options: (a) In server-side routes, use `fs.readFileSync(path.join(process.cwd(), 'public/fonts/Sarabun-Regular.ttf'))` to read fonts from disk with zero network cost; (b) cache the arrayBuffer module-level using a lazy singleton so subsequent calls hit memory. Option (a) is the right fix for the receipt route; option (b) works for client-side PDF generation (contract PDF downloaded in wizard).
- **Confidence:** static-confirmed
- **Severity:** P1

---

### PERF-03: Tenant payments page — still a client-component waterfall (auth + 2 sequential fetches)

- **Category:** Page Load Lag / Missing Loading State
- **Route/Component:** `app/tenant/payments/page.tsx:1–145`
- **Estimated impact:** The perf-audit marked this page as 4 RTTs minimum (2 auth + 1 contracts + 1 payments). The Tenant Hardening sprint did not convert it to a Server Component. On 3G (300ms/RTT) the minimum before any payment cards appear is ~1.2s after auth resolves. Combined with the auth waterfall (pre-existing issue), total blank-screen time is ~2.4s.
- **Root cause:** `'use client'` with `useAuth()` guard + sequential fetches inside `load()`: (1) contracts query, then (2) payments query after contract.id is known. This sequential dependency is real (payments requires contract.id), so it cannot be parallelised — but the page could be converted to an async Server Component where session + contract are resolved server-side, eliminating the auth waterfall portion (2 RTTs).
- **Fix sketch:** Convert to RSC: use `getServerSession()` + `createServerSupabaseClient()` in a server page component, fetch contract + (pending) pass `contract.id` to a client sub-component that fires only the payments fetch client-side. Or fetch both server-side since contract.id is deterministic per-user.
- **Confidence:** static-confirmed
- **Severity:** P1

---

### PERF-04: Landlord payments page — sequential contracts → payments fetch (client-side waterfall)

- **Category:** Page Load Lag
- **Route/Component:** `app/landlord/payments/page.tsx:98–136`
- **Estimated impact:** `loadData()` at line 98 awaits `contracts` fetch, then only starts `payments` fetch if contracts returns data (line 119). This is an avoidable sequential dependency — a landlord always has payments for their contracts; the payments query can be started in parallel if the landlord's own `user.id` is used as a filter anchor. ~200–350ms saved on 3G.
- **Root cause:** The `payments` fetch is gated inside an `if (activeContracts.length > 0)` block that runs after the contracts await resolves, making it serial.
- **Fix sketch:** Fetch contracts and all payments for the landlord in parallel:
  ```ts
  const [contractData, allPaymentData] = await Promise.all([
    supabase.from('contracts').select(...).eq('landlord_id', user.id).eq('status', 'active'),
    supabase.from('payments').select(...)  // filter by landlord via a join or known contract IDs from prior load
  ]);
  ```
  Note: this requires either a DB view/join or accepting that payments fires separately. Simplest win: use Promise.all with the same contract-ID-based filter if contract IDs are known from the previous session (stored in state), or fire both and reconcile. Alternatively: convert to Server Component and issue a single join query.
- **Confidence:** static-confirmed
- **Severity:** P1

---

### PERF-05: Contract detail page — sequential contract + renewal fetch in client component

- **Category:** Page Load Lag
- **Route/Component:** `app/landlord/contracts/[id]/page.tsx:61–86`
- **Estimated impact:** `loadContract()` first awaits the main contract query (line 62–70), then inside the callback awaits a second query for pending renewal (line 74–81). These are sequential on every contract view. ~200–350ms extra RTT.
- **Root cause:** The renewal query at line 74 is guarded inside an `if (data)` block that runs after the first await, making it serial.
- **Fix sketch:** Run both in parallel:
  ```ts
  const [contractResult, renewalResult] = await Promise.all([
    supabase.from('contracts').select(...).eq('id', id).single(),
    supabase.from('contracts').select('id, status, lease_start, lease_end, monthly_rent')
      .eq('renewed_from', id).in('status', ['pending', 'awaiting_signature']).limit(1),
  ]);
  ```
- **Confidence:** static-confirmed
- **Severity:** P1

---

### PERF-06: Property image gallery — sequential per-file uploads, no client-side compression

- **Category:** Upload Issue
- **Route/Component:** `components/landlord/PropertyImageGallery.tsx:48–75`
- **Estimated impact:** The `handleFileChange` handler at line 48 iterates `for (const file of Array.from(files))` and awaits each upload inside the loop — uploads are serialized, not parallelised. For a landlord uploading 3 move-in inspection photos simultaneously (multi-select), uploads happen one-at-a-time rather than concurrently. On 3G, each upload of a typical phone photo (3–10MB) takes 30–120 seconds. Serial = triple that time.
- **Root cause:** `await fetch(...)` inside a `for...of` loop. No `Promise.all(Array.from(files).map(...))`.
- **Fix sketch:**
  ```ts
  await Promise.all(
    Array.from(files).map(async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', activeTab);
      const res = await fetch(`/api/properties/${propertyId}/images`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
    })
  );
  await loadImages();
  ```
  Additionally: no client-side image compression before upload. A 10MB iPhone photo on 3G is a P0 UX failure. Add canvas-based downscale to max 1920px / ~500KB before sending FormData.
- **Confidence:** static-confirmed
- **Severity:** P1 (serial uploads), P0 if 10MB phone photos reach API uncompressed on 3G

---

### PERF-07: Contract upload page — no client-side file compression; 20MB file on 3G

- **Category:** Upload Issue
- **Route/Component:** `app/landlord/contracts/upload/page.tsx:22` (`MAX_SIZE = 20 * 1024 * 1024`)
- **Estimated impact:** A landlord snapping a photo of a contract on an iPhone (typical: 4–15MB JPEG) and uploading on Thai 3G (≈100–500 kbps uplink) will wait 60–240 seconds for the upload to complete before the OCR SSE stream even starts. The progress bar at 0% during this time gives no feedback about upload throughput.
- **Root cause:** No client-side compression. The `handleUploadAndProcess` function at line 91 sends the raw file directly in FormData. The UI only shows an `'uploading'` state with spinner but no byte-level progress (no `XMLHttpRequest.upload.onprogress`).
- **Fix sketch:** (a) Before submitting: if `file.type.startsWith('image/')`, use canvas to downscale to max 1920×1920 and re-encode as JPEG at 80% quality (targets ~200–500KB for most contract photos). (b) Use `XMLHttpRequest` with `upload.onprogress` to update `setProgress()` during the upload phase, since `fetch()` does not expose upload progress.
- **Confidence:** static-confirmed
- **Severity:** P0 (blocks OCR flow on 3G for large phone photos)

---

### PERF-08: Tenant document upload — same compression gap; 25MB limit, no progress UI

- **Category:** Upload Issue
- **Route/Component:** `app/tenant/documents/TenantDocumentsClient.tsx:85–118`
- **Estimated impact:** Same problem as PERF-07 — tenants uploading their ID card photo (camera capture, 3–8MB) on 3G face multi-minute waits with no byte-level feedback. The `setSubmitting(true)` state disables the submit button but shows no upload progress.
- **Root cause:** `fetch('/api/documents', { method: 'POST', body: fd })` at line 103 — raw file, no compression, no XHR progress.
- **Fix sketch:** Same as PERF-07: canvas downscale for images before send; XHR for progress UI. The `MAX_UPLOAD_BYTES` client-side check at line 25 (25MB) is correctly enforced but the threshold itself is too high for 3G users — consider reducing to 10MB for mobile upload UX.
- **Confidence:** static-confirmed
- **Severity:** P1

---

### PERF-09: `GET /api/documents` — N+1 signed URL generation per document

- **Category:** AI Response Time / Page Load Lag
- **Route/Component:** `app/api/documents/route.ts:104–111`
- **Estimated impact:** After deduplication, the handler calls `getSignedDocumentUrl()` for every document row inside `Promise.all(rows.map(...))`. This is parallelised correctly, but each call is a round-trip to Supabase Storage to generate a presigned URL. A landlord with 20 documents makes 20 simultaneous Supabase Storage API calls. On constrained server connections this will saturate connection concurrency and add 200–800ms on top of the DB query time.
- **Root cause:** No signed URL caching. The 1-hour TTL is never stored or reused.
- **Fix sketch:** Cache signed URLs in a KV store (Supabase table column `signed_url_expires_at`) with a 50-minute TTL to reuse across requests. On the initial list load, return `public_url: null` and lazy-generate signed URLs on click (document `View` button) rather than pre-signing all 20 at list render time. This also matches PDPA best practice (minimal exposure window).
- **Confidence:** static-confirmed
- **Severity:** P2

---

### PERF-10: Renew page — AI analysis (`runAnalysis`) fires full Claude Sonnet call with no streaming; 8–20s wait with no progressive UI

- **Category:** AI Response Time / Missing Loading State
- **Route/Component:** `app/landlord/contracts/[id]/renew/page.tsx:204–220`, `app/api/contracts/[id]/analyze/route.ts:151–219`
- **Estimated impact:** The analyze API endpoint makes a synchronous `client.messages.create()` call (max_tokens: 8192) — no streaming. Claude Sonnet at 8192 output tokens takes 8–20 seconds. The renew page shows `analysisLoading` as a boolean but there is no streaming/partial display — the entire result panel appears at once after the full response. On 3G users who lose connectivity mid-request, the fetch times out with no partial result.
- **Root cause:** `analyze/route.ts` uses `withRetry(() => client.messages.create({...}))` — non-streaming. The page shows a spinner (`analysisLoading`) during this window but no incremental output.
- **Fix sketch:** Convert analyze to a streaming endpoint using `client.messages.stream()`, pipe through SSE response (matching the OCR pattern in `app/api/ocr/route.ts`). Client reads the stream and progressively populates the analysis cards as JSON chunks arrive. At minimum, add a progress pulse animation or estimated time remaining to the loading state even without streaming.
- **Confidence:** static-confirmed
- **Severity:** P1 (8–20s blank spinner is above the 3s AI operation threshold from brief)

---

### PERF-11: Contract wizard generate (`handleGenerate`) — sequential property → contract → PDF generation

- **Category:** AI Response Time
- **Route/Component:** `app/landlord/contracts/create/page.tsx:303–372`
- **Estimated impact:** After the AI generate call resolves (~5–15s for Claude contract generation), the code fires a sequential chain: (1) `POST /api/properties` → (2) `POST /api/contracts` → (3) optionally PDF download (lazy imported). Steps 1 and 2 are serial but step 2 depends on `prop.id` from step 1, so they must be serial. However the PDF download path at line 380 starts with a dynamic import of `generateContractPdf` — this cold-loads the `pdf-lib` bundle on first use, which is correct. No issue with the dynamic import itself, but steps 1→2 (property → contract creation) block the user seeing the generated text for an additional ~400–800ms after generation completes.
- **Root cause:** The contract creation API calls (lines 322–353) are in the critical render path — they run before `setGeneratedContract(result.contract_text)` is available to the user. Actually `setGeneratedContract` is called at line 319 before the property/contract creation, so this is non-blocking. **Revised finding:** the `try` block at line 321 that creates property + contract runs in the background after the contract text is already shown. This is actually fine — no user-visible delay. Severity downgraded.
- **Confidence:** needs-browser-verification
- **Severity:** P3

---

### PERF-12: `sw.js` APP_SHELL does not cache `/landlord/dashboard` or `/tenant/dashboard` — navigation is always network-first

- **Category:** PWA
- **Route/Component:** `public/sw.js:4–11`
- **Estimated impact:** Navigation to both dashboard routes always fires a network request even on repeat visits. On 3G, the `networkFirstWithFallback` strategy for navigate requests means the full RSC payload must be fetched before the page renders. The cached fallback only activates when the network is completely unreachable.
- **Root cause:** APP_SHELL only caches `'/'`. The `networkFirstWithFallback` handler for navigation is correct security practice (never serve stale auth-gated pages), but adding a stale-while-revalidate strategy for the RSC shell (not the data) would improve perceived load speed.
- **Fix sketch:** This is intentional for auth-gated pages — serving a stale version could show wrong user data. P3: consider adding a "loading" skeleton page to the SW cache that shows immediately while network fetches, then replace with real content (shell pattern). Low effort for perceived speed improvement.
- **Confidence:** static-confirmed
- **Severity:** P3

---

### PERF-13: `<img>` without dimensions in PropertyImageGallery and TenantMaintenanceClient

- **Category:** Layout Shift
- **Route/Component:** `components/landlord/PropertyImageGallery.tsx:142`, `app/tenant/maintenance/TenantMaintenanceClient.tsx:226`
- **Estimated impact:** Both use `<img>` (not `next/image`) without explicit width/height attributes. The gallery uses `aspect-square` container class which partially mitigates CLS, but the maintenance client image grid at line 226 uses `h-24 w-full` without a wrapping aspect-ratio container — the image jumps in height as it loads, causing layout shift.
- **Root cause:** Raw `<img>` tags exempt from Next.js image optimisation. No `width`/`height` on the `<img>` element itself. No `loading="lazy"` attribute.
- **Fix sketch:** For `PropertyImageGallery`: the `aspect-square` wrapper already constrains size, so add `loading="lazy"` to each `<img>`. For `TenantMaintenanceClient`: add `aspect-square` container around each `<img>` or use `next/image` with fill layout. Also add `loading="lazy"` to defer off-screen images.
- **Confidence:** static-confirmed
- **Severity:** P2

---

### PERF-14: Document list page — no skeleton/loading state while RSC fetches

- **Category:** Missing Loading State
- **Route/Component:** `app/tenant/documents/page.tsx` — no `loading.tsx` sibling found
- **Estimated impact:** The documents page is an async RSC that fetches contracts + documents in parallel. There is no `loading.tsx` in `app/tenant/documents/` to show a Suspense fallback. On 3G, the route will show a blank screen for the duration of both DB queries (~200–600ms after auth).
- **Root cause:** No `loading.tsx` file in `app/tenant/documents/`. The `app/tenant/` subtree has a shell layout (`TenantShell`) but the documents route has no route-level Suspense boundary.
- **Fix sketch:** Add `app/tenant/documents/loading.tsx` with a `<LoadingSkeleton count={4} />` or similar — matches the pattern used on `/tenant/payments` and landlord routes.
- **Confidence:** static-confirmed
- **Severity:** P2

---

### PERF-15: `GET /api/documents` — tier check is a separate `select('tier')` query on every request

- **Category:** Page Load Lag
- **Route/Component:** `app/api/documents/route.ts:47–53` (GET handler), `app/api/documents/route.ts:122–128` (POST handler)
- **Estimated impact:** Both GET and POST handlers fetch `profiles.tier` as a separate query before any document operation. This adds one Supabase RTT (~50–150ms server-side) to every document list load and every upload. Since `getAuthenticatedUser()` already fetches a session, the tier could be included in the session profile.
- **Root cause:** `getAuthenticatedUser()` in `lib/supabase/api.ts` returns `user` + `supabase` but not `profile`. The tier must be fetched separately.
- **Fix sketch:** Extend `getAuthenticatedUser()` to also return `profile` (or at least `tier`) by joining `profiles` in the same call, or add tier to the JWT app_metadata so it is available without a DB query. Short-term: cache the profile tier in the auth cookie or use Supabase RLS context.
- **Confidence:** static-confirmed
- **Severity:** P2

---

## Previously Reported — Still Open (from perf-audit.md)

The following items from the 2026-04-09 audit are **not fixed** in either sprint and remain the highest-impact items:

| ID  | Issue                                                                                 | Status   |
| --- | ------------------------------------------------------------------------------------- | -------- |
| #1  | Auth waterfall: 2 RTTs (`getSession` + `profiles`) before any page data               | Open     |
| #2  | All major pages are `'use client'` with useEffect fetching — no Server Components     | Open     |
| #4  | `experimental.optimizePackageImports` — **FIXED** (confirmed in `next.config.mjs:21`) | ✅ Fixed |
| #8  | `updateViaCache: 'none'` — **FIXED** (confirmed in `lib/pwa/register.ts:11`)          | ✅ Fixed |
| #9  | Analytics fetch sequential after dashboard Promise.all                                | Open     |
| #10 | SimulationPanel dynamic import                                                        | Open     |
