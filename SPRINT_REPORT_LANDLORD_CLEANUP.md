# Sprint Report: Landlord Shell Cleanup

**Verdict: GREEN**
**Date: 2026-04-11**
**Branch: landlord-cleanup**
**Verification by: Team SS (claude-sonnet-4-6)**

---

## 5 PO Directives — Status

| #   | Directive                                                                  | Status | Notes                                                                                                                                                                                                                                                                                                                |
| --- | -------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Dashboard Recent Activity + maintenance cruft removed                      | DONE   | GG deleted Recent Activity panel, `MaintenanceIcon`, `recentMaintenanceRes`, `maintenanceRes`, feed-build loop, `ActivityItem` interface, and notification UI pages. Zero maintenance references remain in dashboard files.                                                                                          |
| 2   | Notification settings shrunk to 2 categories (unpaid rent + 60-day expiry) | DONE   | II widened lease_expiry cron to 60 days, deleted `renewal_signing_reminder`, `tier_expiry_warning`, `tier_downgraded` cron blocks, removed `onPenaltyAppealed` and landlord notification from `onTenantPaired`. `payment_penalty` and `lease_expiry` are the only two landlord-bound notification fires in the cron. |
| 3   | Bottom task bar rework: 3 tabs (Dashboard / Properties / Settings)         | DONE   | FF rewrote nav to exactly 3 bottom tabs and 3 side nav entries. MoreSheet deleted. Payments moved to per-property tab. Settings page rebuilt with 3 sections: Profile, Documents, Security.                                                                                                                          |
| 4   | Beta Simulations stripped to 3 entries                                     | DONE   | JJ trimmed registry to `reset_test_account`, `simulate_overdue_payment`, `simulate_contract_expiring_60d`. 10 handler functions + 3 unused helpers deleted.                                                                                                                                                          |
| 5   | Bug Report button redesigned to red-600 + Lucide Bug icon                  | DONE   | JJ changed background to `bg-red-600 hover:bg-red-700 text-white`, replaced inline SVG with Lucide Bug path data (inline, no import).                                                                                                                                                                                |

---

## Team Status Table

| Team | Scope                                               | Status | Notes                                                                                                                   |
| ---- | --------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------- |
| FF   | Nav rework + Settings aggregation                   | GREEN  | tsc/lint clean on delivery                                                                                              |
| GG   | Dashboard Recent Activity + notification UI removal | GREEN  | tsc/lint clean on delivery; dead vars `totalPropertyCount`/`stats` noted in briefing were not present in delivered file |
| HH   | Per-property Payments tab                           | GREEN  | tsc/lint clean on delivery; `useSearchParams` correctly wrapped in `<Suspense>`                                         |
| II   | Notification simplification                         | GREEN  | tsc/lint clean on delivery; zh.json updated as bonus (deviation from plan scope)                                        |
| JJ   | Beta Sims strip + Bug Report redesign               | GREEN  | tsc/lint clean on delivery; `lucide-react` not installed as import — inline SVG path used instead (deviation from plan) |
| SS   | Merge + verification sweep                          | GREEN  | tsc/lint/build all clean; all regression greps pass                                                                     |

---

## Verification Results

### TypeScript (`npx tsc --noEmit`)

```
(no output — zero errors)
```

### Lint (`npm run lint`)

```
✔ No ESLint warnings or errors
```

### Build (`npm run build`)

```
✓ Compiled successfully
✓ Generating static pages (97/97)
Build complete — all 97 routes generated, zero errors.
```

Selected notable routes:

- `/landlord/dashboard` — dynamic (ƒ), 3.4 kB
- `/landlord/payments` — dynamic redirect (ƒ), 219 B (confirms redirect-only, <50 lines)
- `/landlord/properties/[id]` — dynamic (ƒ), 14.6 kB
- `/landlord/settings` — static (○), 1.59 kB

### Dashboard Dead-Variable Check

Pre-flight noted `totalPropertyCount` and `stats` as potential dead vars in `dashboard/page.tsx` lines ~136-137. SS confirmed these variables are not present in the delivered file. GG cleaned up correctly on delivery — no SS fix required.

---

## Regression Grep Results

| Check                                                                                 | Result                                            |
| ------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `MaintenanceIcon` in `app/landlord/`                                                  | ZERO matches                                      |
| `'maintenance'` in `app/landlord/dashboard/`                                          | ZERO matches                                      |
| `MoreSheet` in `app/landlord/layout.tsx`                                              | ZERO matches                                      |
| `recentMaintenanceRes` anywhere                                                       | ZERO matches                                      |
| `thirtyDaysFromNow` in cron `daily/route.ts`                                          | ZERO matches                                      |
| `sixtyDaysFromNow` in cron `daily/route.ts`                                           | PRESENT (lines 32, 231)                           |
| `renewal_signing_reminder` / `tier_expiry_warning` / `tier_downgraded` send() in cron | ZERO matches                                      |
| `lucide-react` import anywhere in `rental-manager/`                                   | ZERO matches (confirmed JJ used inline path data) |
| `app/landlord/notifications/inbox/page.tsx`                                           | DELETED (file not found)                          |
| `app/landlord/notifications/rules/page.tsx`                                           | DELETED (file not found)                          |

---

## Cross-Team Cohesion Checks

| Check                                                      | Result                                                                                                                       |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Bottom nav: exactly 3 entries                              | PASS — Dashboard / Properties / Settings at lines 63-112 of `layout.tsx`                                                     |
| Side nav: exactly 3 entries                                | PASS — mirrors bottom nav at lines 115-127                                                                                   |
| Settings page: 3 sections (Profile / Documents / Security) | PASS — sections confirmed at `app/landlord/settings/page.tsx`                                                                |
| Property detail: `payments` tab present                    | PASS — `Tab` union includes `'payments'`, tab bar entry at line 308, content block at line 671 of `PropertyDetailClient.tsx` |
| `/landlord/payments/page.tsx`: redirect only, <50 lines    | PASS — 34 lines, server redirect to first property `?tab=payments` or `/landlord/properties`                                 |
| Beta sims registry: exactly 3 entries                      | PASS — `reset_test_account`, `simulate_overdue_payment`, `simulate_contract_expiring_60d`                                    |
| `BugReportButton.tsx`: `bg-red-600` present                | PASS — line 117                                                                                                              |
| `BugReportButton.tsx`: no `lucide-react` import            | PASS — no import found                                                                                                       |

---

## PO Manual Click-Path Checklist

After SS reports green, PO runs the following interactive sweep:

- [ ] Landlord bottom bar shows exactly 3 tabs: Dashboard / Properties / Settings
- [ ] Dashboard has no Recent Activity panel, no maintenance icons; 3 Dashboard A cards still present (Unpaid Rent, Active Properties, Contracts Expiring)
- [ ] Navigating to a property shows a new Payments tab between Contracts and Maintenance
- [ ] Payments tab shows only this property's payments in 3 buckets: Due / Future / Completed
- [ ] Mark-as-paid still triggers `window.confirm` double-confirm dialog
- [ ] Direct URL `/landlord/payments` server-redirects to first property with `?tab=payments`
- [ ] Direct URL `/landlord/payments` with no properties → redirects to `/landlord/properties`
- [ ] Direct URL `/landlord/notifications/inbox` returns 404
- [ ] Direct URL `/landlord/notifications/rules` returns 404
- [ ] Settings page shows Profile + Documents + Security as three distinct sections
- [ ] Documents section shows a "Manage documents →" link card to `/landlord/documents`
- [ ] Security section renders inline SecuritySettings component
- [ ] Bottom-right floating Bug Report button is red (not charcoal/saffron)
- [ ] Bug Report button uses a bug icon (Lucide Bug path, visually identical)
- [ ] Bug button hover → `bg-red-700` transition; click → panel opens; submit → auto-closes after 2s
- [ ] Beta Sims floating button shows exactly 3 actions: Reset test account, Simulate overdue payment, Simulate contract expiring
- [ ] EN ↔ TH toggle works on Settings sections, Payments tab, and beta sim labels
- [ ] No new user-facing surface mentions "maintenance"
- [ ] Desktop side nav shows only 3 entries (Dashboard / Properties / Settings)
- [ ] Direct URL `/landlord/analytics` still resolves (orphan route, not deleted)
- [ ] Direct URL `/landlord/billing` still resolves (orphan route, not deleted)
- [ ] Direct URL `/landlord/penalties` still resolves (orphan route, not deleted)

After click-path passes:

- [ ] Run beta sim "Simulate contract expiring" → trigger daily cron → confirm `lease_expiry` notification row in Supabase `notifications` table with correct `contract_id` and `landlord_id`
- [ ] Run "Simulate overdue payment" → trigger cron → confirm `payment_penalty` notification row appears

---

## Deviations from Plan

### 1. FF — Documents section: link card fallback (sanctioned by plan)

`app/landlord/settings/page.tsx` renders a link card for Documents rather than inlining `DocumentsClient` directly. `DocumentsClient` requires server-fetched props, making direct inline embedding into this `'use client'` settings page architecturally awkward. The plan explicitly sanctioned this fallback: "Prefer inline; fall back to link only if inlining breaks layout." The link card routes to `/landlord/documents` with a "Manage documents →" CTA. Locale keys `settings.manage_documents` added as specified.

### 2. JJ — Inline SVG instead of `lucide-react` import

The plan specified `import { Bug } from 'lucide-react'` in `BugReportButton.tsx`. `lucide-react` is not in `package.json` (the plan's Phase 0 instruction to "confirm package.json has it" was not acted on). JJ correctly avoided adding a new dependency by inlining the Lucide Bug path data directly into the SVG element. This preserves the plan constraint "no new npm deps" and produces visually identical output. Zero `lucide-react` imports confirmed across the entire codebase.

### 3. SS — Dashboard lint cleanup: no action required

The task briefing indicated `totalPropertyCount` and `stats` were dead variables left in `dashboard/page.tsx` by Team GG's Recent Activity removal. On inspection, the delivered file contains neither variable. GG cleaned up correctly on delivery — SS took no action on this file.

### 4. II — zh.json locale update (beyond plan scope)

The plan specified locale updates for `en.json` and `th.json` only. Team II additionally updated `zh.json` with the 60-day string for `notifications.lease_expiry_desc` ("租约到期前 60 天通知。"). This is a beneficial deviation — it keeps all three supported locales (EN/TH/ZH-CN) consistent and avoids a stale "30 days" in Chinese. No regression.

### 5. JJ — zh.json locale: no action taken

The task briefing listed "Team JJ touching zh.json" as a deviation to report. SS confirmed JJ did NOT add `beta.simulations.*` keys to `zh.json` — only `en.json` and `th.json` were updated. Chinese locale lacks the 6 new beta simulation keys. This is a minor gap; zh.json falls back gracefully in the i18n layer. Tracked as follow-up item below.

---

## Follow-Up Items

### HIGH — Dashboard A "Contracts Expiring" card: 30-day vs 60-day alignment

The Dashboard A card computes `contractsExpiring30Days` against a 30-day window (`thirtyDaysLaterStr` in `page.tsx` line 192). The cron now fires `lease_expiry` at 60 days (Team II). The card label says "within next 30 days" (`dashboard.card_contracts_expiring_sub` in `en.json`/`th.json`). This is a user-visible inconsistency: the notification fires at 60 days but the card only shows contracts expiring in 30 days.

**Fix required (next sprint):**

1. In `page.tsx`: rename `contractsExpiring30Days` → `contractsExpiring60Days`, update `DashboardACards` interface, widen the filter to use `sixtyDaysLaterDate` (already computed at line 104 for the `renewalsNearingExpiry` count — reuse it).
2. In `DashboardClient.tsx`: update prop reference `dashboardA.contractsExpiring30Days` → `contractsExpiring60Days`.
3. In `locales/en.json`: `dashboard.card_contracts_expiring_sub` → "within next 60 days".
4. In `locales/th.json` + `locales/zh.json`: same string update.
   This is a 5-line fix deferred from this sprint per the plan's explicit deferred list.

### MEDIUM — zh.json missing beta simulation keys

`locales/zh.json` lacks the 6 `beta.simulations.*` keys added by JJ. The i18n fallback prevents a crash but Chinese-locale users see untranslated keys in the Beta Sims panel (dev-only, `NEXT_PUBLIC_BETA_SIMULATIONS=true` gate). Add translations in the next locale pass.

### MEDIUM — Tenant-side cleanup sprint

Tenant-side maintenance and notification surfaces remain untouched per plan scope:

- `TenantShell.tsx` — may still reference maintenance nav
- Tenant dashboard — may still show maintenance items
- Tenant onboarding copy
- Tenant notification settings

Scope a dedicated follow-up sprint targeting `app/tenant/**`.

### LOW — Orphan route cleanup

The following routes are no longer reachable via any nav link but remain as valid pages (kept per plan constraints):

- `/landlord/analytics`
- `/landlord/billing` and `/landlord/billing/slots` and `/landlord/billing/upgrade`
- `/landlord/penalties` and `/landlord/penalties/rules`
- `/landlord/profile`
- `/landlord/documents` (linked from Settings fallback card)
- `/landlord/security` (used inline in Settings)

Consolidate or delete in a later cleanup sprint once Omise billing is wired.

### LOW — `NotificationType` union cleanup

Types `renewal_signing_reminder`, `tier_expiry_warning`, `tier_downgraded`, `maintenance_raised`, `penalty_appeal` remain in `lib/notifications/send.ts` `NotificationType` union. No `send()` calls reference them from the cron path. A second pass can remove them once all UI references are confirmed dead. Do not remove until tenant-side cleanup sprint completes (tenant notification settings may typecheck against these).

### LOW — `/landlord/notification-rules` API

`/api/notification-rules` and `/api/notification-rules/[id]` endpoints remain active (both appear in the build route table). These are orphaned from the deleted notification rules UI. Keep until NotificationType union cleanup confirms no active consumers.

---

_Report generated by Team SS on 2026-04-11._
