# RentOS Performance Browser Prompts

**Generated:** 2026-04-11  
**For:** PO / QA tester running live DevTools verification  
**Methodology note:** These are click-path UI tests. No API calls, no CLI, no cron triggers. All steps use the browser UI only. Open DevTools before each test; throttle network in the Network tab as instructed.

**Prerequisites:**

- App running at `http://localhost:3000` (or production URL)
- Chrome DevTools: Network tab → Throttling dropdown available
- A test landlord account with at least 1 active contract and 1 active property
- A test tenant account paired to that contract with at least 1 paid payment

---

## P0 Issues

---

### BROWSER-P-01: Contract photo upload — 10MB phone photo on 3G

**Related PERF:** PERF-06 (serial uploads, no compression), PERF-07  
**URL:** `http://localhost:3000/landlord/properties/{property-id}`  
**Precondition:** DevTools open → Network tab → set throttling to **Slow 3G** (≈ 50 kbps download / 25 kbps upload). Have a real phone photo in your camera roll (or any JPEG ≥ 3MB). Navigate to a property detail page.  
**Steps:**

1. Scroll to the "Property Photos" section
2. Click the Move-In tab
3. Click the file picker button to select photos
4. Select 2–3 photos simultaneously (hold Ctrl/Cmd to multi-select) each ≥ 2MB
5. Watch the upload spinner
6. Note: does the UI show byte-level progress? Does it indicate upload #1 of 3, #2 of 3?
7. Open Network tab → observe requests — do all 3 file uploads fire simultaneously or one-by-one?
8. Time from file selection to success confirmation

**Measure:** Upload request count concurrency, total time, presence/absence of per-file progress  
**Success criteria:** All uploads fire concurrently (3 XHR in-flight simultaneously); byte-level progress shown; total time < 60s for 3×2MB on Slow 3G  
**Expected failure (current code):** Uploads are serial (1 completes → next starts), no byte progress, blank spinner throughout

---

### BROWSER-P-02: Contract image upload before OCR — large JPEG on 3G

**Related PERF:** PERF-07  
**URL:** `http://localhost:3000/landlord/contracts/upload`  
**Precondition:** DevTools → Network tab → **Slow 3G**. Have a JPEG image ≥ 5MB ready.  
**Steps:**

1. Navigate to the contract upload page
2. Drop or select a JPEG file ≥ 5MB
3. Click "Upload & Process"
4. Watch the progress bar and step label
5. Open Network tab → observe the `POST /api/contracts/upload` request
6. Time from clicking "Upload & Process" to the progress bar moving past 5%

**Measure:** Time for upload phase to complete (progress 0%→5%), presence of upload byte progress  
**Success criteria:** Upload byte progress visible to user; file compressed client-side to < 1MB before send; time to 5% < 30s on Slow 3G  
**Expected failure (current code):** Progress bar stuck at 0% with spinning animation for the entire upload duration (60–240s for 5MB on Slow 3G); no byte-level feedback

---

## P1 Issues

---

### BROWSER-P-03: Receipt PDF download — time from click to PDF bytes

**Related PERF:** PERF-01, PERF-02  
**URL:** `http://localhost:3000/tenant/payments`  
**Precondition:** DevTools → Network tab → **Fast 3G** (1.6 Mbps / 750 kbps). Signed in as a tenant with at least 1 paid payment.  
**Steps:**

1. Navigate to Payments page
2. Find a paid payment row (shows "Download Receipt" button)
3. Open Network tab → clear existing requests
4. Click "Download Receipt"
5. Observe the XHR/fetch to `/api/payments/{id}/receipt`
6. Note: when does the request start? How long until response bytes arrive?
7. Does the button show a loading state while waiting?

**Measure:** Time from click to PDF response arrival (Waterfall in Network tab, "Time" column for the receipt request)  
**Success criteria:** Receipt available in < 3s; button shows loading spinner while waiting  
**Expected finding:** 2–4s on Fast 3G (4 sequential DB queries + loopback font fetch + pdf-lib generation); button may show no loading state

---

### BROWSER-P-04: Tenant payments page — time to first payment card

**Related PERF:** PERF-03  
**URL:** `http://localhost:3000/tenant/payments`  
**Precondition:** DevTools → Network tab → **Slow 3G**. Performance tab: click Record. Hard refresh (Ctrl+Shift+R).  
**Steps:**

1. Hard refresh the page on Slow 3G
2. Note time from navigation start to first payment card visible
3. Network tab: observe the request waterfall — count how many requests complete before any payment card appears
4. Identify the `getSession`, `profiles`, contracts, and payments requests in order

**Measure:** FCP, LCP, time-to-first-payment-card  
**Success criteria:** First payment card visible within 3s on Slow 3G  
**Expected finding:** 5–8s blank screen (auth waterfall: 2 RTTs × 600ms + contract query + payments query); LoadingSkeleton visible only after auth resolves

---

### BROWSER-P-05: Landlord payments page — time to first payment card

**Related PERF:** PERF-04  
**URL:** `http://localhost:3000/landlord/payments`  
**Precondition:** DevTools → Network tab → **Slow 3G**. Signed in as landlord with active contracts and payments.  
**Steps:**

1. Hard refresh on Slow 3G
2. Watch Network tab waterfall
3. Note when `contracts` query fires vs when `payments` query fires — is there a gap?
4. Time from page navigation to first payment card visible

**Measure:** Time delta between contracts response and payments request start; total time to first payment card  
**Success criteria:** Payments query fires in parallel with contracts query; first card visible < 3s  
**Expected finding:** Payments query starts only after contracts response arrives (~300–600ms serial gap); total ~4–6s on Slow 3G

---

### BROWSER-P-06: Contract detail — serial load of contract + renewal check

**Related PERF:** PERF-05  
**URL:** `http://localhost:3000/landlord/contracts/{contract-id}` (use a contract that has a renewal)  
**Precondition:** DevTools → Network tab → **Regular 4G** (simulate Thai mobile). Have a contract with a pending renewal.  
**Steps:**

1. Navigate to a contract detail page
2. In Network tab, filter by `supabase` or XHR
3. Observe: does the renewal query fire at the same time as the main contract query, or does it start after the contract query completes?
4. Note the time delta between the two query start times

**Measure:** Time delta between contract query and renewal query start (should be 0ms if parallel, ~300ms if serial)  
**Success criteria:** Both queries fire simultaneously (delta < 50ms)  
**Expected finding:** Renewal query starts only after contract query returns (visible sequential gap in Network waterfall)

---

### BROWSER-P-07: AI contract analysis — wait time and loading state quality

**Related PERF:** PERF-10  
**URL:** `http://localhost:3000/landlord/contracts/{contract-id}/renew`  
**Precondition:** DevTools → Network tab → Regular 4G. Use a contract with structured clauses. Performance tab armed.  
**Steps:**

1. Navigate to the contract renew page
2. Click "Run AI Analysis" (or equivalent button)
3. Start a stopwatch
4. Observe the loading state — is there a spinner? Any progress indication? Estimated time?
5. Stop the stopwatch when the analysis results appear
6. Note: if you navigate away during analysis and come back, does it recover?

**Measure:** Total wall-clock time from click to first risk card visible; quality of loading state  
**Success criteria:** First partial results visible within 3s (streaming); full analysis < 10s; loading state shows meaningful progress  
**Expected finding:** 8–20s full wait with static spinner (non-streaming); no partial results; timeout risk on poor connectivity

---

### BROWSER-P-08: Tenant document upload — upload time and feedback

**Related PERF:** PERF-08  
**URL:** `http://localhost:3000/tenant/documents`  
**Precondition:** DevTools → Network → **Fast 3G**. Have an image file (ID card photo simulation, ~2MB JPEG) ready.  
**Steps:**

1. Click "+ Upload Document"
2. Select category "National ID / บัตรประชาชน"
3. Choose the 2MB JPEG file
4. Click Submit
5. Note: is there a progress bar? Does the submit button show a loading spinner?
6. Time from click to success toast

**Measure:** Upload time, quality of loading feedback during upload  
**Success criteria:** Upload progress indicator visible; success toast within 30s on Fast 3G  
**Expected finding:** Submit button shows `submitting` disabled state but no upload byte progress; 15–40s for 2MB on Fast 3G

---

## P2 Issues

---

### BROWSER-P-09: Maintenance photo layout shift

**Related PERF:** PERF-13  
**URL:** `http://localhost:3000/tenant/maintenance`  
**Precondition:** DevTools → Performance tab → record. Network tab throttling off (test layout shift, not speed). Find a maintenance request with photos attached.  
**Steps:**

1. Click a maintenance request to open the detail modal
2. Watch the photo grid as images load
3. Does the modal height jump when photos load?
4. Performance tab → check CLS (Cumulative Layout Shift) score

**Measure:** CLS score; visible layout jump height in pixels  
**Success criteria:** CLS < 0.1; no visible jump when images load  
**Expected finding:** Images without explicit dimensions or aspect-ratio wrapper may cause visible layout shift

---

### BROWSER-P-10: Document list — blank screen while fetching (no loading skeleton)

**Related PERF:** PERF-14  
**URL:** `http://localhost:3000/tenant/documents`  
**Precondition:** DevTools → Network → **Slow 3G**. Hard refresh.  
**Steps:**

1. Hard refresh the documents page on Slow 3G
2. Note what the screen shows between navigation start and page content appearing
3. Is there a skeleton/spinner, or a blank white screen?

**Measure:** Duration of blank screen (no content, no skeleton); FCP  
**Success criteria:** Skeleton or loading state appears within 200ms of navigation  
**Expected finding:** Blank white screen for 500ms–2s until RSC response arrives (no loading.tsx)

---

### BROWSER-P-11: Signed URL generation lag on documents list

**Related PERF:** PERF-09  
**URL:** `http://localhost:3000/landlord/documents` or `http://localhost:3000/tenant/documents`  
**Precondition:** DevTools → Network → Regular 4G. Landlord account with 10+ documents.  
**Steps:**

1. Navigate to the documents list
2. In Network tab, find the `GET /api/documents` request
3. Click it → Response tab — note the time from request start to first byte (TTFB)
4. Compare TTFB between an account with 3 documents vs. an account with 15+ documents

**Measure:** TTFB for `/api/documents` with 3 docs vs 15+ docs  
**Success criteria:** TTFB < 800ms regardless of document count  
**Expected finding:** TTFB scales linearly with document count as N parallel Supabase Storage signing calls complete

---

## P3 Issues

---

### BROWSER-P-12: PWA offline fallback — does the offline page render correctly?

**Related PERF:** PERF-12  
**URL:** `http://localhost:3000/landlord/dashboard`  
**Precondition:** App loaded once (SW installed). DevTools → Network → **Offline** (select from throttle dropdown).  
**Steps:**

1. Hard refresh once with network connected to ensure SW is registered
2. Set network to **Offline** in DevTools
3. Navigate to `/landlord/dashboard`
4. Observe: does the app show the branded offline page, a bare browser error, or a cached stale page?

**Measure:** Offline UX — branded page or browser chrome error  
**Success criteria:** Branded offline page ("You are offline") appears; no browser "ERR_INTERNET_DISCONNECTED" chrome  
**Expected finding:** SW correctly serves the inline offline HTML from `sw.js:99`; pass expected

---

### BROWSER-P-13: SimulationPanel — shipped to all prod users?

**Related PERF:** perf-audit.md #10  
**URL:** `http://localhost:3000/landlord/dashboard`  
**Precondition:** Production build (`npm run build && npm start`). DevTools → Network tab → filter JS. `NEXT_PUBLIC_BETA_SIMULATIONS` env var set to empty/false.  
**Steps:**

1. Load the dashboard on a production build with beta sims disabled
2. Network tab → JS filter → look for chunk containing "SimulationPanel"
3. Does SimulationPanel JS appear in the bundle for non-beta users?

**Measure:** Whether SimulationPanel code is in the JS bundle for non-beta users  
**Success criteria:** SimulationPanel chunk absent from bundle when `NEXT_PUBLIC_BETA_SIMULATIONS` is false  
**Expected finding:** SimulationPanel is statically imported in `layout.tsx` — likely ships to all users regardless of env flag
