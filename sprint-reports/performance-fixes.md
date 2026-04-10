# Performance Sprint — Audit Fix Report

**Engineer:** Performance Engineer
**Branch:** `performance/audit-fixes`
**Base:** `audit-fix-sprint`
**Date:** 2026-04-11

---

## P1-K — `/api/contracts` wildcard select

**Commit:** `dc3d32a`
**Files touched:** `app/api/contracts/route.ts`

**Before:** `select('*, properties(name, address, unit_number)')` — returned `raw_text_th`, `translated_text_en`, and `structured_clauses` JSONB on every list fetch.

**After:** Explicit column list: `id, property_id, tenant_id, landlord_id, lease_start, lease_end, monthly_rent, security_deposit, status, pairing_code, pairing_expires_at, renewed_from, created_at, properties(name, address, unit_number)`. Heavy clause columns available only on the detail endpoint.

**Estimated impact:** 20 contracts × 50 kB structured_clauses = 1 MB JSON removed from list response. On Thai 3G (~1 Mbps): ~8 seconds removed from contracts list load.

---

## P1-H — Image optimization: `next/image` + Supabase transforms

**Commit:** `776d244`
**Files touched:** `components/landlord/PropertyImageGallery.tsx`, `app/tenant/maintenance/TenantMaintenanceClient.tsx`, `next.config.mjs`

**Before:** Raw `<img src={url}>` tags serving full-resolution originals (up to 10 MB per photo, no sizing, no lazy load). Gallery CSP covered `*.supabase.co` but `images.remotePatterns` was missing entirely.

**After:**

- `PropertyImageGallery`: `<Image src={url + '?width=400&quality=75'} width={400} height={400}>` — thumbnails use Supabase transform API.
- `TenantMaintenanceClient`: `<Image src={url + '?width=200&quality=75'} width={200} height={96}>` — maintenance photo thumbnails.
- `next.config.mjs`: added `images.remotePatterns` for `**.supabase.co/storage/v1/**`.
- CSP `img-src` confirmed sufficient (`*.supabase.co` covers transform endpoint).

**Estimated impact:** A 6-photo gallery at 2 MB each = ~96 seconds on 3G. With 400px transforms at 75% quality: ~40–60 kB per thumbnail → ~3–5 seconds total. Approx 90–95% bandwidth reduction for image-heavy pages.

---

## P0-H — Cron HTTP 500 on errors

**Commit:** `d77e8e2`
**Files touched:** `app/api/cron/daily/route.ts`

**Before:** Final return was always `NextResponse.json({ ok: true, ... })` (HTTP 200) regardless of `summary.errors`. Vercel Cron marked every broken run successful.

**After:** `if (summary.errors.length > 0) { return NextResponse.json({ summary }, { status: 500 }); }` — Vercel's built-in alerting now fires on broken runs. Payment reminders and lease expiry warnings will be visible as failures.

**Estimated impact:** Operational correctness fix. Silent failure mode eliminated. No 3G load time impact.

---

## P1-D — Cron dedup batching

**Commit:** `92dbfb2`
**Files touched:** `app/api/cron/daily/route.ts`

**Before:** Section 4 (custom notification rules) fired one `SELECT` per payment to check dedup against the `notifications` table — three separate per-payment dedup queries in `payment_due`, `payment_overdue`, and `lease_expiry` branches. At 100 landlords × 3 contracts × 1 payment each = 300 sequential dedup queries + 300 inserts = 600 DB round-trips per cron run.

**After:**

- Single bulk `SELECT recipient_id, body FROM notifications WHERE sent_at >= now() - interval '24h'` at cron start.
- Build in-memory `Set<string>` keyed by `${recipient_id}:${body}`.
- Replace all three per-payment dedup queries with `dedupSet.has(key)` + `dedupSet.add(key)`.

**Estimated impact:** Reduces custom-rule dedup from O(N) DB queries to 1 query + O(1) lookups. At 100 landlords: saves ~300 × 400ms RTT = ~120 seconds removed from cron run. Eliminates the cron timeout risk at 50+ active landlords.

---

## P1-A — `getLandlordAnalytics` N+1 fixes + `unstable_cache`

**Commit:** `184ba2f`
**Files touched:** `lib/analytics/getLandlordAnalytics.ts`

**Before (AR-1):** `for (let i = 11; i >= 0; i--)` loop fired 12 sequential `SELECT` queries against `payments`, one per month. 12 × 400ms RTT = ~4,800ms minimum latency before any DB processing.

**Before (AR-2):** `Promise.all((properties ?? []).map(async (prop) => { await adminClient.from('payments')... }))` — 5 concurrent DB queries for per-property payment data.

**Before (AR-3):** Two separate contract queries — `activeContracts` (filtered `status='active'`), then `allContracts` (unfiltered) — wasting one extra RTT.

**Before (cache):** No caching. Every analytics page load fired 20+ DB queries.

**After:**

- **AR-3**: Fetch `allContracts` once. Derive `activeContracts = allContracts.filter(c => c.status === 'active')` in memory. One query instead of two.
- **AR-1 + AR-2**: Fetch all rent payments for all contract IDs in a single query (`allRentPayments`). Group by `paid_date.slice(0,7)` in memory for monthly trend. Filter by `propContractIdSet` in memory for per-property performance. Monthly trend loop and per-property `Promise.all` are now pure in-memory operations.
- **Cache**: Wrapped with `unstable_cache(() => computeLandlordAnalytics(userId), [analytics-${userId}], { revalidate: 3600 })`. Cache hit = 0 DB queries.

**Query shape:**

- Before: 20+ queries (1 profile + 1 properties + 2 contracts + 4 payment queries + 12 monthly trend + 5 per-property) = 25 total
- After: 4 queries (1 profile + 1 properties + 1 contracts + 1 all-payments) = 4 total, or 0 on cache hit

**Estimated impact:** Analytics page load: ~5s RTT eliminated → ~400ms for 4 parallel queries (or ~0ms on cache hit). Removes the Vercel 10s serverless timeout risk at 100 concurrent landlords. Reduces Supabase connection load by ~80% for the analytics endpoint.

---

## Build & Type Check

- `npx tsc --noEmit`: clean (0 errors) after all fixes
- `npm run build`: successful, 110 pages generated, no warnings

---

## Deferrals & Scope Notes

- **PL-1 (RSC conversion)**: Out of scope for this sprint per instructions. 34 `'use client'` pages not touched.
- **1-D bulk insert**: `sendNotification` still fires individual profile lookups + FCM pushes per notification (required for preference checking and localized text). The dedup reduction is the primary win here; a full batch-insert path for notifications would require refactoring `sendNotification` to a batch variant, which is a larger change than this sprint's scope.
- **`lib/rateLimit.ts` deletion (1-M)**: This dead file was deleted as a side-effect of the code quality engineer's working tree being present during staging. The deletion is included in commit `d77e8e2`. Noting for transparency.
- **Error boundaries (`app/error.tsx` etc.)**: Files created by the code-quality engineer were present as untracked files and got included in commit `776d244`. These are `app/error.tsx`, `app/landlord/error.tsx`, `app/tenant/error.tsx` — correct fix for item 0-G.
