# Phase 1 Remaining — what did NOT ship this sprint

**Date:** 2026-04-11
**Context:** The pre-launch audit-fix sprint closed all 9 Phase 0 items and all 13 Phase 1 items from `audit/pre-launch-fix-list.md`. This document lists the items from `audit/architecture-review.md` "Tech Debt to Watch" section and the broader audit that were **out of scope** and still need attention.

---

## Items explicitly deferred by the sprint brief

### PL-1 — 34 of 48 pages are fully `'use client'`

- **Source:** `audit/architecture-review.md` "Tech Debt" §4; `audit/performance-audit.md` Finding PL-1
- **Why it was deferred:** Requires converting each page from a Client Component to a Server Component with a Client child. Touches 34 files. Highest-impact UX fix on 3G but also the highest-effort. Sprint brief deferred it explicitly.
- **Recommendation:** Do in phases. Start with `/landlord/properties`, `/landlord/payments`, `/tenant/payments`, `/tenant/contract/view` (four highest-traffic pages). Dashboard pages are already correctly RSC — mirror that pattern.
- **Estimated effort:** 1–2 weeks for all 34; 2–3 days for the top four.

### Test coverage (F-grade)

- **Source:** `audit/architecture-review.md` Test Coverage = F
- **Gaps:** No tests for tenant pairing, billing/Omise webhooks, OCR pipeline, or the 640-line cron job. E2E suite asserts `toBeGreaterThanOrEqual(0)` (tautological). 16 unit tests in repo; 18 after this sprint.
- **Recommendation:** Before Omise integration, write Vitest unit tests for:
  - `lib/contracts/activate.ts` (state transitions + payment seeding bounds)
  - `lib/analytics/getLandlordAnalytics.ts` (cache behavior + single-query shape)
  - `app/api/pairing/redeem/route.ts` (atomic claim — simulate concurrent races)
  - `app/api/billing/slots/callback/route.ts` (reject null omise_charge_id)
  - Cron daily at least a smoke test per section.
- **Estimated effort:** 2–3 days for the billing + pairing tests alone.

### Type system cleanup (~50 `as unknown as T` casts)

- **Source:** `audit/code-quality-audit.md` Finding 3.1
- **Why it was deferred:** Requires running `supabase gen types typescript --linked > lib/database.types.ts`, then removing each cast and fixing the real type error it was hiding. High risk of runtime regressions if types were wrong.
- **Recommendation:** Regenerate types, then remove casts one file at a time with typecheck after each. Land as a series of small commits, not one big one.
- **Estimated effort:** 1 week.

### `sendNotification` batch path

- **Source:** This sprint's performance-fixes.md scope note
- **Issue:** Cron dedup is batched (1-D), but `sendNotification` itself still does one profile lookup + one FCM push per notification. At 100 landlords × 3 contracts, the cron still fires 300 sequential profile lookups.
- **Recommendation:** Add a `sendNotificationsBatch(notifications[])` variant that bulk-fetches all recipient profiles and does one `.insert([...])` call. Retrofit the cron to use it.
- **Estimated effort:** 1 day.

---

## Gaps the architecture review flagged but this sprint did not touch

### Backup strategy + incident runbook

- **Source:** `audit/architecture-review.md` "Operational readiness"
- **Issue:** Supabase Pro tier includes point-in-time recovery but it's not documented whether it's enabled. No runbook for cron failures, data corruption, timeouts.
- **Recommendation:** (a) Verify PITR is enabled in Supabase dashboard. (b) Write a one-page incident runbook covering: cron alerting via Vercel built-in (now works after 0-H), Supabase PITR restore steps, how to disable the app (set env var → fail-closed middleware kicks in → `/maintenance` page renders).
- **Estimated effort:** 1 day.

### PDPA compliance audit

- **Source:** `audit/architecture-review.md` "PDPA / Thai legal compliance"
- **Issues:**
  - Account delete route hard-deletes financial records; Thai commercial law requires 5-year retention.
  - No documented data-export path for data subject requests.
  - AI processing of lease contracts (Claude) has no ToS consent flow.
- **Recommendation:** This is lawyer work, not engineer work. Queue for legal review before public signup. Engineer tasks once legal lands: add a `soft_delete` path for profiles, add `/api/user/export` data dump endpoint.
- **Estimated effort:** 2 days engineering after legal reviews.

### AI spend cap at scale

- **Source:** `audit/architecture-review.md` "Abuse vectors"
- **Issue:** Anthropic API spend cap is $100/month. Free-tier users staying within rate limits can still burn the cap. At 100+ landlords this becomes likely.
- **Recommendation:** Add a per-user monthly AI-token budget enforced at the API route layer. Track in a new `user_ai_usage(user_id, month, tokens)` table. Reject calls over budget with a friendly error and an upgrade CTA.
- **Estimated effort:** 1 day.

### CI/CD pipeline

- **Source:** `audit/architecture-review.md` "Deployment pipeline"
- **Issue:** No CI. Deployments are manual Vercel pushes. No migration run check before deploy. No README with setup instructions (default Next.js boilerplate).
- **Recommendation:** Add a GitHub Actions workflow that runs `npx tsc --noEmit`, `npm run build`, `npm test` on every PR. Separate workflow for applying migrations (or document the manual SQL console process that the PO follows today).
- **Estimated effort:** Half a day for the PR checks, separate effort for the migration automation.

---

## Cosmetic follow-ups (small but noticeable)

- **Landlord browser tab title** — still reads marketing line. Same fix pattern as the tenant hardening sprint (split layout into server wrapper + client shell).
- **Error boundary localization** — current `app/error.tsx` family renders English text only; they should use `useI18n()` to render in TH/ZH.
- **Maintenance page (`/maintenance`)** — created as a fail-closed landing. Currently says "Service unavailable — configuration error." Should get TH + ZH copy.

---

## Deferred to post-launch explicitly

- **RLS-based rate limiting** for AI endpoints (currently in-memory Set, which resets on serverless cold start).
- **Magic-link perPage pagination** — 1-C removed the unused call entirely. If the use case returns, use proper pagination with a cursor.
- **`slot_purchases` → `slot_unlocks` schema cleanup** — data-model audit flagged naming inconsistency.
- **Duplicate payment row unique index** on `payments(contract_id, due_date, payment_type)` — low-risk race at 1 landlord, guaranteed hit at 50.

---

## What's **not** a follow-up (already done)

Double-checked because it's easy to assume these are open:

- `.env.local` secret leak — verified clean in git history (zero matches) at sprint start.
- Mock billing checkout — gated behind `ALLOW_MOCK_CHECKOUT='true'` (default 403).
- Slot callback RLS — user INSERT policy dropped, `omise_charge_id` required.
- OCR cross-tenant read — ownership verified before any storage call.
- Dev routes — `app/api/dev/` + `lib/devGuard.ts` deleted.
- Middleware fail-open — now redirects to `/maintenance` when Supabase env vars are missing.
- Error boundaries — `app/error.tsx`, `app/landlord/error.tsx`, `app/tenant/error.tsx` all created.
- Cron silent failure — now returns HTTP 500 when `summary.errors.length > 0`.
- `combined_pro_features.sql` — deleted.
- `lib/rateLimit.ts` — deleted.
- Analytics 12-query N+1 — single query + `unstable_cache`.
- Pairing TOCTOU — atomic UPDATE ... RETURNING + unique partial index.
- Contract state invariants — DB trigger enforces at BEFORE INSERT OR UPDATE.
- `updated_at` on mutable tables — added with triggers.
- Missing hot-path indexes — 4 indexes added.
- Property photo optimization — `next/image` + Supabase transforms.
- Heavy JSONB list select — explicit column list.
- `serverError()` leaks — `serverError()` logs internally, returns generic.
- Inline `createClient(url, key)` — replaced with `createServiceRoleClient()`.
- `listUsers` in magic-link — removed.
- Diagnostic console.log leakage — gated behind `NODE_ENV === 'development'`.
