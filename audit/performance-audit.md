# RentOS Performance Audit

**Date:** 2026-04-11  
**Auditor:** Frontend Performance Engineer (static analysis)  
**Target:** Thai landlords on 3G mobile (~400ms RTT, ~1 Mbps down, mid-range Android)  
**Scale target:** 100 landlords × 5 properties = 500 properties, ~500 active contracts, ~6,000 payment rows/year

---

## Executive Summary — Top 5 Bottlenecks by 3G Impact

| Rank | Bottleneck                                                                                                                                                                | Impact   |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1    | **Analytics: 12 sequential DB queries in a loop** — `getLandlordAnalytics` fires one Supabase round-trip per month for 12 months, serially                                | Critical |
| 2    | **34 of 48 page.tsx files are `"use client"`** — most pages that could stream HTML instead hydrate full JS bundles before showing anything                                | Critical |
| 3    | **No image optimization** — property photos and maintenance thumbnails served as raw full-resolution originals via `<img>` with no sizing, lazy loading, or CDN transform | High     |
| 4    | **Missing composite indexes on `payments`** — `due_date` and `status` filters run table scans; at 6k rows/year this becomes measurable at 100 landlords                   | High     |
| 5    | **Cron daily: per-payment N+1 notification dedup query** — every payment in the overdue/due loop fires an extra `notifications` SELECT for dedup, serially                | High     |

---

## Findings

---

### PAGE LOAD

#### PL-1 — 34/48 pages are `"use client"` — unnecessary hydration cost

**Impact:** Critical  
**Location:** 34 pages across `app/landlord/` and `app/tenant/` (see list below)  
**Current behavior:** Every page with `'use client'` ships its full component tree as JavaScript, blocks LCP until the JS bundle is parsed and hydrated, and sends a blank shell to the browser during the JS download window. On 3G with a 400ms RTT, this means the user stares at a white/skeleton screen for 1–3 seconds before anything meaningful appears.  
**Measured/estimated cost:** On Thai 3G (~1 Mbps), a 200–400 kB JS bundle costs 1.6–3.2 seconds of download alone, before parse time.  
**Affected pages (all `"use client"`):**

- `app/landlord/properties/page.tsx` — entire list page including property fetch logic
- `app/landlord/payments/page.tsx` — all payment data fetched client-side
- `app/landlord/notifications/page.tsx` — simple list, trivially server-renderable
- `app/landlord/notifications/rules/page.tsx`
- `app/landlord/notifications/inbox/page.tsx`
- `app/landlord/contracts/templates/page.tsx`
- `app/landlord/penalties/rules/page.tsx`
- `app/landlord/billing/page.tsx`
- `app/landlord/billing/upgrade/page.tsx`
- `app/landlord/profile/page.tsx`
- `app/landlord/settings/page.tsx`
- `app/landlord/security/page.tsx`
- `app/landlord/onboarding/page.tsx`
- `app/landlord/contracts/[id]/page.tsx` — single contract detail
- `app/landlord/contracts/[id]/renew/page.tsx`
- `app/landlord/contracts/[id]/pair/page.tsx`
- `app/landlord/contracts/create/page.tsx`
- `app/landlord/contracts/upload/page.tsx`
- `app/landlord/documents/tm30/page.tsx`
- `app/tenant/dashboard/page.tsx` — NOTE: already server component, correct
- `app/tenant/payments/page.tsx`
- `app/tenant/notifications/page.tsx`
- `app/tenant/notifications/settings/page.tsx`
- `app/tenant/settings/page.tsx`
- `app/tenant/onboarding/page.tsx`
- `app/tenant/co-tenants/page.tsx`
- `app/tenant/penalties/appeal/page.tsx`
- `app/tenant/security/page.tsx`
- `app/tenant/pair/page.tsx`
- `app/tenant/contract/view/page.tsx`
- `app/landlord/contracts/[id]/pair/page.tsx`
- `app/(public)/login/page.tsx`
- `app/(public)/signup/page.tsx`
- `app/auth/reset-password/page.tsx`
- `app/page.tsx` (root)
- `app/admin/spend/page.tsx`
- `app/admin/translations/page.tsx`

**What interactivity actually needs client rendering:** Only pages with real-time user interaction (forms, file upload, confirm dialogs, WebSocket/realtime). Examples of wrongly-client pages: `notifications/page.tsx` — a read-only list that could be an RSC with a client `MarkRead` button; `billing/page.tsx` — the initial plan display is static.

**Recommended fix:** Audit each page and extract interactive islands. Pattern: RSC page fetches data server-side → passes serialized props → small `'use client'` child handles clicks. The two dashboard pages (`landlord/dashboard/page.tsx`, `tenant/dashboard/page.tsx`) already use this pattern correctly and should be the template for the rest.

---

#### PL-2 — Properties page: client-side data fetch causes blank-screen flash on every navigation

**Impact:** High  
**Location:** `app/landlord/properties/page.tsx:386-453`  
**Current behavior:** The entire `PropertiesPage` is `'use client'`. On mount it fires a two-step sequential fetch: (1) load properties, (2) load contracts for those properties, (3) load tenant profiles. Until all three resolve, `loading === true` shows a skeleton. On 3G, three round-trips (even sequential with `async/await`) adds ~1.2s.  
**Estimated cost:** 3 sequential Supabase calls × ~400ms RTT = ~1,200ms of blank-screen time before content.  
**Recommended fix:** Convert to RSC. The page has no real-time mutations that require the component-level client loop — mutations (create, delete) are form submits that can use Server Actions or a small client modal component. Server-fetch all three queries in parallel at the page level and pass data as props.

---

#### PL-3 — Payments pages (landlord + tenant): full history loaded unconditionally

**Impact:** High  
**Location:** `app/landlord/payments/page.tsx:119-133`, `app/tenant/payments/page.tsx:124-131`  
**Current behavior:** Both pages fetch ALL payments for a contract/landlord (`order('due_date', { ascending: false })`) with no limit. At 100 landlords × 5 properties × 12 payments/year = 6,000 payment rows in year 1, a landlord with multiple properties gets the full history in a single response.  
**Estimated cost:** 6,000 rows × ~100 bytes/row = ~600 kB JSON payload on 3G → ~5 seconds download. In practice each landlord sees their own subset (~60–120 rows), but the "completed" accordion section loads all historical rows eagerly even when hidden.  
**Recommended fix:** Add `.limit(50)` to the initial fetch. Load completed/historical payments lazily only when the completed accordion is expanded, via a separate paginated query. Index `payments(contract_id, due_date)` (see DB section).

---

#### PL-4 — Notifications route: no pagination or limit

**Impact:** Medium  
**Location:** `app/api/notifications/route.ts:11-23`  
**Current behavior:** `GET /api/notifications` returns all notifications for the user with no limit. A user who receives daily cron notifications accumulates an unbounded list.  
**Estimated cost:** At 100 landlords active for 6 months, each receiving ~2 notifications/day, the table has ~36,000 rows. A single user's fetch returns up to ~360 rows with no limit.  
**Recommended fix:** Add `.limit(50)` and a `before` cursor for pagination. The UI already has no pagination controls — add "Load more" as part of this fix.

---

### API RESPONSE

#### AR-1 — `getLandlordAnalytics`: 12 sequential DB queries for monthly trend (critical N+1)

**Impact:** Critical  
**Location:** `lib/analytics/getLandlordAnalytics.ts:185-218`  
**Current behavior:** The monthly trend function loops `for (let i = 11; i >= 0; i--)` and inside the loop fires a `supabase.from('payments').select(...)` call per month. This is 12 sequential round-trips.  
**Estimated cost:** 12 × ~400ms RTT = ~4,800ms minimum on 3G before any DB query time. This adds ~5 seconds to every Analytics page load.  
**Recommended fix:** Replace the loop with a single aggregation query using a date-range filter `paid_date >= 12-months-ago` and group by month in application code (or use a Postgres `date_trunc` group-by). One query instead of twelve.

---

#### AR-2 — `getLandlordAnalytics`: per-property N+1 query in `Promise.all`

**Impact:** High  
**Location:** `lib/analytics/getLandlordAnalytics.ts:222-273`  
**Current behavior:** `Promise.all((properties ?? []).map(async (prop) => { ... await adminClient.from('payments').select(...).in('contract_id', propContractIds) ... }))` — fires one DB query per property simultaneously. At 5 properties this is 5 concurrent queries which is tolerable; at 100 landlords × 5 properties = 500 concurrent analytics requests it creates a Supabase connection pool thundering herd.  
**Estimated cost:** 5 concurrent queries per Analytics call, each returning all-time payment data for a property. At 100 concurrent users this is 500 simultaneous DB connections.  
**Recommended fix:** Fetch all payment data for all contract IDs in a single query before the property loop, then filter in memory per property.

---

#### AR-3 — `getLandlordAnalytics`: fetches `allContracts` separately from `activeContracts` (redundant query)

**Impact:** Medium  
**Location:** `lib/analytics/getLandlordAnalytics.ts:82-111`  
**Current behavior:** First queries `activeContracts` (line 83), then separately queries `allContracts` (line 106) — a second full contracts query with `status` included. This is 2 DB calls where 1 would do.  
**Estimated cost:** One extra Supabase RTT (~400ms on 3G) on every analytics load.  
**Recommended fix:** Fetch `allContracts` once with all needed fields. Derive `activeContracts` by filtering `allContracts.filter(c => c.status === 'active')` in memory.

---

#### AR-4 — Cron daily: per-payment sequential N+1 for dedup check

**Impact:** High  
**Location:** `app/api/cron/daily/route.ts:229-236, 277-284`  
**Current behavior:** For every payment in the custom-rule loop, the cron fires a separate `SELECT` against `notifications` to check for duplicate sends in the last 24h: `await supabase.from('notifications').select('id').eq('recipient_id', ...).eq('body', ...).gte('sent_at', ...)`.  
**Estimated cost:** At 100 landlords × 3 active contracts × 1 overdue payment each, this is 300 sequential dedup queries plus 300 notification inserts = 600 DB round-trips per cron run.  
**Recommended fix:** Bulk-fetch recent notifications once at the start of the cron run (`SELECT id, recipient_id, body FROM notifications WHERE sent_at >= now() - interval '24h'`), build an in-memory Set, and check against it. Zero extra queries in the loop.

---

#### AR-5 — `GET /api/contracts` fetches `select('*, properties(name, address, unit_number)')` — wildcard on contracts

**Impact:** Medium  
**Location:** `app/api/contracts/route.ts:25-27`  
**Current behavior:** `select('*', ...)` returns every column on contracts, including `raw_text_th`, `translated_text_en`, and `structured_clauses` (JSONB). `structured_clauses` alone can be 10–50 kB per contract. If a landlord has 20 contracts, a list endpoint returns 200–1000 kB of structured clause data the list view never displays.  
**Estimated cost:** 20 contracts × 50 kB = 1 MB JSON over 3G → ~8 seconds.  
**Recommended fix:** Change to `select('id, property_id, tenant_id, landlord_id, lease_start, lease_end, monthly_rent, security_deposit, status, created_at, properties(name, address, unit_number)')`. Reserve the heavy clause columns for the individual contract detail endpoint.

---

### DATABASE

#### DB-1 — Missing composite index on `payments(contract_id, due_date)`

**Impact:** Critical  
**Location:** `supabase/migrations/20260410000003_add_performance_indexes.sql`  
**Current behavior:** `idx_payments_contract_id` exists (simple single-column). All dashboard queries filter `payments` by `contract_id` AND date ranges (`due_date`, `paid_date`). Postgres will use the `contract_id` index to filter by contract, then re-scan for date ranges without a composite index.  
**Estimated cost at scale:** At 6,000 payments rows with the index, `contract_id` lookup is fast. But date-range filters on `due_date` still require a secondary scan. At 100 landlords with 5 contracts each, dashboard loads fire 5+ queries against payments — with missing composite indexes, each adds a secondary scan.  
**Recommended fix:** Add `CREATE INDEX idx_payments_contract_due ON payments(contract_id, due_date);` and `CREATE INDEX idx_payments_contract_status ON payments(contract_id, status);`.

---

#### DB-2 — Missing index on `payments(status, due_date)` — cron overdue query does table scan

**Impact:** High  
**Location:** `app/api/cron/daily/route.ts:84-88`, initial schema `20260406000001_initial_schema.sql`  
**Current behavior:** `SELECT ... FROM payments WHERE status = 'pending' AND due_date < today`. No index covers `(status, due_date)`. At 6,000 payment rows (100 landlords, year 1), this is a full table scan for every cron run.  
**Estimated cost:** Table scan at 6,000 rows: ~5–20ms (acceptable now). At 100k rows (2–3 years of data): ~200ms+ on a cold Supabase instance.  
**Recommended fix:** `CREATE INDEX idx_payments_status_due ON payments(status, due_date) WHERE status IN ('pending', 'overdue');` — partial index saves space and keeps the scan fast on the hot path.

---

#### DB-3 — Missing index on `contracts(tenant_id)`

**Impact:** High  
**Location:** `supabase/migrations/20260410000003_add_performance_indexes.sql` — only `idx_contracts_landlord_id` added  
**Current behavior:** Tenant dashboard, tenant payments page, and RLS policy `contracts_tenant_select` all filter `contracts WHERE tenant_id = auth.uid()`. No index on `tenant_id` means a full contracts table scan for every tenant page load.  
**Estimated cost:** At 500 contracts (100 landlords × 5 each), a full scan is ~5ms. At 5,000 contracts (matured product), it's ~50ms per request. RLS policy also uses this path for every row-level check.  
**Recommended fix:** `CREATE INDEX idx_contracts_tenant_id ON contracts(tenant_id);`

---

#### DB-4 — Missing index on `notifications(recipient_id, read_at)` — unread count query

**Impact:** Medium  
**Location:** `app/api/notifications/count/route.ts`, `supabase/migrations/20260410000003_add_performance_indexes.sql`  
**Current behavior:** `idx_notifications_recipient_id` exists but there is no composite index covering `(recipient_id, read_at)`. The unread count query filters `WHERE recipient_id = auth.uid() AND read_at IS NULL`. The existing single-column index narrows by recipient, then scans all their notifications to check `read_at`.  
**Estimated cost:** A user with 200 notifications uses the single-column index to find their 200 rows, then scans all 200 to find unread ones. Polled on every page (notification badge). At 100 users: 100 × 200 row scans = 20,000 row evaluations per poll cycle.  
**Recommended fix:** `CREATE INDEX idx_notifications_recipient_unread ON notifications(recipient_id) WHERE read_at IS NULL;` — partial index on unread rows only.

---

#### DB-5 — RLS policies on `penalties`, `payments`, `maintenance_requests` use correlated subqueries without supporting index

**Impact:** Medium  
**Location:** `supabase/migrations/20260406000001_initial_schema.sql:228-243, 267-285, 292-322`  
**Current behavior:** RLS policies for penalties, payments, and maintenance_requests all use `EXISTS (SELECT 1 FROM contracts WHERE contracts.id = X.contract_id AND contracts.landlord_id = auth.uid())`. This correlated subquery runs on every row being evaluated. The `idx_contracts_landlord_id` index helps the subquery, but `contracts.id` also needs to be efficiently reachable — `contracts.id` is the PK so that part is fast. However, the join direction means Postgres may evaluate this subquery for each row in the outer table rather than using a hash join.  
**Estimated cost:** At 500 contracts and 6,000 payments, every payment list query evaluates the RLS EXISTS subquery for each row. Tolerable now; at scale, consider materializing landlord ownership into a denormalized column.  
**Recommended fix:** No immediate action required at 100 landlords. Flag for review at 1,000 landlords. Consider adding `landlord_id` directly to `payments` as a denormalized column to eliminate the RLS join entirely.

---

### BUNDLE SIZE

#### BS-1 — `react-markdown` and `rehype-slug` potentially in client bundles

**Impact:** Medium  
**Location:** `package.json:28-29`  
**Current behavior:** `react-markdown` is listed as a production dependency. If imported in any `'use client'` component, it ships to the client bundle. `react-markdown` v10 + `rehype-slug` together add ~70–90 kB to the bundle.  
**Current status:** No direct import of `react-markdown` was found in client-rendered pages during this audit, but the package is present and available for any component to pull in.  
**Estimated cost:** If rendered client-side: ~70 kB extra → ~0.6s on 3G.  
**Recommended fix:** Ensure `react-markdown` is only used in RSC components (no `'use client'` context). If needed in client components, use `dynamic(() => import('react-markdown'), { ssr: false })`.

---

#### BS-2 — `pdf-lib` is a production dependency with no dynamic import protection in several paths

**Impact:** Medium  
**Location:** `package.json:26`, `app/landlord/contracts/create/page.tsx:380`, `app/landlord/documents/tm30/page.tsx:80-81`  
**Current behavior:** `pdf-lib` (~750 kB uncompressed, ~280 kB gzipped) is used for PDF generation. The contract create page and TM30 page correctly use `await import('@/lib/pdf/generateContractPdf')` — dynamic imports that defer loading until the user clicks "Download PDF". The `PdfPreview` component (`components/landlord/PdfPreview.tsx:27,65`) also correctly lazy-imports.  
**Status:** PDF loading is properly deferred on the client-side PDF generation paths.  
**Residual risk:** `pdf-lib` could still be pulled into the initial bundle if any server-rendered import path touches it at module level. Verify with `next build --analyze` at launch.

---

#### BS-3 — No bundle analyzer configured in `next.config.mjs`

**Impact:** Medium  
**Location:** `rental-manager/next.config.mjs`  
**Current behavior:** `next.config.mjs` has `optimizePackageImports` for `@supabase/supabase-js`, `@supabase/ssr`, and `zod`. No `@next/bundle-analyzer` is configured. No `experimental.turbo` tree-shaking config.  
**Estimated cost:** Unknown — without an analyzer, over-bundling can go undetected until load time degrades.  
**Recommended fix:** Add `@next/bundle-analyzer` and run `ANALYZE=true npm run build` as a pre-launch step to verify actual bundle composition.

---

#### BS-4 — `qrcode.react` correctly dynamic-imported; `react-markdown` not verified in all paths

**Impact:** Low  
**Location:** `app/landlord/contracts/[id]/pair/page.tsx:7`  
**Current behavior:** `qrcode.react` is properly dynamic-imported with `{ ssr: false }`. This is correct — QR code rendering is not needed on initial paint.  
**Status:** Good pattern. No action needed.

---

### IMAGES

#### IM-1 — Property photos served as raw full-resolution originals, no `next/image`, no lazy loading

**Impact:** High  
**Location:** `components/landlord/PropertyImageGallery.tsx:142`  
**Current behavior:**

```html
<img src="{img.public_url}" alt="" className="h-full w-full rounded-lg object-cover" />
```

The `public_url` is a direct Supabase Storage URL. The file was accepted up to 10 MB (`/api/properties/[id]/images/route.ts:6`). These images load at full resolution in a CSS `aspect-square` grid cell — typically 100–200px wide on mobile. A 3 MB photo displayed at 150×150px wastes ~2.99 MB of download.  
**Estimated cost:** A property with 6 photos (3 move-in, 3 move-out) at 2 MB each = 12 MB. On 3G at 1 Mbps: ~96 seconds. Even at compressed 500 kB each: 3 MB → 24 seconds.  
**Recommended fix:**

1. Switch to `<Image>` from `next/image` with `width`, `height`, and `loading="lazy"` props.
2. Use Supabase image transformations: append `?width=400&quality=75` to the storage URL for gallery thumbnails.
3. Reduce server-side acceptance limit to 5 MB and document that 2 MB is the target after client-side resize.
4. Add client-side image compression before upload (use `canvas.toBlob` at 80% quality, max 1500px).

---

#### IM-2 — Maintenance photo thumbnails served at full resolution

**Impact:** High  
**Location:** `app/tenant/maintenance/TenantMaintenanceClient.tsx:226`  
**Current behavior:**

```html
<img key="{i}" src="{url}" alt="" className="h-24 w-full rounded-lg object-cover" />
```

Maintenance photos stored in `photo_urls JSONB` (defined in initial schema) are rendered at `h-24` (~96px) but likely served at original upload resolution. No `next/image`, no sizing, no lazy load.  
**Estimated cost:** Same as IM-1 — full-resolution images displayed in 96px tall thumbnails.  
**Recommended fix:** Same as IM-1 — use `next/image` with appropriate width/height and Supabase image transforms.

---

#### IM-3 — Contract upload page shows raw image preview without size cap

**Impact:** Low  
**Location:** `app/landlord/contracts/upload/page.tsx:331`  
**Current behavior:** The upload page shows a preview of the selected file using a raw `<img>` with eslint-disable comment. This is an ephemeral local preview before upload, so it doesn't cost a network request. However, large files (up to 20 MB) are previewed at full canvas resolution.  
**Estimated cost:** Local performance only; no network cost. A 20 MB image preview can OOM low-end Android browsers.  
**Recommended fix:** Resize the preview using `createObjectURL` with a canvas downscale to max 1200px before setting the preview URL.

---

#### IM-4 — `img-src` CSP allows `https://*.supabase.co` but not Supabase transform endpoint

**Impact:** Low  
**Location:** `rental-manager/next.config.mjs:44`  
**Current behavior:** The CSP allows `img-src 'self' data: blob: https://*.supabase.co`. If Supabase image transforms use a different subdomain (e.g., `*.supabase.in` or CDN edge URLs), transformed images will be blocked by the browser.  
**Recommended fix:** Verify Supabase image transform endpoint domain and add it to the CSP `img-src` directive before enabling transforms.

---

### SCALE RISK

#### SR-1 — Analytics page will time out at 100 landlords if each triggers an analytics load simultaneously

**Impact:** Critical  
**Location:** `lib/analytics/getLandlordAnalytics.ts`  
**Current behavior:** A single analytics page load fires a minimum of 12 + 5 + 3 = ~20 DB queries serially/concurrently. At 100 concurrent landlords each loading Analytics, this is up to 2,000 Supabase queries simultaneously.  
**Estimated cost at scale:** Supabase free/pro tier: connection pool exhaustion. Vercel serverless timeout (60s on pro, 10s on hobby) will be hit by the 12-query serial monthly trend loop (~5s just in RTT).  
**Recommended fix:** (1) Fix the 12-query loop to a single aggregation (AR-1). (2) Add server-side caching: `unstable_cache` with a 1-hour TTL on analytics data per user — analytics don't need real-time freshness. (3) Consider a materialized view for monthly revenue aggregation.

---

#### SR-2 — `GET /api/contracts` wildcard select will send megabytes of clause JSON at 20 contracts/landlord

**Impact:** High  
**Location:** `app/api/contracts/route.ts:25`  
**Current behavior:** `select('*, properties(...)')` returns `structured_clauses` (JSONB) and `raw_text_th` (full contract text) for every contract in the list. At 100 landlords × 20 contracts = 2,000 contracts, each with 10–50 kB of clause JSON, the total data served by this endpoint approaches 20–100 MB per landlord portfolio.  
**Estimated cost at scale:** A landlord with 20 contracts requesting this endpoint receives 200 kB–1 MB of JSON. On 3G: 1.6–8 seconds for a list view.  
**Recommended fix:** Already noted in AR-5. This is the most immediately actionable DB fix.

---

#### SR-3 — Cron job is synchronous (sequential notifications) — will exceed Vercel timeout at scale

**Impact:** High  
**Location:** `app/api/cron/daily/route.ts`  
**Current behavior:** The cron handler processes payment reminders, overdue updates, lease expiry, custom rules, and penalty rules all sequentially with `await` inside `for` loops. At 100 landlords × 5 contracts × 2 pending payments each, the cron must make ~1,000 `sendNotification` calls sequentially.  
**Estimated cost at scale:** If each notification call takes 100ms (FCM + DB write), 1,000 calls = 100 seconds. Vercel cron function timeout is 60s on Pro, 10s on Hobby.  
**Recommended fix:** Batch notification sends: collect all (recipientId, type, body) tuples for each loop, then insert in bulk with a single `supabase.from('notifications').insert([...array])`. Replace per-notification `sendNotification` with a batched version.

---

#### SR-4 — `property_images` endpoint returns full image metadata without pagination

**Impact:** Medium  
**Location:** `app/api/properties/[id]/images/route.ts:24-41`  
**Current behavior:** `select('*').eq('property_id', propertyId).order('created_at')` — returns all images for a property with no limit. A landlord who uploads many move-in/move-out photos gets the full list including `public_url` strings for all of them.  
**Estimated cost at scale:** At 20 photos per property with 500 properties, storage is fine; the payload per request is manageable. Not critical at launch scale.  
**Recommended fix:** Add `.limit(50)` as a precaution. Low priority.

---

#### SR-5 — No HTTP cache headers on API routes

**Impact:** Medium  
**Location:** All API routes  
**Current behavior:** API routes return JSON with no `Cache-Control` headers. Next.js App Router defaults to `no-store` for dynamic routes. This means every page load re-fetches everything — there is no edge caching benefit even for data that changes infrequently (e.g., property list, billing status).  
**Estimated cost:** Every navigation to `/landlord/properties` fires 3 fresh DB queries with 0% cache hit rate. On 3G with 400ms RTT, even 2 queries = 800ms of waiting before the page renders.  
**Recommended fix:** Add `revalidate` tags to server components and use `unstable_cache` for read-heavy data. Add `Cache-Control: private, max-age=30` headers to API endpoints like `/api/notifications/count` that are polled frequently but don't need real-time accuracy.

---

## Can This App Survive 100 Landlords on 3G?

**Verdict: Barely, and with critical failure modes under load.**

The two dashboard pages (`landlord/dashboard/page.tsx`, `tenant/dashboard/page.tsx`) are well-architected as server components and will load in ~1.5–2s on 3G — this is the app's strongest asset. However, the analytics page will time out under load due to 12 serial DB round-trips (~5s in latency alone before DB processing), and will cascade into Vercel timeout errors under concurrent use. The properties and payments pages are entirely client-rendered, adding 1–2s of blank-screen time compared to what RSC would provide. Property photos are the single biggest bandwidth risk: a gallery of 6 unoptimized 2 MB photos takes ~24 seconds to load on 3G, which is simply unusable.

The database index gap on `contracts(tenant_id)`, `payments(status, due_date)`, and a composite `payments(contract_id, due_date)` means that as the payments table grows to 6,000–10,000 rows, every cron run and dashboard load degrades. The cron notification loop will exceed Vercel's serverless timeout at ~50 active landlords.

**Three actions before launch that will have the most impact:**

1. Fix `getLandlordAnalytics` 12-query loop → single aggregation query + `unstable_cache` (fixes SR-1, AR-1, AR-2, AR-3)
2. Add Supabase image transforms + `next/image` to property gallery (fixes IM-1, IM-2)
3. Add missing DB indexes: `contracts(tenant_id)`, `payments(status, due_date)`, `payments(contract_id, due_date)` (fixes DB-1, DB-2, DB-3)

These three changes alone move the app from "risky on 3G" to "viable on 3G."
