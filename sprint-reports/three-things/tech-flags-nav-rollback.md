# Three-Things Scope Cut — Feature Flags, Nav Restructure & Rollback Strategy

**Date:** 2026-04-11  
**Branch target:** `scope-cut/three-things` off `audit-fix-sprint`  
**Scope:** Plan only — no code changes.

---

## 1. Feature Flag Plan

### Read Pattern Decision

Use a **mixed strategy**:

- **Server-side** (`process.env.FEATURE_X === 'true'`): API route handlers and page server components. No `NEXT_PUBLIC_` prefix — these flags never need to reach the browser bundle.
- **Client-side** (`process.env.NEXT_PUBLIC_FEATURE_X === 'true'`): Nav components (`LandlordLayout`, `TenantShell`) and any conditional client render (language switcher options, `UpgradePrompt`, `ProBadge`, `PostSlotProUpsellModal`).

Flags that gate both a page route AND a nav link need **both** forms — one server var for the page guard, one `NEXT_PUBLIC_` var for the client nav. Rather than declaring the same flag twice, the helper exposes a dual-read function.

**Helper location:** `lib/features.ts`

```ts
// Signatures only — implementation deferred to implementation sprint

/** Server-only: call from API route handlers and server page components */
export function isFeatureEnabled(flag: ServerFeatureFlag): boolean;

/** Client-safe: call from client components (nav, conditional UI) */
export function isFeatureEnabledClient(flag: ClientFeatureFlag): boolean;
```

`ServerFeatureFlag` is a union of the `FEATURE_*` env var names (without `NEXT_PUBLIC_` prefix).  
`ClientFeatureFlag` is a union of the `NEXT_PUBLIC_FEATURE_*` env var names.  
The types keep callers from accidentally reading a server var in a client component at compile time.

### Behavior When Flag is OFF

| Surface                                                                         | Behavior                                                                                           |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| API route handler                                                               | `return new Response(null, { status: 404 })` at top of handler                                     |
| Page route (server component)                                                   | `import { notFound } from 'next/navigation'; notFound();` at top of component                      |
| Nav link                                                                        | Filter the item from the `sideNavItems` / `bottomNavItems` / `moreSheetItems` arrays conditionally |
| Reusable component (UpgradePrompt, ProBadge, PostSlotProUpsellModal, ProRibbon) | `if (!isFeatureEnabledClient('NEXT_PUBLIC_FEATURE_PRO_TIER')) return null;`                        |
| Language switcher ZH option                                                     | Filter `'zh-CN'` from the locale option list client-side                                           |

**Why 404 not 403?** Returning 403 confirms that the resource exists and the caller is simply not authorized — it leaks surface area to automated scanners and curious users. 404 is indistinguishable from a route that was never deployed. Since these features are temporarily hidden (not permission-gated per user), 404 is correct: from the client's perspective, the endpoint does not exist in this deployment.

### Flag Table

| Flag (server)                 | NEXT*PUBLIC* client twin?                | Dev default | Prod default | Gated pages                                                                                     | Gated API endpoints                                                                                                                                                                                                                      | Gated nav items                                                                      | Gated components                                                            | Notes                                                                                                                                                                                                                    |
| ----------------------------- | ---------------------------------------- | ----------- | ------------ | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `FEATURE_CONTRACT_QA`         | No (no nav entry)                        | `false`     | `false`      | —                                                                                               | `GET/POST /api/contracts/[id]/qa`                                                                                                                                                                                                        | —                                                                                    | QA tab/panel inside contract detail page                                    | QA UI embedded in contract detail — gate the tab render client-side too                                                                                                                                                  |
| `FEATURE_CONTRACT_COMPARISON` | No                                       | `false`     | `false`      | —                                                                                               | `POST /api/contracts/compare`                                                                                                                                                                                                            | —                                                                                    | Compare button/panel                                                        | `lib/claude/compareContracts.ts` backs this                                                                                                                                                                              |
| `FEATURE_CONTRACT_GENERATE`   | `NEXT_PUBLIC_FEATURE_CONTRACT_GENERATE`  | `false`     | `false`      | `app/landlord/contracts/create/page.tsx`, `app/landlord/contracts/templates/page.tsx`           | `POST /api/contracts/generate`, `GET/POST /api/contract-templates`, `GET/PUT/DELETE /api/contract-templates/[id]`                                                                                                                        | Contracts → Create / Templates sub-items (if any)                                    | Generate button in contract flow                                            | **Flag for PO discussion** per brief                                                                                                                                                                                     |
| `FEATURE_CONTRACT_ANALYZE`    | No                                       | `false`     | `false`      | —                                                                                               | `POST /api/contracts/[id]/analyze`                                                                                                                                                                                                       | —                                                                                    | Analyze button/panel in contract detail                                     | `lib/claude/suggestClauses.ts` + `lib/claude/extractContract.ts` are shared with OCR — do NOT gate extract/reparse, only analyze                                                                                         |
| `FEATURE_PENALTIES`           | `NEXT_PUBLIC_FEATURE_PENALTIES`          | `false`     | `false`      | `app/landlord/penalties/**`, `app/landlord/penalties/rules/page.tsx`, `app/tenant/penalties/**` | `GET/POST /api/penalties`, `GET/PUT/DELETE /api/penalties/[id]`, `POST /api/penalties/[id]/appeal`, `GET/POST /api/penalty-rules`, `GET/PUT/DELETE /api/penalty-rules/[id]`, `POST /api/penalties/calculate`, `POST /api/bulk/penalties` | Landlord: Penalties (More sheet + sidebar); Tenant: Penalties (More sheet + sidebar) | —                                                                           | All three penalty lib files (`calculatePenalty.ts`) are backed by this flag                                                                                                                                              |
| `FEATURE_TM30`                | `NEXT_PUBLIC_FEATURE_TM30`               | `false`     | `false`      | `app/landlord/documents/tm30/page.tsx`                                                          | `POST /api/tm30/generate`                                                                                                                                                                                                                | Landlord: TM30 link within Documents (if surfaced as sub-item)                       | TM30 button/link in Documents page                                          | Documents page itself stays KEEP; only TM30 sub-page is hidden                                                                                                                                                           |
| `FEATURE_SLOT_PURCHASE`       | `NEXT_PUBLIC_FEATURE_SLOT_PURCHASE`      | `false`     | `false`      | `app/landlord/billing/slots/page.tsx`                                                           | `POST /api/billing/slots/checkout`, `POST /api/billing/slots/callback`                                                                                                                                                                   | Billing → Slots Purchase sub-item                                                    | `PostSlotProUpsellModal` (return null)                                      | Billing overview page at `/landlord/billing` stays visible (gated separately by `FEATURE_PRO_TIER`)                                                                                                                      |
| `FEATURE_PRO_TIER`            | `NEXT_PUBLIC_FEATURE_PRO_TIER`           | `false`     | `false`      | `app/landlord/billing/page.tsx`, `app/landlord/billing/upgrade/page.tsx`                        | `POST /api/billing/checkout`, `POST /api/billing/cancel`, `GET /api/billing/status`                                                                                                                                                      | Landlord: Billing (More sheet + sidebar)                                             | `UpgradePrompt`, `ProBadge`, `ProRibbon` (return null); Pro badge in header | **Surprise:** `ProBadge`, `ProRibbon`, and `UpgradePrompt` are three separate components that must each check this flag — they do not share a single gate                                                                |
| `FEATURE_NOTIFICATION_RULES`  | `NEXT_PUBLIC_FEATURE_NOTIFICATION_RULES` | `false`     | `false`      | `app/landlord/notifications/rules/page.tsx`                                                     | —                                                                                                                                                                                                                                        | Notifications → Rules sub-item (if any)                                              | Rules link inside notifications page                                        | Notifications inbox itself is KEEP; only the rules configurator is hidden. Two hardcoded defaults (`payment_due` + `lease_expiry`) replace the rule engine                                                               |
| `FEATURE_ZH_LOCALE`           | `NEXT_PUBLIC_FEATURE_ZH_LOCALE`          | `false`     | `false`      | —                                                                                               | —                                                                                                                                                                                                                                        | ZH option in language switcher                                                       | Language switcher ZH option filtered client-side                            | **Both a client and server concern:** the `setLocale`/`getLocale` server path in `lib/i18n/` should ignore `zh-CN` when flag is OFF; client switcher filters the option. Existing `th`↔`en` cycle becomes the only cycle |
| `FEATURE_ANALYTICS_FULL`      | `NEXT_PUBLIC_FEATURE_ANALYTICS_FULL`     | `false`     | `false`      | `app/landlord/analytics/page.tsx`                                                               | `GET /api/analytics`                                                                                                                                                                                                                     | Landlord: Analytics (More sheet + sidebar)                                           | —                                                                           | The 3-card dashboard summary stays KEEP — only the full analytics drill-down page + API are hidden                                                                                                                       |

### Summary: flags needing BOTH server and client twins

- `FEATURE_CONTRACT_GENERATE` — page guard (server) + nav/button conditional (client)
- `FEATURE_PENALTIES` — page guard (server) + nav item removal (client)
- `FEATURE_TM30` — page guard (server) + TM30 button in Documents page (client)
- `FEATURE_SLOT_PURCHASE` — API guard (server) + modal/button suppression (client)
- `FEATURE_PRO_TIER` — page/API guard (server) + nav item + 3 components suppressed (client)
- `FEATURE_NOTIFICATION_RULES` — page guard (server) + rules link suppression (client)
- `FEATURE_ZH_LOCALE` — locale ignore (server) + switcher filter (client)
- `FEATURE_ANALYTICS_FULL` — page/API guard (server) + nav item removal (client)

---

## 2. Nav Restructure

### Landlord Nav (after scope cut)

**Desktop sidebar (`app/landlord/layout.tsx` → `sideNavItems`):**

```
Dashboard          (/landlord/dashboard)
Properties         (/landlord/properties)           [KEEP]
Contracts          (/landlord/contracts)            [KEEP — added, currently missing from sidebar]
Payments           (/landlord/payments)             [KEEP]
Notifications      (/landlord/notifications/inbox)  [KEEP — badge]
Settings           (/landlord/settings)             [KEEP]
Sign Out           (button)                         [KEEP]

— REMOVED —
Analytics          gated by FEATURE_ANALYTICS_FULL
Maintenance        (no mention in KEEP list — see flag proposal below)
Documents          (TM30 sub-page gated; full Documents page: see flag proposal)
Penalties          gated by FEATURE_PENALTIES
Billing            gated by FEATURE_PRO_TIER
Profile            (merge into Settings or keep as isolated page — not in KEEP list)
Security           (not in KEEP list — keep as standalone accessible page; not in nav)
```

**Mobile bottom nav (4 core tabs + More):**

```
Bottom tabs:
  Dashboard | Properties | Contracts | Payments

More sheet:
  Notifications
  Settings
  Sign Out

— REMOVED from More sheet —
  Analytics       (flag OFF)
  Documents       (flag-dependent; see note)
  Penalties       (flag OFF)
  Billing         (flag OFF)
  Profile         (not in KEEP list — omit from nav, page remains accessible by URL)
  Security        (not in KEEP list — omit from nav, page remains accessible by URL)
  Maintenance     (see flag proposal below)
```

> **Note on Contracts:** The current `sideNavItems` and `bottomNavItems` in `app/landlord/layout.tsx` do NOT include a top-level Contracts nav link — contracts are currently accessed via properties. For the three-things cut, a top-level `/landlord/contracts` entry should be added to both sidebar and bottom nav, replacing Maintenance.

### Tenant Nav (after scope cut)

**Desktop sidebar (`app/tenant/TenantShell.tsx` → `sideNavItems`):**

```
Dashboard         (/tenant/dashboard)         [KEEP]
My Contract       (/tenant/contract/view)     [KEEP]
Payments          (/tenant/payments)          [KEEP]
Notifications     (/tenant/notifications)     [KEEP]
Settings          (/tenant/settings)          [KEEP]
Sign Out          (button)                    [KEEP]

— REMOVED —
Pair              (/tenant/pair)              (pairing is setup flow, not ongoing nav — move to onboarding/settings)
Co-Tenants        (/tenant/co-tenants)        (not in KEEP list)
Documents         (/tenant/documents)         (not in KEEP list)
Penalties         (/tenant/penalties/appeal)  (gated by FEATURE_PENALTIES)
Security          (/tenant/security)          (not in KEEP list — accessible by URL, not in nav)
```

**Mobile bottom nav (4 core tabs + More):**

```
Bottom tabs:
  Dashboard | My Contract | Payments | Notifications

More sheet:
  Settings
  Sign Out

— REMOVED from More sheet —
  Pair            (move to settings/onboarding)
  Co-Tenants      (not in KEEP list)
  Documents       (not in KEEP list)
  Penalties       (flag OFF)
  Security        (not in nav)
```

**Language switcher (both shells):** ZH option filtered out when `NEXT_PUBLIC_FEATURE_ZH_LOCALE=false`. The TH↔EN toggle button remains unchanged.

### Maintenance flag proposal for PO

**Proposed default: HIDE behind `FEATURE_MAINTENANCE`.**  
Rationale: the KEEP list is explicit about what to validate (Properties, Payments, Contracts). Maintenance is a separate workflow (tenant submits request → landlord responds) that is not part of the three-things validation hypothesis. Showing it to the first five landlords risks distracting feedback away from the core loop. It is fully built and easy to re-enable with one env var flip — lower risk to defer than to include untested in validation. **PO should override to KEEP if she believes landlords will look for it.**

### Removed item counts

**Landlord:** 6 nav items removed (Analytics, Maintenance\*, Penalties, Billing, Profile, Security from nav — Documents conditionally hidden by TM30 gate only).  
**Tenant:** 5 nav items removed (Pair from main nav, Co-Tenants, Documents, Penalties, Security from nav).

---

## 3. Rollback Strategy

### Branch Name

**`scope-cut/three-things`** branched off **`audit-fix-sprint`**.

Rationale: `audit-fix-sprint` is the most recent known-good branch (all 22 audit items fixed, build + tests green per `sprint-reports/sprint-summary.md`). Branching off `master` would miss those fixes.

### Re-enabling One Feature (step-by-step)

1. **Vercel Dashboard → Project → Settings → Environment Variables**
2. Find the relevant `FEATURE_X` and/or `NEXT_PUBLIC_FEATURE_X` variable.
3. Change value from `false` to `true` for the target environment (Production or Preview).
4. Click **Save**.
5. Go to **Deployments** → click the most recent deployment → **Redeploy** (or trigger a new deploy via a push). Vercel requires a new build to pick up env var changes — it does not hot-reload them.
6. Once the deployment is live, run the relevant PO click-path from the verification checklist.
7. If broken: return to Environment Variables, set the flag back to `false`, redeploy. The previous clean deployment is available as an instant rollback target via Vercel's **Instant Rollback** button on any prior deployment.

### Flag Health Check — GitHub Actions Workflow

Create `.github/workflows/flag-health.yml`:

```yaml
name: Flag Health Check (all features ON)
on:
  push:
    branches: [scope-cut/three-things, audit-fix-sprint, master]
  schedule:
    - cron: '0 3 * * 1' # weekly Monday 03:00 UTC — catches silent rot

jobs:
  all-flags-on:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: rental-manager
    env:
      FEATURE_CONTRACT_QA: 'true'
      FEATURE_CONTRACT_COMPARISON: 'true'
      FEATURE_CONTRACT_GENERATE: 'true'
      FEATURE_CONTRACT_ANALYZE: 'true'
      FEATURE_PENALTIES: 'true'
      FEATURE_TM30: 'true'
      FEATURE_SLOT_PURCHASE: 'true'
      FEATURE_PRO_TIER: 'true'
      FEATURE_NOTIFICATION_RULES: 'true'
      FEATURE_ZH_LOCALE: 'true'
      FEATURE_ANALYTICS_FULL: 'true'
      FEATURE_MAINTENANCE: 'true'
      NEXT_PUBLIC_FEATURE_CONTRACT_GENERATE: 'true'
      NEXT_PUBLIC_FEATURE_PENALTIES: 'true'
      NEXT_PUBLIC_FEATURE_TM30: 'true'
      NEXT_PUBLIC_FEATURE_SLOT_PURCHASE: 'true'
      NEXT_PUBLIC_FEATURE_PRO_TIER: 'true'
      NEXT_PUBLIC_FEATURE_NOTIFICATION_RULES: 'true'
      NEXT_PUBLIC_FEATURE_ZH_LOCALE: 'true'
      NEXT_PUBLIC_FEATURE_ANALYTICS_FULL: 'true'
      NEXT_PUBLIC_FEATURE_MAINTENANCE: 'true'
      NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: rental-manager/package-lock.json
      - run: npm ci
      - run: npm run typecheck
      - run: npm run build
```

**Goal:** When PO wants to flip a flag ON, CI has already built the full codebase with that flag enabled within the past week. A red build here means the hidden feature has silently rotted and needs a repair sprint before it can be re-enabled — PO sees this before flipping the switch, not after.

### Test Preservation Pattern for Hidden Features

**Use `.skipIf` on the `describe` block:**

```ts
// tests/e2e/phase2-penalties.spec.ts
import { test, describe } from '@playwright/test';

const penaltiesEnabled = process.env.FEATURE_PENALTIES === 'true';

describe.skipIf(!penaltiesEnabled)('Penalties end-to-end', () => {
  // ... existing tests unchanged
});
```

**Justification:** Playwright's `describe.skipIf` (and Vitest's equivalent) skips the entire suite cleanly with a visible "skipped" count rather than silently omitting it. The tests stay in `tests/` co-located with the features they cover, they never break CI when the flag is OFF, and they run automatically the moment the flag is flipped ON (including in the flag-health workflow above where all flags are set to `true`). Alternative approaches considered:

- **Delete tests:** irreversible, defeats the "preserve" goal.
- **Separate directory `tests/hidden/`:** requires restructuring and loses co-location.
- **Custom tag/filter:** requires a test runner plugin not currently in use; `.skipIf` is built-in to both Playwright and Vitest.

The CI `flag-health.yml` workflow sets all `FEATURE_*` vars to `true`, so all `.skipIf`-guarded suites will execute in that job — ensuring hidden tests are not permanently dead weight.

---

## Surprises / Notes for PM

1. **Contracts missing from landlord nav:** The current `app/landlord/layout.tsx` has no top-level Contracts link. Contracts are only accessible via property detail. The three-things cut requires adding `/landlord/contracts` to both sidebar and bottom nav — a small but necessary nav edit.

2. **Three components share the Pro tier gate:** `UpgradePrompt`, `ProBadge`, and `ProRibbon` each independently render pro-related UI. They are three separate components with no shared gate parent — all three must check `NEXT_PUBLIC_FEATURE_PRO_TIER` independently.

3. **`lib/claude/extractContract.ts` and `suggestClauses.ts` are shared with OCR reparse:** Do not gate these with `FEATURE_CONTRACT_ANALYZE`. OCR upload + reparse (`/api/contracts/upload`, `/api/contracts/[id]/reparse`) are KEEP features. Only the analyze endpoint (`/api/contracts/[id]/analyze`) and its UI panel are gated.

4. **`app/landlord/documents/tm30/page.tsx` lives under `/documents/`:** The Documents page itself is not in the HIDE list. Only the TM30 sub-page is hidden. Gate `/landlord/documents/tm30` with `FEATURE_TM30`; leave `/landlord/documents` accessible.

5. **No existing `lib/features.ts`:** The codebase uses `process.env` reads scattered directly in components (example: `NEXT_PUBLIC_BETA_SIMULATIONS` in both shells). The new helper consolidates this pattern rather than continuing ad-hoc reads.
