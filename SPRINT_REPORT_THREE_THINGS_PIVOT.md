# Sprint Report: Three Things Scope-Cut + Companion-App Pivot

**Date**: 2026-04-11
**Branch**: three-things-pivot
**Verification Team**: SS

---

## Overall Verdict: 🟡 YELLOW → GREEN after one minimal fix

> **One build-blocking issue was found and fixed during SS verification**: `app/pair/page.tsx` (Team EE) called `useSearchParams()` without a `<Suspense>` boundary, causing Next.js static generation to fail with `useSearchParams() should be wrapped in a suspense boundary`. SS applied a minimal fix (extract inner component + wrap in `<Suspense>`) with no logic changes. After the fix, all three gates — `tsc`, `lint`, and `build` — are clean. Verdict is effectively **GREEN** post-fix.

---

## Section 1: Locked Decisions

The following six scope-cut decisions from `sprint-reports/three-things/scope-cut-plan-summary.md` were implemented this sprint:

1. **HIDE Contract Generate** — landlord contract-generation surface gated with `notFound()` via `FEATURE_CONTRACT_GENERATE = false` in `lib/features.ts`.
2. **HIDE Maintenance** — landlord and tenant maintenance surfaces gated with `notFound()` via `FEATURE_MAINTENANCE = false`. Nav entries removed conditionally from both mobile tab bar and desktop side nav.
3. **HIDE Co-Tenants** — co-tenants surface gated with `notFound()` via `FEATURE_CO_TENANTS = false`.
4. **REMOVE PricingToggle** — `components/landing/PricingToggle.tsx` deleted; all import/usage sites removed from `app/page.tsx`. Zero matches in codebase.
5. **DELETE `/api/debug/auth-state`** — `app/api/debug/auth-state/route.ts` deleted. Directory does not exist. Zero references remain.
6. **Hero V1** — Landing page updated with Hero V1 (minimal utility framing, international copy). Section present in `app/page.tsx` at line 259.

**Companion-App Pivot framing**: Contracts table is now dual-ownership. `landlord_id` is nullable; a tenant can create their own contract row without a paired landlord. Pairing is now optional and QR-initiated from the landlord property page. The pivot is safe because there are zero real users on either side (all data is test data). Detailed schema changes are in `supabase/migrations/20260412000001_companion_app_pivot.sql` — **NOT YET APPLIED** (PO action required, see Section 4).

---

## Section 2: Team Status

| Team   | Scope                                           | Status       | Files Touched (key)                                                                                                                                                                               | Notes                                                                                                                                                 |
| ------ | ----------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **AA** | Scope-cut flags + nav gating + dead code        | GREEN        | `lib/features.ts` (NEW), `app/landlord/layout.tsx`, gated page routes, ~~`app/api/debug/auth-state/route.ts`~~, ~~`components/landing/PricingToggle.tsx`~~                                        | Nav uses `...(FEATURE_MAINTENANCE ? [...] : [])` spread — correctly omits entry when false. Both mobile tab bar and desktop side nav gated.           |
| **BB** | Hero V1 + landing copy + EN/TH switcher         | GREEN        | `app/page.tsx`, `locales/en.json`, `locales/th.json`                                                                                                                                              | Used `landing.hero_sub_v1` key instead of `landing.hero_sub` (also present). Both keys exist in locale files. See Section 7.                          |
| **CC** | Dashboard A redesign                            | GREEN        | `app/landlord/dashboard/DashboardClient.tsx`, `app/landlord/dashboard/page.tsx`, `locales/en.json`, `locales/th.json`                                                                             | 3-card grid renders correctly; sub/action locale keys all present. No stray maintenance references.                                                   |
| **DD** | Contracts ownership pivot                       | GREEN        | `supabase/migrations/20260412000001_companion_app_pivot.sql` (NEW), `lib/supabase/types.ts`, `app/api/contracts/route.ts`, `app/tenant/contract/view/page.tsx`, cascade null fixes across 5 files | Added `property_id DROP NOT NULL` + 3 new columns beyond plan SQL — documented in Section 7. Migration not applied (PO action).                       |
| **EE** | Optional pairing + payment penalty notification | YELLOW→GREEN | `app/landlord/properties/[id]/PropertyDetailClient.tsx`, `app/pair/page.tsx` (NEW), `app/api/cron/daily/route.ts`, `lib/notifications/send.ts`, `app/landlord/payments/page.tsx`                  | `app/pair/page.tsx` missing `<Suspense>` boundary around `useSearchParams()` — build failed. SS applied minimal fix. All other EE deliverables clean. |

---

## Section 3: Verification Results

### TypeScript (`npx tsc --noEmit`)

```
(no output — clean)
Exit code: 0
```

### ESLint (`npm run lint`)

```
✔ No ESLint warnings or errors
Exit code: 0
```

### Build (`npm run build`)

**First attempt (before SS fix):**

```
✓ Compiled successfully
⨯ useSearchParams() should be wrapped in a suspense boundary at page "/pair".
Error occurred prerendering page "/pair". Read more: https://nextjs.org/docs/messages/prerender-error
Export encountered errors on following paths: /pair/page: /pair
Exit code: 1
```

**After SS fix to `app/pair/page.tsx` (Suspense boundary):**

```
✓ Compiled successfully
✓ Generating static pages (100/100)
Exit code: 0
```

### Cross-Team Regression Sweep

| Check                                                                                               | Result | Notes                                                                                                                                                                                                                                     |
| --------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DashboardClient.tsx` — no stray Maintenance links                                                  | PASS   | Maintenance icon/link only appears inside `...(FEATURE_MAINTENANCE ? [...] : [])` spread in layout. DashboardClient itself has no nav links.                                                                                              |
| `app/page.tsx` — Hero V1 in place, PricingToggle removed                                            | PASS   | Hero V1 section at line 259. Uses `landing.hero_headline` + `landing.hero_sub_v1`. Zero PricingToggle imports.                                                                                                                            |
| `app/tenant/contract/view/page.tsx` — prioritized query + `isTenantOwned`                           | PASS   | 4-step query: active (paired) → awaiting_signature → pending → tenant-owned (landlord_id IS NULL). `isTenantOwned = contract.landlord_id === null` at line 396. OCR/clauses section hidden when `isTenantOwned` is true (lines 436, 444). |
| `app/api/cron/daily/route.ts` — penalty block after overdue block, references `penalty_notified_at` | PASS   | Block 2a (overdue, lines ~106-145) fires `payment_overdue`. Block 2b (penalty, lines ~147-219) fires `payment_penalty` to landlord only, marks `penalty_notified_at`, idempotent.                                                         |
| `grep PricingToggle` — zero matches                                                                 | PASS   | Zero matches across all `.ts`/`.tsx`/`.js` files.                                                                                                                                                                                         |
| `grep auth-state` under `app/api/debug/` — zero matches                                             | PASS   | Directory `app/api/debug/` does not exist.                                                                                                                                                                                                |

### Locale Merge Verification

All 30 expected locale keys verified present in both `locales/en.json` and `locales/th.json`:

**Landing (BB):** `landing.hero_headline` ✓, `landing.hero_sub` ✓, `landing.hero_sub_v1` ✓, `landing.cta_primary` ✓, `landing.cta_secondary` ✓, `landing.feature_rent_title` ✓, `landing.feature_rent_body` ✓, `landing.feature_contract_title` ✓, `landing.feature_contract_body` ✓

**Dashboard (CC):** `dashboard.card_active_properties` ✓, `dashboard.card_unpaid_rent` ✓, `dashboard.card_contracts_expiring` ✓ — plus sub/action variants (`*_sub`, `*_action`) all present ✓

**Tenant lease (DD):** `tenant.add_lease_button` ✓, `tenant.add_lease_title` ✓, `tenant.add_lease_property_name` ✓, `tenant.add_lease_start` ✓, `tenant.add_lease_end` ✓, `tenant.add_lease_rent` ✓, `tenant.add_lease_due_day` ✓, `tenant.add_lease_notes` ✓, `tenant.add_lease_submit` ✓, `tenant.add_lease_success` ✓

**Pairing (EE):** `pairing.property_section_title` ✓, `pairing.generate_qr` ✓, `pairing.code_label` ✓, `pairing.expires_in` ✓, `pairing.regenerate` ✓ — plus `pairing.property_section_description` also present (EE addition beyond plan spec) ✓

**Notifications (EE):** `notifications.payment_penalty_title` ✓, `notifications.payment_penalty_body` ✓

**Payments (EE):** `payments.mark_paid_confirm` ✓

No missing or misspelled keys. No collisions between teams (each team scoped to its own namespace).

### Migration File Audit (`supabase/migrations/20260412000001_companion_app_pivot.sql`)

| Expected element                                                        | Present                                                                      |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `ALTER COLUMN landlord_id DROP NOT NULL`                                | ✓ line 12-13                                                                 |
| `ALTER COLUMN property_id DROP NOT NULL` (DD deviation — see Section 7) | ✓ line 18-19                                                                 |
| `ADD COLUMN IF NOT EXISTS property_name`                                | ✓ line 22-23                                                                 |
| `ADD COLUMN IF NOT EXISTS due_day`                                      | ✓ line 26-27                                                                 |
| `ADD COLUMN IF NOT EXISTS notes`                                        | ✓ line 30                                                                    |
| `contracts_has_owner` CHECK constraint                                  | ✓ lines 35-38                                                                |
| `contracts_tenant_insert` policy                                        | ✓ lines 40-43                                                                |
| `contracts_tenant_update` policy                                        | ✓ lines 47-51                                                                |
| `contracts_tenant_delete` policy                                        | ✓ lines 53-56                                                                |
| `payments.penalty_notified_at` column                                   | ✓ lines 59-60                                                                |
| `NOTIFY pgrst, 'reload schema'`                                         | ✓ line 62                                                                    |
| Migration is idempotent                                                 | ✓ uses `IF NOT EXISTS`, `DROP CONSTRAINT IF EXISTS`, `DROP POLICY IF EXISTS` |

---

## Section 4: PO Action Required

**Before running any click-path tests, you must apply the companion-app migration in your Supabase console.**

### Steps

1. Open your Supabase project → SQL Editor.
2. Copy the full contents of `supabase/migrations/20260412000001_companion_app_pivot.sql` and run it.
3. Verify with these SELECT queries:

```sql
-- 1. Confirm landlord_id is now nullable
SELECT is_nullable
FROM information_schema.columns
WHERE table_name = 'contracts' AND column_name = 'landlord_id';
-- Expected: YES

-- 2. Confirm property_id is now nullable (DD extension)
SELECT is_nullable
FROM information_schema.columns
WHERE table_name = 'contracts' AND column_name = 'property_id';
-- Expected: YES

-- 3. Confirm new columns exist
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'contracts' AND column_name IN ('property_name', 'due_day', 'notes');
-- Expected: 3 rows

-- 4. Confirm safety constraint
SELECT conname FROM pg_constraint WHERE conname = 'contracts_has_owner';
-- Expected: 1 row

-- 5. Confirm new RLS policies
SELECT polname FROM pg_policy WHERE polrelid = 'public.contracts'::regclass;
-- Expected: includes contracts_tenant_insert, contracts_tenant_update, contracts_tenant_delete
-- alongside existing landlord policies

-- 6. Confirm penalty marker column
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'payments' AND column_name = 'penalty_notified_at';
-- Expected: 1 row
```

---

## Section 5: Manual Click-Path Checklist

> Run these after applying the migration (Section 4). These are UI-only click-path tests.

- [ ] Landing shows Hero V1 — headline: "Track rent. Manage contracts. Nothing else." International framing (no "Thai landlords" in sub). EN/TH switcher works; toggle TH → Thai text renders; toggle back → EN restores.
- [ ] Signup → landlord → Dashboard A renders 3 equal vertical cards: Active Properties, Unpaid Rent, Contracts Expiring.
- [ ] Landlord nav has no Generate / Maintenance / Co-tenants entries anywhere (mobile tab bar + desktop side nav).
- [ ] Navigate directly to `/landlord/maintenance`, `/landlord/contracts/generate`, `/landlord/co-tenants` → each renders 404.
- [ ] `GET /api/debug/auth-state` → 404.
- [ ] Tenant signup without pairing → tenant dashboard shows "+ Add my lease" button (or equivalent entry point).
- [ ] Tenant clicks "+ Add my lease" → form appears with fields: property name, lease start, lease end, rent, due day, notes. Submit → row created with `tenant_id = me`, `landlord_id = null`, `status = active`.
- [ ] Tenant-created unpaired lease appears in tenant contract view. The extracted-clauses / structured-clauses section is hidden. Property name (free text) is shown. Notes and due day shown if filled.
- [ ] Landlord opens a property with an active contract → "Pair a tenant" section visible at the bottom (low visual priority).
- [ ] Landlord clicks "Generate pairing QR" → QR code renders + 6-char code + countdown timer (30:00).
- [ ] Open QR URL in incognito → lands on `/signup?role=tenant&pair=<code>`.
- [ ] Complete tenant signup via QR link → auto-redeems → tenant sees landlord's contract; landlord sees paired tenant.
- [ ] Landlord mark-as-paid button → confirm dialog appears (with locale-appropriate text) → Confirm → payment marked paid. Cancel → nothing changes.
- [ ] Daily cron fires `payment_penalty` notification to landlord only for payments that are overdue and past 7-day grace period. Re-running cron does not double-fire. Tenant does not receive penalty notification.
- [ ] EN ↔ TH toggle on every new surface: hero, dashboard cards, pairing section, tenant add-lease form.

---

## Section 6: Follow-ups

**Carried from plan (explicitly deferred this sprint):**

- `penalty_grace_days` configurability — hardcoded to 7 days in `app/api/cron/daily/route.ts:157`. Follow-up sprint to add a `penalty_grace_days` column to `contracts` and read from it.
- Feature flags → env var migration — flags are currently server-side constants in `lib/features.ts`. Future migration to `process.env.NEXT_PUBLIC_FEATURE_*` allows runtime toggling without redeploy.
- Hero V2 (dashboard-sidebar) and Hero V3 (Thai-first gate illustration) — dropped this sprint; V1 is the live version.
- Maintenance feature — hidden behind `FEATURE_MAINTENANCE = false`. Returns post-validation if landlord demand exists.
- Co-tenants feature — hidden behind `FEATURE_CO_TENANTS = false`. Deferred indefinitely.
- Contract generation (landlord-side AI) — hidden behind `FEATURE_CONTRACT_GENERATE = false`. Returns post-validation.
- ZH-CN landing-page copy — deferred; app-side ZH translation still functional.
- Landlord profile/settings dedup — deferred.
- Tenant document delete — not in scope.
- `/tenant/contracts` plural route cleanup — deferred; DD scoped to the view page.
- Tenant-initiated renewal request — follow-up sprint.

**New follow-ups discovered during SS verification:**

- `app/pair/page.tsx` (EE) — Missing `<Suspense>` boundary around `useSearchParams()`. Caused build failure at static generation of `/pair`. SS applied a minimal fix (inner component pattern). **No functional change** — this is noted for EE awareness in future pages using `useSearchParams()`.
- `pairing.property_section_description` — EE added this key (both EN + TH) that was not in the plan's locale key list. Key is present and properly used in `PropertyDetailClient.tsx`. No action needed; documenting for completeness.
- The prior **tenant-beta-hardening sprint** (`SPRINT_REPORT_TENANT_HARDENING.md`) is superseded by this sprint. Its architectural assumptions (shared-CRM model, tenant entry only via pairing) are replaced by the companion-app pivot. The T-BUG-01 prioritized query is preserved and extended (active → awaiting_signature → pending → tenant-owned fallback), but the lease-expiry banner, 12-row payment bound, pair length hint, and notification dedup work from that sprint are obsolete and should not be re-implemented under the old framing. Re-triage any still-relevant items before scheduling.
- Browser tab title (`<title>`) localization — the landing page title is statically rendered server-side. When locale changes client-side via `LanguageToggle`, the `<title>` does not update (it's a server component). Low priority since we're pre-beta, but worth tracking.

---

## Section 7: Notable Deviations from Plan

| Deviation                                                    | Team | Detail                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------ | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `property_id DROP NOT NULL` added to migration               | DD   | The plan SQL only showed `landlord_id DROP NOT NULL`. DD additionally made `property_id` nullable to support tenant-owned rows that don't reference a landlord-managed property. This is architecturally consistent with the pivot and documented in the migration.                                                                                                                                   |
| New columns `property_name`, `due_day`, `notes` on contracts | DD   | Not in the plan's migration SQL snippet, but required for tenant-owned rows (tenant has no property FK). All three added with `ADD COLUMN IF NOT EXISTS`.                                                                                                                                                                                                                                             |
| `property_id` → `property_name` (free text) for tenant rows  | DD   | Tenant-owned contracts use `property_name TEXT` (free text) rather than `property_id UUID` (FK to landlord properties table). This is the correct design for the pivot; application logic enforces `property_id` when `landlord_id IS NOT NULL`.                                                                                                                                                      |
| `window.confirm()` used for mark-as-paid double-confirm      | EE   | The plan said "minimal confirm dialog (≤10 lines)". EE used the native `window.confirm()` browser API. This is 1 line, idempotent, requires no new component. Trade-off: not localizable with `t()`. The locale key `payments.mark_paid_confirm` exists but is passed to `window.confirm()` via `t('payments.mark_paid_confirm')` — this works since `t()` returns a string. Acceptable for pre-beta. |
| `landing.hero_sub_v1` key used instead of `landing.hero_sub` | BB   | Plan specified `landing.hero_sub`. BB shipped `landing.hero_sub_v1` (the `_v1` suffix matches the sprint's Hero V1 naming). Both keys exist in `en.json` and `th.json`. The hero section renders from `hero_sub_v1`. `hero_sub` remains in the locale file (may have been pre-existing or added by BB). No breakage — just a naming deviation from the plan spec.                                     |
| `pairing.property_section_description` added                 | EE   | Not in the plan's locale key list. EE added a description line below the section title in `PropertyDetailClient.tsx`. Key is bilingual and present in both locale files. Purely additive.                                                                                                                                                                                                             |
| `app/pair/page.tsx` missing `<Suspense>` boundary            | EE   | Build-blocking issue at static generation. SS applied the fix (2-function pattern: `PairPageInner` + `PairPage` wrapper). No logic changes.                                                                                                                                                                                                                                                           |
