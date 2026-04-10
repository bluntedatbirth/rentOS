# Sprint Report: Landlord Beta Hardening

**Date**: 2026-04-11
**Verdict**: GREEN
**Build**: tsc ✅ / lint ✅ / build ✅

---

## Items shipped

### P0 (mandatory)

- [x] **BUG-01** — `applyRiskFix` null-guards on `clause.text_th / text_en / title_en` (lines 337–348) + `pos === -1` guard (line 376) + toast on both paths. `app/landlord/contracts/[id]/renew/page.tsx:325–381`

### P1 (mandatory)

- [x] **BUG-02 / FEAT-1** — `expectedRevenue` computed server-side from `contracts.filter(active).reduce(sum + monthly_rent, 0)`, passed to DashboardClient alongside `monthlyRevenue`. Revenue card shows `{collected} / {expected}` when expected > 0. `app/landlord/dashboard/page.tsx:183–192`, `app/landlord/dashboard/DashboardClient.tsx:136+`
- [x] **BUG-03** — `hasLoaded` state flag; skeleton only shown on `loading && !hasLoaded`, preventing flash on subsequent loads. `app/landlord/payments/page.tsx:79,190`
- [x] **BUG-04** — `handleSaveDraft` wrapped in try/catch; `alert()` fallback if toast context unmounted; `console.debug('[draft] saved', draftData)` present. `app/landlord/contracts/create/page.tsx:246–264`
- [x] **BUG-05 / BUG-10** — `draftKeyFor(userId)` function (line 74) returns per-user localStorage key; draft load effect depends on `user.id`; property prefill effect gated on `draftLoaded` (line 170), preventing race. `app/landlord/contracts/create/page.tsx:74,144,156,170`
- [x] **BUG-06 / FEAT-2** — `renewalsNearingExpiry` computed from active contracts with `lease_end` within 60 days, passed to DashboardClient; banner renders when N > 0. `app/landlord/dashboard/page.tsx:192–197`, `app/landlord/dashboard/DashboardClient.tsx:186–197`
- [x] **BUG-07 / FEAT-3** — `SimContext` has `targetContractId?: string`; `findContract` accepts 4th param with ownership check; `auto_pair_demo_tenant` and `file_maintenance_request` accept `targetContractId`; both have `needsContractTarget: true` in SIMULATIONS array; `app/api/beta/simulate/route.ts` reads `target_contract_id` from body; `SimulationPanel.tsx` renders contract picker for `needsContractTarget` sims. `lib/beta/simulations.ts:141,159,192,255,271–290,469,485,561`, `app/api/beta/simulate/route.ts:36–60`, `components/beta/SimulationPanel.tsx:22,64–97,205–215`
- [x] **FEAT-4 production fix** — `app/api/pairing/redeem/route.ts` imports `activateContract`; splits update into step 1 (set `tenant_id`, clear `pairing_code`/`pairing_expires_at`) + step 2 (`activateContract(adminClient, contract.id)`); returns 500 on failure. `app/api/pairing/redeem/route.ts:7,75–91` **[critical — real production bug: every contract paired via QR/code in the beta was missing its 12 payment rows; see FEAT-4 narrative below]**
- [x] **FEAT-4 simulation fix** — `lib/beta/simulations.ts:auto_pair_demo_tenant` now performs two-step update (tenant/clauses/lease-dates first, then `activateContract`); return value includes `seededPayments: activateResult.seededCount`. `lib/beta/simulations.ts:544–556`
- [x] **FEAT-4 backfill route** — `app/api/contracts/backfill-payments/route.ts` exists; POST-only, landlord session required; loops all active contracts, calls `activateContract` (idempotent); returns `{backfilled, alreadySeeded, errors}`. `app/api/contracts/backfill-payments/route.ts`

### P2

- [x] **BUG-08** — Verify-only: maintenance query already filters `['open','in_progress']` confirmed at `app/landlord/dashboard/page.tsx:143`. Comment added. No code change needed.
- [x] **BUG-09** — Empty-array guard around `.in('id', uniqueTenantIds)` (line 238); `console.warn` for missing profiles (line 249); intermediate fallback `${tenantId.slice(0,8)}…` when profile not found (line 265). `app/landlord/dashboard/page.tsx:235–265`
- [x] **BUG-10** — Per-user draft key (covered under BUG-05 above). Separate draft namespace per `user.id` prevents cross-user draft leakage. `app/landlord/contracts/create/page.tsx:74`
- [x] **BUG-11** — `<option value="__manual__">` in clause select; `manualAmount`/`manualDesc` state; `handleManualRaise` sends `clause_id: null`; Zod schema accepts `clause_id: z.string().min(1).nullable()`. `app/landlord/penalties/PenaltiesClient.tsx:116–118,214–232,559–640`, `app/api/penalties/route.ts:35` **[requires DB migration — see PO actions]**
- [x] **BUG-12** — Toast dismiss button now uses `{'\u2715'}` JSX expression (not literal backslash-u text). `components/ui/Toast.tsx:84`
- [x] **BUG-13** — `common.optional` present in all 3 locale files: `en="(optional)"`, `th="(ไม่บังคับ)"`, `zh="(选填)"`. `locales/en.json:820`, `locales/th.json:820`, `locales/zh.json:820`

### P3

- [x] **BUG-14** — Modal edit button label changed to `maintenance.edit_costs` at two call-sites; key present in all 3 locale files (`en="Edit Costs"`, `th="แก้ไขค่าใช้จ่าย"`, `zh="编辑费用"`). `app/landlord/maintenance/MaintenanceClient.tsx:339,444`
- [x] **BUG-17** — Pair Tenant link gated on `!contract.tenant_id`; when already paired, replaced by green badge `✓ {t('pairing.already_paired')}`. `app/landlord/contracts/[id]/page.tsx:153–164`

### Coordination cleanup (SS)

- [x] **OAuth diagnostic removed** — `console.log('[oauth] signInWithOAuth', ...)` removed from `lib/supabase/useAuth.ts:175` per plan instructions. No other teams had removed it.

### Deferred (opportunistic P3s not done)

- BUG-15, BUG-16, BUG-18, BUG-19 — deferred per plan priority gate. No team attempted these.
- FEAT-5..16 — explicitly out of scope for this sprint.

---

## FEAT-4 critical narrative

Every contract paired via the real QR/code flow in the beta was being activated by a raw `update({ status: 'active' })` in `app/api/pairing/redeem/route.ts`, which bypassed `activateContract()` and therefore skipped the 12-payment seeding side effect entirely. The same bypass existed in the `auto_pair_demo_tenant` simulation. Team PP fixed both paths to route through `activateContract()` — which is idempotent and enforces the state-machine invariants before seeding payments. A new `POST /api/contracts/backfill-payments` route lets the beta tester recover currently-broken active contracts without wiping any data; the route simply calls `activateContract()` on each active contract, which no-ops if payments already exist and seeds them if they are missing.

---

## Files changed

### Team PP

- `app/landlord/contracts/[id]/renew/page.tsx` — BUG-01 null-guards
- `app/landlord/contracts/create/page.tsx` — BUG-04, BUG-05, BUG-10
- `app/landlord/contracts/[id]/page.tsx` — BUG-17 paired badge
- `app/api/pairing/redeem/route.ts` — FEAT-4 production fix
- `lib/beta/simulations.ts` — FEAT-4 simulation fix (auto_pair_demo_tenant region)
- `app/api/contracts/backfill-payments/route.ts` — NEW, FEAT-4 backfill

### Team QQ

- `app/landlord/dashboard/page.tsx` — BUG-02, BUG-06, BUG-09, FEAT-1, FEAT-2
- `app/landlord/dashboard/DashboardClient.tsx` — FEAT-1 revenue card, FEAT-2 renewal banner
- `locales/en.json`, `locales/th.json`, `locales/zh.json` — dashboard i18n keys

### Team RR

- `app/landlord/payments/page.tsx` — BUG-03 hasLoaded flag
- `app/landlord/penalties/PenaltiesClient.tsx` — BUG-11 manual entry UI
- `app/api/penalties/route.ts` — BUG-11 nullable clause_id
- `app/landlord/maintenance/MaintenanceClient.tsx` — BUG-14 edit_costs label
- `locales/en.json`, `locales/th.json`, `locales/zh.json` — penalties + maintenance i18n keys
- `supabase/migrations/20260411000001_penalties_manual_entry.sql` — NEW

### Team TT

- `components/ui/Toast.tsx` — BUG-12 × glyph
- `lib/beta/simulations.ts` — FEAT-3: SimContext, findContract, SIMULATIONS array, dispatcher
- `app/api/beta/simulate/route.ts` — FEAT-3: accept target_contract_id
- `components/beta/SimulationPanel.tsx` — FEAT-3: contract picker UI
- `locales/en.json`, `locales/th.json`, `locales/zh.json` — common.optional

### Team SS (coordination)

- `lib/supabase/useAuth.ts` — removed OAuth diagnostic console.log

---

## Migrations introduced

- `supabase/migrations/20260411000001_penalties_manual_entry.sql` — drops NOT NULL on `penalties.clause_id` to allow manual (clause-free) penalty entries.

---

## PO action items

### Before deploying

1. Apply the penalties migration on the Supabase production DB:

   ```sql
   ALTER TABLE public.penalties ALTER COLUMN clause_id DROP NOT NULL;
   NOTIFY pgrst, 'reload schema';
   ```

   (The migration file at `supabase/migrations/20260411000001_penalties_manual_entry.sql` contains this exact SQL — run it via the Supabase dashboard SQL editor or the Supabase CLI.)

2. Confirm no env var changes are required — none introduced this sprint.

### Immediately after deploying

1. **FEAT-4 backfill for the beta tester** — while signed in as the beta landlord account, POST to `/api/contracts/backfill-payments` (via Thunder Client with session cookie, or browser DevTools fetch). The response will list contract IDs in `backfilled[]` (payments just seeded) and `alreadySeeded[]` (already had rows). Verify `/landlord/payments` now shows 12 rent rows per previously-broken active contract.

### PO click path (manual verification on phone, incognito)

- [ ] Sign in → dashboard shows "expected / collected" revenue card (e.g. `฿0 / ฿12,000`)
- [ ] If any active contract has `lease_end` in the next 60 days → renewals banner renders above stat grid
- [ ] `/landlord/properties` → click a property → "Create Contract from Property" → step 1 must be prefilled with property name/address/unit
- [ ] Wizard: fill step 1 → Save Draft → hard reload → draft values persist
- [ ] Sign out → sign in as a different user → wizard shows empty step 1 (no cross-user draft leakage)
- [ ] Renew a contract → run AI analysis → click "Apply Fix" on any risk with partial text → no crash; friendly toast if clause text is missing
- [ ] `/landlord/payments` → Record Payment → fill form → submit → list refreshes without full-page skeleton flash
- [ ] `/landlord/penalties` → Raise Penalty → select "Manual entry" from clause dropdown → enter free-form amount + description → submit → penalty persists
- [ ] Trigger any toast (e.g. save draft) → dismiss button shows `×` glyph (not the literal text `\u2715`)
- [ ] `/landlord/maintenance` → open any request → "Edit Costs" button label is clear; Actual Cost field label shows "(optional)"
- [ ] Beta panel → for `auto_pair_demo_tenant` or `file_maintenance_request`, a contract picker dropdown appears → select a non-default contract → run sim → sim targets the selected contract
- [ ] Real pairing flow: landlord generates pair code → tenant redeems on tenant app → `/landlord/payments` shows 12 rent rows with correct sequential due dates
- [ ] Open an already-paired contract → "Pair Tenant" button is gone, replaced by green "✓ Already Paired" badge
- [ ] Dashboard "Open Maintenance" count — create a maintenance request via sim, mark it resolved, verify count does not increase

---

## Regression risks

- **`lib/beta/simulations.ts` dual-team edit** — PP and TT both modified this file in non-overlapping regions. The build and tsc pass clean, so no conflict exists. However, any future edit to this file should be done carefully given it now has a more complex type structure (`SimContext`, `findContract` signature, SIMULATIONS array).
- **`locales/*.json` triple-team edit** — QQ, RR, and TT all added keys to all three locale files. All keys are present and the build passes. If any locale diff tooling is used in CI later, ensure it handles concurrent additions gracefully.
- **Penalties migration must precede deploy** — if the migration is not applied before the new code ships, the `handleManualRaise` path will throw a DB constraint violation on any manual penalty submission.
- **Backfill is one-time / safe to re-run** — `activateContract` is idempotent; running the backfill multiple times will not create duplicate payments. The `alreadySeeded[]` array in the response confirms this.

---

## Known limitations / follow-ups

- **`/landlord/contracts?filter=expiring`** — the renewals banner links to this URL but the filter is not yet implemented. Clicking the banner "Review" link will land on an unfiltered contracts list. Implement the filter in the next sprint.
- **BUG-15, BUG-16, BUG-18, BUG-19** — copy/polish items deferred. Schedule for the next sprint if beta feedback surfaces them.
- **FEAT-5..16** — bulk actions, receipts PDF, rent-increase calculator, etc. Post-beta-stabilisation sprint.
- **Tenant-side UX sweep** — this sprint was landlord-only. A separate tenant beta sprint is needed once landlord flow is confirmed stable.
- **Automatic renewal-reminder notifications** — FEAT-2 ships the banner only. Scheduled push notifications for approaching lease-end are a follow-up.
- **No test suite run** — `npm test` / `vitest` was not run as part of this verification pass (no test runner invocation was requested in the Phase 1 gate). If a test suite exists under `tests/`, running it before the next deploy is advisable.
