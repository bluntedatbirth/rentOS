# rentOS "Three Things" Scope Cut — Plan Summary for PO

**Date:** 2026-04-11
**Teams:** three-things-plan (5 agents)
**Status:** **PLAN COMPLETE. AWAITING PO REVIEW. NO CODE CHANGED.**
**Rollback branch (proposed):** `scope-cut/three-things` off `audit-fix-sprint`

---

## TL;DR

Five planning agents (3 tech, 2 website) have produced a complete, reversible plan to cut rentOS down to three things — Properties, Payments, Contracts — before the 5-landlord validation cohort. No code has been deleted. No schema has been dropped. Every hidden feature is gated by a clearly named env var with default OFF in prod and ON in dev. Flipping any flag back ON is a one-click Vercel env change + redeploy.

**Six items need your decision before execution** (one gate at the bottom of this document).

**Recommended hero for the landing rewrite:** Variant 3 (Thai-first / culturally warm), **with a Variant 1 fallback** if the Thai copy hasn't been reviewed by a native speaker in time for the validation session. This is the only design risk the team flagged.

**Recommended dashboard variant:** See `tech-dashboard-mockups.md` — the mockup agent's recommendation is inside.

---

## The five planning docs (your reading list)

All under `sprint-reports/three-things/`:

| #   | File                         | Owner                  | What's in it                                                                                                 |
| --- | ---------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| 1   | `tech-inventory.md`          | tech-inventory-lead    | Every route/page/component labeled KEEP/HIDE/DELETE (144 items), schema freeze (17 tables), click-path tests |
| 2   | `tech-flags-nav-rollback.md` | tech-flags-architect   | Feature flag plan (11 flags), nav restructure per role, rollback strategy + CI flag-health check             |
| 3   | `tech-dashboard-mockups.md`  | tech-dashboard-mockups | 3 static dashboard mockups (A/B/C) + 1 tenant dashboard mockup                                               |
| 4   | `website-copy.md`            | web-copy-lead          | EN + TH hero/feature/pricing/trust copy, 3 hero alternatives                                                 |
| 5   | `website-mockups.md`         | web-design-mockups     | 3 static landing hero TSX mockups + parity audit                                                             |

**This file** is the synthesis + decision gate. Read this first, then open whichever source doc you want to dig into.

---

## Inventory headline numbers

From `tech-inventory.md`:

- **144 items inventoried** across landlord, tenant, public, admin, API, gating components
- **83 KEEP** (57%)
- **61 HIDE** (43%)
- **0 DELETE** (the audit sprint already deleted PromptPay portal, `/api/dev/*`, dead files)
- **6 ambiguous** (listed below under "Decisions needed")

**Schema freeze:** 17 tables — 5 ACTIVE, 12 FROZEN, 0 ORPHAN. Every hidden feature's table stays. Profile columns tied to hidden features (`pro_tier`, `founding_member`, `slots_purchased`, etc.) are preserved with no drops.

**Surprise caught:** `app/auth/reset-password/page.tsx` was originally missing from the inventory — it lives outside `(public)/` and handles Supabase recovery tokens. Inventory patched, marked KEEP.

---

## Feature flag plan at a glance

From `tech-flags-nav-rollback.md`:

**11 flags, all default FALSE in prod, TRUE in dev** (dev keeps all hidden features testable). Read pattern is mixed — server-only for API routes and server components, `NEXT_PUBLIC_` twin only for flags that also gate nav links or client-side renders. One helper in `lib/features.ts` exposes two typed functions so callers can't read a server var in a client component.

| Flag                          | Default | Gates                                                                                                      |
| ----------------------------- | ------- | ---------------------------------------------------------------------------------------------------------- |
| `FEATURE_CONTRACT_QA`         | OFF     | `/api/contracts/[id]/qa` + QA tab in contract detail                                                       |
| `FEATURE_CONTRACT_COMPARISON` | OFF     | `/api/contracts/compare` + compare panel                                                                   |
| `FEATURE_CONTRACT_GENERATE`   | OFF     | `/landlord/contracts/create`, `/landlord/contracts/templates`, generate/templates API — **flagged for PO** |
| `FEATURE_CONTRACT_ANALYZE`    | OFF     | `/api/contracts/[id]/analyze` (renewal + suggest-clauses are downstream)                                   |
| `FEATURE_PENALTIES`           | OFF     | `/landlord/penalties/**`, `/tenant/penalties/**`, all penalty API, penalty-rules API                       |
| `FEATURE_TM30`                | OFF     | `/landlord/documents/tm30/page.tsx`, `/api/tm30/generate`                                                  |
| `FEATURE_SLOT_PURCHASE`       | OFF     | Slot packs pages, `/api/billing/slots/*`, PostSlotProUpsellModal                                           |
| `FEATURE_PRO_TIER`            | OFF     | `/landlord/billing/**`, `UpgradePrompt`, `ProBadge`, `ProRibbon`, Pro checkout API                         |
| `FEATURE_NOTIFICATION_RULES`  | OFF     | `/landlord/notifications/rules`, notification rule API                                                     |
| `FEATURE_ZH_LOCALE`           | OFF     | Language switcher filters out `zh-CN` option client-side; zh.json files stay in repo                       |
| `FEATURE_ANALYTICS_FULL`      | OFF     | `/landlord/analytics`, beyond-3-cards analytics endpoints                                                  |

**Behavior when OFF:**

- API routes → HTTP 404 (not 403 — intentional, so scanners don't confirm the feature exists)
- Page routes → `notFound()` from `next/navigation`
- Nav links → filtered out of the array
- Reusable components (UpgradePrompt, ProBadge, ProRibbon) → return `null`
- Language switcher → filter `'zh-CN'` client-side

**Surprise caught:** `ProBadge`, `ProRibbon`, and `UpgradePrompt` are three separate components that each must check `FEATURE_PRO_TIER` — no shared gate. Implementation sprint needs to touch all three.

---

## Nav restructure at a glance

From `tech-flags-nav-rollback.md` §2:

**Landlord nav after cut:** Dashboard · Properties · Contracts · Payments · Notifications · Settings · Sign Out

REMOVED (moved to flags): Penalties · TM30 · Billing · Slot purchase · Analytics (beyond dashboard) · Maintenance · Documents · Contract Templates · Contract Create

**Tenant nav after cut:** Dashboard · My Contract · Payments · Notifications · Settings · Sign Out

REMOVED: Penalty appeal · Maintenance (pending PO decision) · ZH option in language switcher (ZH files stay, option hidden)

**Flag for PO:** maintenance module — tech-inventory-lead defaulted it to HIDE, flagged for PO decision. See "Decisions needed" below.

---

## Rollback strategy summary

From `tech-flags-nav-rollback.md` §3:

1. **Branch:** `scope-cut/three-things` off `audit-fix-sprint` (current merged audit-fix branch).
2. **Re-enable a feature:** Vercel dashboard → Environment Variables → set `FEATURE_X=true` → redeploy → run the owning click path from `verification-checklist.md` → if broken, set back to `false` (1 click, ~60 seconds).
3. **CI flag-health check:** GitHub Actions workflow that runs `npx tsc --noEmit` and `npm run build` with **every flag set to true**, on every PR. Catches rotting hidden features before a real re-enable. Sketched as a 10-line workflow in the flags doc.
4. **Tests for hidden features:** stay in `tests/`, use `describe.skipIf(!process.env.FEATURE_X)` so CI doesn't fail when the flag is OFF but the tests are preserved and re-runnable.

---

## Website rewrite at a glance

**Landing copy** (from `website-copy.md`) — 3 hero alternatives:

1. **Utility-first** — "Track rent. Manage contracts. Nothing else." / "ติดตามค่าเช่า จัดการสัญญา แค่นั้นเอง"
2. **Emotional** — "Stop guessing when leases expire." / "หยุดเดาว่าสัญญาเช่าจะหมดเมื่อไหร่"
3. **Landlord-first / free angle** — "Free tools for Thai landlords." / "เครื่องมือฟรีสำหรับเจ้าของที่พักในไทย"

**copywriter's recommendation:** see `website-copy.md` §1 — I have not seen their top pick explicitly in the agent report, but the copy doc is the source of truth.

**Feature section** — exactly 3 blocks (Properties → Payments → Contracts), 2-sentence body each, icon suggestions, no AI buzzwords, no Pro/PromptPay/TM30 mentions.

**Pricing section** — "Free for landlords." — no Pro tier copy, no founding-member copy.

**Trust section** — 3 factual signals (data stays in Thailand, you own your data, tenants never see your ledger without permission). No testimonials (we have none).

**Locales** — EN + TH only. ZH copy paused (same flag as app).

**Thai copy disclaimer** — the copywriter explicitly flagged that Thai strings are AI-assisted and need native-speaker review before going live.

**Acquisition hook placement** — "Free for landlords" is within one screen at every scroll depth (hero CTA → sticky header → feature section → pricing headline → footer).

---

## Landing visual mockups at a glance

From `website-mockups.md`:

3 hero mockup variants, all mobile-first:

1. **Minimal utility** — centered headline, one CTA, line-drawing illustration. Safe choice.
2. **Split screen** — headline/CTA left, static 3-card dashboard screenshot right.
3. **Thai-first / culturally warm** — Thai headline dominant, English subhead smaller, saffron line-art Thai house motif.

**Web-design-mockups recommends Variant 3** (Thai-first) as the validation-optimal choice — warmest cultural fit for 5 Thai landlords.

**Fallback:** If the Thai copy has not been reviewed by a native speaker before the validation session, **fall back to Variant 1** (minimal utility). Placeholder Thai copy in Variant 3 actively backfires if it's wrong. This is the single biggest design risk flagged by the team.

**Parity audit:** 4 FAILs found against the current `app/page.tsx` landing:

1. Colors — hardcoded hex values instead of Tailwind `saffron-500`/`charcoal-900`/`warm-50` tokens
2. Spacing — inline `padding` / `margin` instead of Tailwind `p-4`/`p-6` idioms
3. Typography — partial; DM Sans loaded but landing drops in system-sans in places
4. Button hover state — no `hover:` class transition, static saffron

Each FAIL has a one-line fix in the mockups doc.

---

## Click-path test list (for PO phone testing)

From `tech-inventory.md` §3. Covers every KEEP feature, UI-only per project convention. Structure:

**Landlord paths:** sign up, sign in, language toggle EN↔TH, create property (with photo compression verify), edit/delete property, upload contract PDF → OCR → view clauses, reparse contract, view contract detail, lease expiry banner ≤30 days, generate pairing code, mark payment paid, dashboard shows exactly 3 cards, spot-check hidden feature 404 (`/api/contracts/compare`).

**Tenant paths:** sign up, sign in, pair with landlord code, view contract detail, click "I've paid" → landlord sees pending-confirm, view payment list, lease expiry banner, language toggle EN↔TH.

Each path has explicit click-level steps, one action per line, no CLI or curl. PO runs these on her phone after each implementation sprint stage.

---

## Decisions needed from PO (THE GATE)

The plans are done. Execution cannot start until you approve or reject each of the six items below and any consistency concerns across plans.

### 1. `/api/contracts/generate` + `/landlord/contracts/create` — HIDE or KEEP?

**Default in plan:** HIDE (behind `FEATURE_CONTRACT_GENERATE`).

**The question:** do you want Thai landlords to be able to _generate_ a plain (non-AI) contract template in the app as part of the core three things? Or is "upload existing contract → OCR → view" enough for validation? If you hide this, landlords must arrive with a paper lease already signed.

**Recommendation:** HIDE for validation — the five landlords already have existing leases with real tenants. We learn more from "does OCR work on their actual paperwork" than from "can we generate a template for them." Re-enable after validation if they ask for it.

**Decide:** HIDE / KEEP

---

### 2. Maintenance module (landlord + tenant) — HIDE or KEEP?

**Default in plan:** HIDE (behind `FEATURE_MAINTENANCE`).

**The question:** maintenance request submission (tenant) + review (landlord) is a functional feature that recently got a detail modal shipped last sprint. It's not in the three-things KEEP list, but it is _small, functional, and landlords genuinely ask for it_.

**Recommendation:** HIDE for the initial validation cohort. Purpose of the cut is to force the core loop (Properties, Payments, Contracts) to carry the validation signal. If we leave maintenance in, the signal gets muddled — landlords might say "I like it" because of maintenance, not the core loop. Re-enable if one of the 5 landlords explicitly asks for it.

**Decide:** HIDE / KEEP

---

### 3. Co-tenants feature — HIDE or KEEP?

**Default in plan:** HIDE (no dedicated flag cluster yet — would add `FEATURE_CO_TENANTS`).

**The question:** contracts with multiple tenants on one lease. The data model supports it, some routes handle it. For a 5-landlord validation cohort, most leases are probably single-tenant.

**Recommendation:** HIDE for validation. Single-tenant contracts simplify the click paths. If a landlord brings a joint lease, we handle it manually off-platform. Re-enable if it's the #1 request.

**Decide:** HIDE / KEEP

---

### 4. `PricingToggle` component on landing page — leave or remove from composition?

**Default in plan:** remove from landing composition (keep file on disk). The PricingToggle toggles monthly/yearly Pro pricing — it's misleading to show it while the whole Pro tier is hidden.

**Recommendation:** remove from composition. File stays, gated by `FEATURE_PRO_TIER` at render time.

**Decide:** REMOVE / LEAVE

---

### 5. `/api/debug/auth-state/route.ts` — DELETE outright?

**Default in plan:** proposed DELETE. Not removed by the audit sprint. No legitimate user-facing purpose — it returns session internals.

**Recommendation:** DELETE. Same risk profile as the `/api/dev/*` routes that were deleted in audit 0-E. Single-line route, low risk, high cleanup value.

**Decide:** DELETE / KEEP

---

### 6. Hero variant choice

**Default in plan:** Variant 3 (Thai-first) — if Thai copy is native-speaker reviewed in time. Otherwise Variant 1 (minimal utility).

**The question:** will you have a native Thai speaker review the hero copy before the validation session? If yes, Variant 3. If no, Variant 1. If unclear, default to Variant 1 and we un-risk.

**Decide:** V1 / V2 / V3 (+ note on Thai review status)

---

## Consistency check: landing ↔ app

The copywriter and the app tech plans were verified against each other. No orphaned feature promises:

- Landing mentions ONLY properties / payments / contracts → app KEEPs ONLY properties / payments / contracts. ✅
- Landing has NO AI Q&A / clause compare / TM30 / PromptPay / penalty / Pro tier copy → all gated in app. ✅
- Landing pricing section is "Free for landlords" → app billing UI gated behind `FEATURE_PRO_TIER`. ✅
- Landing has EN + TH only → app language switcher filters ZH. ✅
- Landing uses "People First" design language → app dashboard mockups use same language. ✅ (with 4 parity FAILs in the existing landing that the implementation sprint will fix)

**One thing to verify on your side:** the landing page and the 3-card dashboard should _feel_ like the same product when seen side-by-side on a phone. The mockup agent's recommendation is to preview Variant 3 hero alongside the recommended dashboard mockup before approving — spend 5 minutes with both on a phone.

---

## What happens after you sign off

Once you approve items 1–6 and confirm no orphan concerns:

1. Create `scope-cut/three-things` branch off `audit-fix-sprint` (after merging audit-fix to master first, or branch from audit-fix directly — your call).
2. Spawn a new **execution** team (NOT this planning team). Members: one engineer per workstream in isolated worktrees (per last sprint's lesson — `isolation: "worktree"` on every Agent spawn).
3. Execution order:
   - **Workstream A** (tech): create `lib/features.ts`, gate all 11 flag clusters, touch nav components, add `notFound()` guards, add the CI flag-health workflow.
   - **Workstream B** (dashboard): implement the chosen dashboard mockup variant on the real landlord dashboard, wire to Supabase counts.
   - **Workstream C** (landing): implement the chosen hero variant on `app/page.tsx`, drop in real EN + TH copy, fix the 4 parity failures.
   - **Workstream D** (verification): run every click path in `tech-inventory.md` §3 on a phone, file any regressions as P0.
4. Gate at PO phone verification. GREEN → merge → deploy → 5-landlord validation.

**None of the above starts until you sign off on items 1–6.**

---

## Meta: what this plan did NOT do

- No code changes
- No schema drops or migrations written
- No flag implementation (just the plan + signatures)
- No new tests
- No real copy dropped into `app/page.tsx`
- No Tailwind config changes
- No git branches created
- No env var changes in Vercel

Every one of those is deferred to the execution sprint, which starts only after PO sign-off.
