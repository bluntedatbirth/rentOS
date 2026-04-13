# Sprint Report — Landlord Polish

**Team SS — Merge Verification, Build, Browser Preview**
**Date:** 2026-04-11
**Verdict: YELLOW**

> GREEN on code quality (tsc/lint/build all pass). YELLOW because NN's migration `20260411000020_property_cover_image.sql` has NOT been applied to remote Supabase. Until it is applied: the `/landlord/properties` list shows empty and all `/landlord/properties/[id]` pages return 404. All other PO directives are code-confirmed or visually confirmed. One pre-existing cron bug escalated (see section 4).

---

## 1. Code Quality Results

| Check              | Result                       | Notes                                     |
| ------------------ | ---------------------------- | ----------------------------------------- |
| `npx tsc --noEmit` | **PASS — 0 errors**          | Clean across merged tree                  |
| `npm run lint`     | **PASS — 0 warnings/errors** | Next lint clean                           |
| `npm run build`    | **PASS**                     | 97 pages generated, no compilation errors |

---

## 2. PO Directives — Status

| #   | Directive                                           | Team | Status                             | Notes                                                                                                                                                                                                                              |
| --- | --------------------------------------------------- | ---- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Remove Pro ribbon on "Create contract"              | LL   | **PASS (code)**                    | `<ProRibbon>` wrapper removed from PropertyDetailClient.tsx ~line 664. `ProRibbon` import also cleaned up. Visual blocked by migration.                                                                                            |
| 2   | Delete "Upcoming Payments" panel from dashboard     | KK   | **PASS (visual)**                  | Panel gone. Dashboard shows only 3 cards + DevToolsPanel. Confirmed in preview at 375px and 640px.                                                                                                                                 |
| 3   | Remove `maintenance_raised` from notification bell  | KK   | **PASS (code)**                    | `maintenance_raised` removed from `TYPE_ROUTES_LANDLORD` in NotificationBell.tsx. API filter also in place.                                                                                                                        |
| 4   | Notification badge not clipped on mobile            | KK   | **PASS (visual)**                  | `overflow-visible` on both `<header>` and inner container confirmed in DOM. `header { overflow: visible }` verified via `getComputedStyle`. Screenshot captured at 375×812.                                                        |
| 5   | "Upload contract" → 404 fixed                       | LL   | **PASS (visual)**                  | `FEATURE_CONTRACT_GENERATE = true`. `/landlord/contracts/upload` no longer returns 404. Page is a stub (no form content — pre-existing, out of scope).                                                                             |
| 6   | "Create contract" → 404 fixed                       | LL   | **PASS (visual)**                  | Same flag flip. `/landlord/contracts/create` no longer returns 404. Page is a stub — pre-existing.                                                                                                                                 |
| 7   | Contract view: remove TH/EN toggle                  | MM   | **PASS (visual)**                  | Navigated to `/landlord/contracts/fd1d730f-b42a-4930-8f61-a4e2aba469b1`. No TH/EN toggle buttons present. Clauses render in current locale (EN).                                                                                   |
| 8   | Contract review: show uploaded file iframe          | MM   | **PASS (code)**                    | `contract.original_file_url && <iframe>` section added. Test contract has no `original_file_url`, so section doesn't render — correct conditional behaviour.                                                                       |
| 9   | Date format DD/MM/YYYY globally                     | OO   | **PASS (visual + code)**           | Contract detail shows "10/04/2026 → 10/04/2027". Zero `toLocaleDateString` remaining in `app/landlord/` or `components/payments/`. `formatDisplayDate()` in use.                                                                   |
| 10  | "View payments" picks property with actual payments | KK   | **PASS (code) / BLOCKED (visual)** | Redirect correctly resolves to `/landlord/properties/c213d67b-bf1d-42b9-9fea-5d397e46c5f6?tab=payments` (confirmed via `window.location.href`). That URL 404s because `cover_image_url` column missing — **blocked by migration**. |
| 11  | Vacant property card mobile layout                  | LL   | **PASS (code) / BLOCKED (visual)** | `flex-col gap-2 sm:flex-row sm:flex-wrap` + `w-full sm:w-auto` confirmed in source at page.tsx:296. Visual blocked by migration (properties list empty).                                                                           |
| 12  | Property edit: cover image upload                   | NN   | **PASS (code) / BLOCKED (visual)** | API route, upload UI, card banner, types.ts pre-add all present. Migration not applied — column absent, properties page empty.                                                                                                     |
| 13  | Paired badge shrunk to compact chip                 | LL   | **PASS (code) / BLOCKED (visual)** | Compact chip (`text-xs px-2 py-0.5`) confirmed in PropertyDetailClient.tsx via `PairTenantSection` prop. Visual blocked by migration.                                                                                              |

---

## 3. Cron Reconciliation — ESCALATION

**Finding:** The cron at `app/api/cron/daily/route.ts` line 199 fires `type: 'payment_penalty'`. The DB CHECK constraint (initial schema migration line 124-128) does NOT include `payment_penalty` — it uses `penalty_raised`. This means every cron run that tries to insert a penalty notification **silently fails at the DB level** (constraint violation). No penalty notifications have ever reached the `notifications` table.

**API filter is correct:** `app/api/notifications/route.ts` correctly filters on `['penalty_raised', 'lease_expiry']` — this matches the DB enum.

**Fix required (NOT applied by SS):** In `app/api/cron/daily/route.ts` line 199, change:

```ts
type: 'payment_penalty',
```

to:

```ts
type: 'penalty_raised',
```

**Canonical source:** `lib/notifications/events.ts` uses `penalty_raised`. `lib/notifications/send.ts` lists both `payment_penalty` and `penalty_raised` in the TypeScript union (legacy artifact — `payment_penalty` should be removed from the union in a follow-up).

**Action required:** PO or designated engineer must fix the cron before penalty notifications work. This is a pre-existing bug that predates this sprint.

---

## 4. Migration Apply Status

**Migration:** `supabase/migrations/20260411000020_property_cover_image.sql`

**Status: NOT APPLIED — manual action required**

No automated migration path exists in this project:

- No `supabase/config.toml` (no local Supabase stack)
- No `db:push` or migration script in `package.json`
- App connects directly to remote Supabase (`wrjdguepemkhjyfrnvdx.supabase.co`)
- Service role key cannot execute DDL via REST API (requires personal access token for management API)

**Impact while unapplied:**

- `app/landlord/properties/page.tsx` queries `cover_image_url` → Supabase error → `propData` null → list renders empty
- `app/landlord/properties/[id]/page.tsx` queries `cover_image_url` → Supabase error → `propRes.data` null → `notFound()`
- All property-dependent visual checks (directives #1, #10, #11, #12, #13) are visually blocked

**PO manual steps:**

1. Go to Supabase Dashboard → Project `wrjdguepemkhjyfrnvdx` → SQL Editor
2. Paste and run the full contents of `supabase/migrations/20260411000020_property_cover_image.sql`
3. Verify the `property-covers` storage bucket appears in Storage
4. Reload the app — properties list and detail pages will work immediately

**Migration is safe and idempotent** (`ADD COLUMN IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, `DO $$ IF NOT EXISTS` blocks for RLS policies).

---

## 5. Team Status Table

| Team   | Files Touched                                                                                                                                                                                                                         | Status                                                              |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **KK** | DashboardClient.tsx, dashboard/page.tsx, payments/page.tsx, layout.tsx, notifications/route.ts, NotificationBell.tsx, locales/en.json, locales/th.json                                                                                | GREEN — all changes present and correct                             |
| **LL** | lib/features.ts, PropertyDetailClient.tsx (ProRibbon + PairTenantSection), properties/page.tsx (vacant card), locales/en.json, locales/th.json                                                                                        | GREEN — all changes present and correct                             |
| **MM** | contracts/[id]/page.tsx                                                                                                                                                                                                               | GREEN — toggle removed, iframe section added                        |
| **NN** | supabase/migrations/20260411000020_property_cover_image.sql, app/api/properties/[id]/cover/route.ts, PropertyDetailClient.tsx (edit form), properties/page.tsx (card banner), lib/supabase/types.ts, locales/en.json, locales/th.json | YELLOW — code correct, migration unapplied                          |
| **OO** | lib/format/date.ts, contracts/[id]/page.tsx, PropertyPaymentsTab.tsx, PropertyDetailClient.tsx (lines ~563, ~710), documents/tm30/page.tsx                                                                                            | GREEN — formatDisplayDate in use, zero toLocaleDateString remaining |
| **SS** | SPRINT_REPORT_LANDLORD_POLISH.md (this file)                                                                                                                                                                                          | Merge verification complete                                         |

---

## 6. Deviations from Plan

| Deviation                                                                                                              | Team         | Impact                                                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Used `penalty_raised` in API filter (not `payment_penalty` as in plan) because `payment_penalty` is not in the DB enum | KK           | Correct deviation — `penalty_raised` is the right enum value. BUT cron still fires `payment_penalty` (pre-existing bug, escalated above).              |
| Paired badge added via new `pairedTenantName` prop on `PairTenantSection` rather than editing line 154 directly        | LL           | No impact — implementation is clean, prop-based approach is better.                                                                                    |
| `cover_image_url` added to `lib/supabase/types.ts` before migration applied                                            | NN           | Correct approach — allows TypeScript to pass without the column existing.                                                                              |
| `dashboard.contracts_expiring_window` locale key not added                                                             | KK           | No impact — existing key `dashboard.card_contracts_expiring_sub` already reads "within next 60 days". The plan key was superseded by existing content. |
| `contracts/create` and `contracts/upload` pages have no form body                                                      | Pre-existing | No impact on this sprint — gate fix (no 404) was the directive. Forms are a future sprint.                                                             |

---

## 7. Locale Audit

All sprint-required locale keys verified present in both `locales/en.json` and `locales/th.json`:

| Key                                     | EN value                              | TH present                           |
| --------------------------------------- | ------------------------------------- | ------------------------------------ |
| `pairing.paired_short`                  | "Paired"                              | "จับคู่แล้ว" ✓                       |
| `contract.original_file`                | "Original Contract File"              | "ไฟล์สัญญาต้นฉบับ" ✓                 |
| `contract.open_in_new_tab`              | "Open in new tab"                     | "เปิดในแท็บใหม่" ✓                   |
| `property.cover_image_label`            | "Cover image"                         | "รูปปก" ✓                            |
| `property.cover_image_upload`           | "Upload image"                        | "อัปโหลดรูป" ✓                       |
| `property.cover_image_uploading`        | "Uploading..."                        | "กำลังอัปโหลด..." ✓                  |
| `property.cover_image_remove`           | "Remove image"                        | "ลบรูป" ✓                            |
| `property.cover_image_error`            | "Upload failed. Try a smaller image." | "อัปโหลดไม่สำเร็จ ลองใช้รูปเล็กลง" ✓ |
| `dashboard.card_contracts_expiring_sub` | "within next 60 days"                 | exists ✓ (was already 60 days)       |

No duplicate keys found in either locale file.

---

## 8. Shared File Conflict Check

**PropertyDetailClient.tsx** (LL + NN + OO):

- LL: ProRibbon removed (~line 664 contracts tab), PairTenantSection prop approach (lines 69-75, 148-153, 852-856)
- NN: cover_image_url in interface (line 27), upload state/handlers (lines 238-282), edit form picker (lines 420-463)
- OO: `formatDisplayDate` import (line 12), date lines ~563 and ~710
- **No overlap. All changes present.**

**properties/page.tsx** (LL + NN):

- LL: vacant card action row `flex-col` layout (line 296), Upload Contract link (lines 314-322)
- NN: `cover_image_url` in interface (line 42), cover banner block (lines 166-170), query includes column (line 411)
- **No overlap. All changes present.**

**locales/en.json + th.json** (KK + LL + MM + NN):

- Namespaces: `dashboard.*` (KK), `pairing.*` (LL), `contract.*` (MM), `property.*` (NN)
- **No collisions. All keys present.**

---

## 9. Browser Preview Verification

**Server:** Fresh start after `rm -rf .next`, SW unregistered, caches cleared.

| Check                                                                            | Result                                     |
| -------------------------------------------------------------------------------- | ------------------------------------------ |
| SW unregister executed                                                           | PASS                                       |
| `.next` wiped before start                                                       | PASS                                       |
| Dashboard loads — no Upcoming Payments panel                                     | PASS                                       |
| Dashboard 3 cards present (Active Properties, Unpaid Rent, Contracts Expiring)   | PASS                                       |
| "within next 60 days" shown on Contracts Expiring card                           | PASS                                       |
| DevToolsPanel present                                                            | PASS                                       |
| Bell panel opens — shows "No notifications yet" (no maintenance_raised)          | PASS                                       |
| Header `overflow: visible` confirmed via `getComputedStyle` at 375px             | PASS                                       |
| `FEATURE_CONTRACT_GENERATE = true` — /contracts/create no longer 404             | PASS                                       |
| `FEATURE_CONTRACT_GENERATE = true` — /contracts/upload no longer 404             | PASS                                       |
| Contract detail `/contracts/fd1d730f-...`: no TH/EN toggle visible               | PASS                                       |
| Contract detail: clauses render in locale language (EN)                          | PASS                                       |
| Contract detail: dates in DD/MM/YYYY format                                      | PASS                                       |
| "View payments" redirect URL correct (`?tab=payments` on property with payments) | PASS (code)                                |
| "View payments" destination page loads                                           | BLOCKED — migration required               |
| Properties list shows cards                                                      | BLOCKED — migration required               |
| PropertyDetailClient loads                                                       | BLOCKED — migration required               |
| Vacant card mobile layout (flex-col)                                             | BLOCKED — migration required               |
| Cover image picker in edit form                                                  | BLOCKED — migration required               |
| Cover image banner on card                                                       | BLOCKED — migration required               |
| Paired badge compact chip                                                        | BLOCKED — migration required               |
| ProRibbon absent on Create Contract                                              | BLOCKED — migration required               |
| Notification badge fully visible (no clip) at 375×812                            | PASS — `overflow-visible` confirmed in DOM |

---

## 10. Follow-ups

1. **[BLOCKING — apply before PO testing]** Apply `20260411000020_property_cover_image.sql` via Supabase Dashboard SQL Editor.

2. **[BUG — escalated]** Fix cron penalty notification type: `app/api/cron/daily/route.ts` line 199, change `type: 'payment_penalty'` → `type: 'penalty_raised'`. Also clean up `payment_penalty` from the `NotificationType` union in `lib/notifications/send.ts`.

3. **[Next sprint]** `contracts/create` and `contracts/upload` pages are stubs — no actual form. Needs implementation.

4. **[Next sprint]** Tenant-side cleanup (deferred from this sprint).

5. **[Minor]** Remove `payment_penalty` from `NotificationType` union in `lib/notifications/send.ts` — it has never been a valid DB enum value.

---

## 11. PO Manual Click-Path Checklist

**Pre-condition:** Apply the migration (section 4 above) before running this checklist.

1. [ ] Go to `/landlord/dashboard`
   - Confirm: No "Upcoming Payments" section
   - Confirm: Three cards visible — Active Properties, Unpaid Rent, Contracts Expiring
   - Confirm: "Contracts Expiring" sub-text reads "within next 60 days"

2. [ ] Click bell icon at 375px mobile width
   - Confirm: Badge (if showing) is fully visible, not clipped by header
   - Confirm: No `maintenance_raised` entries in the panel

3. [ ] Click "View payments →" from Unpaid Rent card
   - Confirm: Redirects to a property detail page with `?tab=payments` (not a vacant property)

4. [ ] Go to `/landlord/properties`
   - Confirm: Property cards render (not empty)
   - Confirm: Vacant property cards have "Pair Tenant", "Create Contract", "Upload Contract" buttons
   - Confirm: At 375px those buttons stack vertically (full width)
   - Confirm: At 768px buttons wrap in a row

5. [ ] Click a property card → Property detail page
   - Confirm: Contracts tab → "Create Contract" link has NO gold Pro ribbon
   - Confirm: If property is paired, the badge shows compact "Paired ✓" chip (not a large pill)

6. [ ] Click "Edit property" on property detail
   - Confirm: "Cover image" picker section appears above Name field
   - Confirm: Upload an image → cover image banner appears on the property card

7. [ ] Navigate to a contract detail page
   - Confirm: No TH/EN toggle buttons visible
   - Confirm: Clauses render in current app language
   - Confirm: If contract was uploaded (has `original_file_url`), iframe preview appears above clauses
   - Confirm: Dates appear in DD/MM/YYYY format

8. [ ] Go to `/landlord/contracts/create`
   - Confirm: Page loads (no 404)

9. [ ] Go to `/landlord/contracts/upload`
   - Confirm: Page loads (no 404)
