# Sprint Report — Tenant Beta Hardening

**Branch**: `tenant-beta-hardening`
**HEAD SHA**: `9a55e62`
**Date**: 2026-04-11
**Verdict**: GREEN

---

## Build / Test / Lint Gate

| Check                                        | Result                                             |
| -------------------------------------------- | -------------------------------------------------- |
| `npx tsc --noEmit`                           | PASS — zero errors                                 |
| `npm run lint` (ESLint + Next.js rules)      | PASS — zero warnings or errors                     |
| `npm run build` (Next.js production build)   | PASS — 109 pages compiled, 0 errors                |
| `npm test` (Vitest — 2 test files, 16 tests) | PASS — 16/16 after test fixture update (see below) |

### Test note — T-BUG-07 test fixture

The pre-existing unit test `"seeds 12 payment rows when all invariants pass"` used `lease_end: '2026-01-01'` (a past date). PP's T-BUG-07 fix correctly bounds seeding to `min(12, months_until_lease_end)`. With a past lease_end the loop breaks immediately, producing 0 rows — so the test correctly failed against the new code. Team SS updated the fixture to compute a 2-year-future date dynamically:

```ts
const farFuture = new Date();
farFuture.setFullYear(farFuture.getFullYear() + 2);
```

All 16 tests now pass. This is a test-maintenance fix, not a feature change.

---

## Merge Order and Conflict Summary

| Step | Branch                     | Commit    | Result                                                                                                                                                                                                         |
| ---- | -------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `team-pp-tenant-hardening` | `ef59dce` | Clean merge                                                                                                                                                                                                    |
| 2    | `team-tt-tenant-hardening` | `a2ca652` | Clean merge; TT brought QQ/RR collateral Prettier fixes; `TenantDocumentsClient.tsx` had `activeContractId` as required prop but `page.tsx` didn't pass it — fixed by making prop optional to unblock UU merge |
| 3    | `team-rr-tenant-hardening` | `3aa03c8` | Conflict in `TenantMaintenanceClient.tsx` — minor Prettier formatting differences (class sort order). Resolved by taking RR's authoritative semantic content with TT's Prettier-normalized class ordering.     |
| 4    | `team-uu-tenant-hardening` | `54ecbb1` | Conflict in `TenantDocumentsClient.tsx` — signature: TT discarded `activeContractId` prop, UU's authoritative version uses it. Resolved in UU's favour.                                                        |
| 5    | `team-qq-tenant-hardening` | `a58ed97` | Already ancestor of HEAD — QQ's changes had been incorporated into TT's Prettier collateral commit. `git merge` returned "Already up to date." All QQ changes verified present.                                |

### Cross-team Prettier collateral note

QQ (`a58ed97`) ran a project-wide Prettier pre-commit hook before committing. Its commit included partial Prettier-formatted versions of RR/UU files (`TenantMaintenanceClient.tsx`, `TenantDocumentsClient.tsx`). TT (`a2ca652`) did the same. This caused:

- RR merge: formatting-only conflict in `TenantMaintenanceClient.tsx` — trivially resolved.
- UU merge: prop signature conflict in `TenantDocumentsClient.tsx` — resolved by taking UU's authoritative full implementation.
- QQ merge: no-op (already subsumed via TT's collateral).

The merge order PP → TT → RR → UU → QQ (task spec) correctly protected UU's authoritative work from being overwritten by QQ's stale partial.

---

## Bug Status Table

| ID       | Description                                                                           | Status            | Team | Commit    |
| -------- | ------------------------------------------------------------------------------------- | ----------------- | ---- | --------- |
| T-BUG-01 | Contract view shows wrong contract when active + pending renewal both exist           | FIXED             | PP   | `ef59dce` |
| T-BUG-02 | No lease-expiry banner on tenant dashboard                                            | FIXED             | QQ   | `a58ed97` |
| T-BUG-03 | Maintenance rows not clickable (no detail view)                                       | FIXED             | RR   | `3aa03c8` |
| T-BUG-04 | Pair page gives no feedback for partial code entry                                    | FIXED             | RR   | `3aa03c8` |
| T-BUG-05 | Contract view: stale data flash + stuck skeleton on rapid navigation                  | FIXED             | PP   | `ef59dce` |
| T-BUG-06 | Browser tab title shows marketing string, not "RentOS — Tenant Portal"                | FIXED             | TT   | `a2ca652` |
| T-BUG-07 | Short lease contracts seeded 12 rent rows past lease_end                              | FIXED             | PP   | `ef59dce` |
| T-BUG-08 | Maintenance status-change notifications duplicated (2 per status change instead of 1) | FIXED (defensive) | QQ   | `a58ed97` |
| T-BUG-09 | ProfileForm Save button and focus rings are blue, not saffron                         | FIXED             | TT   | `a2ca652` |
| T-BUG-10 | `/tenant/profile` duplicates settings form instead of redirecting                     | FIXED             | TT   | `a2ca652` |
| T-BUG-11 | Cron `lease_expiry` notification links to `/tenant/contracts` (404)                   | FIXED             | QQ   | `a58ed97` |

**All 11 bugs closed.**

### T-BUG-11 follow-up note

The plan specified fixing line 151 of `app/api/cron/daily/route.ts` (`lease_expiry` main notification path) — this was done. A secondary `/tenant/contracts` reference exists at line 334 in the custom notification rules path. This was out of the original T-BUG-11 scope and is logged as a follow-up ticket. The primary cron path now correctly routes to `/tenant/contract/view`.

---

## Feature Status Table

| ID    | Description                                                                                       | Status   | Team | Commit    |
| ----- | ------------------------------------------------------------------------------------------------- | -------- | ---- | --------- |
| TS-01 | Lease expiry banner on tenant dashboard (30-day window, saffron, suppressed when renewal pending) | SHIPPED  | QQ   | `a58ed97` |
| TS-02 | Maintenance detail modal (read-only — shows costs, assigned, completed date, photos)              | SHIPPED  | RR   | `3aa03c8` |
| TS-03 | Payment receipt PDF download (bilingual TH+EN, Thai characters via Sarabun, saffron header)       | SHIPPED  | TT   | `a2ca652` |
| TS-04 | Tenant-initiated renewal request                                                                  | DEFERRED | —    | —         |
| TS-05 | Tenant document upload (migration + RLS INSERT policy + upload UI)                                | SHIPPED  | UU   | `54ecbb1` |

### TS-04 deferred rationale

Requires: new notification type, new schema column (`renewal_requested_at` or similar), new landlord review UI surface. Complexity is too high for this sprint. Queued for next sprint.

---

## Locale Coverage

All 23 new i18n keys verified present in `locales/en.json`, `locales/th.json`, and `locales/zh.json`:

**QQ / TS-01 keys (4):**

- `dashboard.lease_expiry_banner_today` ✓
- `dashboard.lease_expiry_banner_one` ✓
- `dashboard.lease_expiry_banner_other` ✓
- `dashboard.lease_expiry_action` ✓

**RR / TS-02 keys (7):**

- `tenant.maintenance_detail_title` ✓
- `tenant.maintenance_assigned_to` ✓
- `tenant.maintenance_estimated_cost` ✓
- `tenant.maintenance_actual_cost` ✓
- `tenant.maintenance_completed_at` ✓
- `tenant.maintenance_close` ✓
- `pairing.code_length_hint` ✓

**TT / TS-03 keys (1):**

- `payments.download_receipt` ✓

**UU / TS-05 keys (11):**

- `tenant.documents_upload_button` ✓
- `tenant.documents_upload_category` ✓
- `tenant.documents_upload_category_tenant_id` ✓
- `tenant.documents_upload_category_receipt` ✓
- `tenant.documents_upload_category_other` ✓
- `tenant.documents_upload_file` ✓
- `tenant.documents_upload_notes` ✓
- `tenant.documents_upload_submit` ✓
- `tenant.documents_upload_success` ✓
- `tenant.documents_upload_too_large` ✓
- `tenant.documents_upload_no_contract` ✓

No locale gaps found.

---

## Key Spot-Check Results (Static Verification)

| Check                                                                                                                                                  | Result |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| `app/tenant/contract/view/page.tsx`: 3-step priority query (active → awaiting_signature → pending), `setLoading(true)` at load start, `cancelled` flag | PASS   |
| `lib/contracts/activate.ts`: `// T-BUG-07` markers, `leaseEndDate` guard, `break;` inside seeding loop                                                 | PASS   |
| `app/tenant/dashboard/DashboardClient.tsx`: lease-expiry banner JSX guarded by `daysUntilExpiry !== null && >= 0 && <= 30 && !pendingRenewal`          | PASS   |
| `lib/notifications/events.ts`: `onMaintenanceStatusChanged` accepts `previousStatus?: string`, both early-return guards present                        | PASS   |
| `app/api/cron/daily/route.ts` line 151: uses `/tenant/contract/view`                                                                                   | PASS   |
| `app/tenant/maintenance/TenantMaintenanceClient.tsx`: `<button type="button">` row wrappers, read-only detail modal, `setSelectedId` state             | PASS   |
| `app/tenant/pair/page.tsx`: `code.length > 0 && code.length < 6` hint paragraph                                                                        | PASS   |
| `app/tenant/layout.tsx`: NO `'use client'`, exports `metadata` with tenant title                                                                       | PASS   |
| `app/tenant/TenantShell.tsx`: HAS `'use client'`, `/tenant/profile` NOT in nav items                                                                   | PASS   |
| `components/profile/ProfileForm.tsx`: zero `blue-` classes remaining                                                                                   | PASS   |
| `app/tenant/profile/page.tsx`: simple `redirect('/tenant/settings')`                                                                                   | PASS   |
| `lib/pdf/generatePaymentReceipt.ts`: exists, exports `generatePaymentReceipt`                                                                          | PASS   |
| `app/api/payments/[id]/receipt/route.ts`: GET handler with 401/403/400 guards                                                                          | PASS   |
| `app/tenant/payments/page.tsx`: additive "Download Receipt" button on paid payments                                                                    | PASS   |
| `supabase/migrations/20260411000002_tenant_document_upload.sql`: migration file exists                                                                 | PASS   |
| `app/api/documents/route.ts`: tenant-upload branch checks `contract.tenant_id === user.id`, restricts to `tenant_id/receipt/other` categories          | PASS   |
| `app/tenant/documents/TenantDocumentsClient.tsx`: upload form UI with category select, file picker, notes textarea                                     | PASS   |

---

## Known Limitations

### Browser tab title is EN-only

`app/tenant/layout.tsx` exports `metadata` with `title: { default: 'RentOS — Tenant Portal', template: '%s | RentOS' }`. Next.js `metadata` exports are static server-side constructs — they cannot access i18n context (React context or `localStorage`). The tab title will always read "RentOS — Tenant Portal" in English regardless of the user's selected language. This is a platform constraint, not a bug. PO queued as a follow-up (same limitation exists in `app/landlord/layout.tsx`).

---

## Cross-Team Regression Notes

- PP's contract-view 3-step query and QQ's banner both correctly link to `/tenant/contract/view` — no regression.
- QQ's saffron banner is visually compatible with TT's brand sweep (both use `border-saffron-300 bg-warm-100` pattern).
- RR's modal uses `z-50` (fixed full-screen), correct for stacking above TT's `TenantShell` bottom nav (which uses `z-40` per design system).
- TT's layout split (server wrapper + client shell) leaves all pages in `/tenant/` correctly nested — PP's contract view and RR's maintenance page render without changes.
- UU's new `documents.uploaded_by` column and `tenant_insert` RLS policy operate on the `documents` table only — no impact on QQ's notification dedup work.

---

## PO Manual Actions Required

### BEFORE deploying to production

**1. Apply the tenant document upload migration (REQUIRED)**

Open Supabase SQL console and run the contents of:

```
supabase/migrations/20260411000002_tenant_document_upload.sql
```

Verify after running:

```sql
SELECT polname FROM pg_policy WHERE polrelid = 'public.documents'::regclass;
-- Expected: landlord_all, tenant_select, tenant_insert, tenant_select_own_uploads

SELECT column_name FROM information_schema.columns WHERE table_name = 'documents';
-- Expected: includes 'uploaded_by'
```

**2. Optional — clean up stale rent rows past lease_end (T-BUG-07)**

Existing contracts activated before T-BUG-07 may have up to 12 pending rent rows where `due_date > lease_end`. These are cosmetic (they won't be due) but can confuse tenants. Run on staging first:

```sql
DELETE FROM payments
WHERE status = 'pending'
  AND payment_type = 'rent'
  AND due_date > (SELECT lease_end FROM contracts WHERE contracts.id = payments.contract_id);
```

### AFTER deploying — click-path smoke test (phone incognito)

- [ ] Sign in as tenant → browser tab title reads "RentOS — Tenant Portal"
- [ ] Dashboard shows lease-expiry banner if `lease_end` is within 30 days (saffron, "View Contract" links to `/tenant/contract/view`)
- [ ] Dashboard: if pending renewal card is visible, lease-expiry banner is suppressed
- [ ] My Contract card → contract view shows the **active** lease (not a pending renewal)
- [ ] Back to dashboard → My Contract again — no stuck skeleton
- [ ] Maintenance page → rows have hover shadow affordance → click a row → detail modal opens
- [ ] Modal shows status, description, assigned_to (if set), estimated/actual cost (if set), completed date, Close button
- [ ] Pair page → type 1 character → "5 more characters needed" appears → type to 6 → hint disappears
- [ ] Payments page → paid row shows "Download Receipt" button → click → PDF opens in new tab, Thai characters render
- [ ] Short contract → payments list shows only rows up to lease_end
- [ ] Settings page → Save button is saffron, input focus rings are saffron
- [ ] Navigate to `/tenant/profile` → redirects to `/tenant/settings` without flash
- [ ] More sheet / side nav → no duplicate "Profile" entry
- [ ] Documents page → "+ Upload Document" button visible when active contract exists
- [ ] Upload a receipt PDF → success toast → document appears in list
- [ ] Sign in as different tenant → uploaded document NOT visible
- [ ] Sign in as landlord on first tenant's contract → tenant-uploaded document IS visible
- [ ] Trigger maintenance open → in_progress → resolved → notifications shows exactly 2 entries
- [ ] Click a `lease_expiry` notification → routes to `/tenant/contract/view` (not 404)

---

## Deferred Items

| Item                                                                    | Rationale                                                                                     |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| TS-04 Tenant-initiated renewal request                                  | Requires new notification type, schema column, landlord review UI — too large for this sprint |
| TS-06..15 LOW polish items                                              | Explicit out-of-scope                                                                         |
| Landlord tab-title locale fix                                           | Same Next.js metadata constraint; PO queued as follow-up                                      |
| Tenant document delete                                                  | Not in scope this sprint                                                                      |
| Payment cleanup SQL (stale rent rows)                                   | PO manual action documented above; not automated                                              |
| `/tenant/contracts` plural-path in custom notification rules (line 334) | Partial T-BUG-11 fix; main cron path fixed; custom rules path out of scope                    |
| Browser-tab title localization                                          | Platform constraint (Next.js metadata is locale-agnostic)                                     |
| Landlord profile/settings dedup                                         | Out of scope                                                                                  |
