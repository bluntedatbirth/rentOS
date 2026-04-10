# RentOS Pre-Launch Audit Fix Sprint — Summary

**Date:** 2026-04-11
**Team:** RentOS Fix Squad (Tech Lead + 4 Sonnet engineers)
**Branch:** `audit-fix-sprint`
**Base:** `master`
**Verdict:** **GREEN** — all 9 Phase 0 blockers fixed, all 13 Phase 1 items fixed, `npx tsc --noEmit` clean, `npm run build` clean (110 pages), `npm test` 18/18 passing.

---

## Headline

The app is no longer trivially broken. Every launch-blocker identified in `audit/pre-launch-fix-list.md` is resolved on this branch. Every Phase 1 follow-up in the same document is resolved on this branch. The minimum bar for public signup set by `audit/architecture-review.md` (nine concrete items) is met.

What this sprint did **not** do: the Phase 2 backlog in `audit/pre-launch-fix-list.md` (RSC conversion for 34 client-only pages, test coverage for billing/pairing/OCR/cron, CI pipeline, backup/runbook docs) is still open. Those are post-launch concerns — noted in `sprint-reports/phase1-remaining.md`.

---

## Phase 0 — Launch Blockers

| ID  | Item                                 | Status                            | Commit                          | Owner                        |
| --- | ------------------------------------ | --------------------------------- | ------------------------------- | ---------------------------- |
| 0-A | `.env.local` git history scan        | **verified clean** (zero matches) | (no commit)                     | Tech Lead                    |
| 0-B | Gate mock billing checkout           | **fixed**                         | `e4fa799`                       | security                     |
| 0-C | Slot callback + RLS hardening        | **fixed**                         | `d6f22d3`                       | security                     |
| 0-D | OCR ownership-before-download        | **fixed**                         | `7602774`                       | security                     |
| 0-E | Delete `app/api/dev/` + devGuard     | **fixed**                         | `3261314`                       | security                     |
| 0-F | Fail-closed middleware               | **fixed**                         | `8e4e454`                       | security                     |
| 0-G | Root + landlord + tenant `error.tsx` | **fixed**                         | `776d244` (via quality staging) | quality                      |
| 0-H | Cron HTTP 500 on errors              | **fixed**                         | `d77e8e2`                       | performance                  |
| 0-I | Delete `combined_pro_features.sql`   | **fixed**                         | `bbc5d48`                       | database (Tech Lead rescued) |

**9 / 9 Phase 0 items closed.**

## Phase 1 — High Priority

| ID            | Item                                              | Status    | Commit                | Owner       |
| ------------- | ------------------------------------------------- | --------- | --------------------- | ----------- |
| 1-A           | `getLandlordAnalytics` N+1 → single query + cache | **fixed** | `184ba2f`             | performance |
| 1-B           | Contract state invariants trigger                 | **fixed** | `38b89f9`             | database    |
| 1-C           | Remove unused `listUsers` in magic-link           | **fixed** | `1f6251b`             | security    |
| 1-D           | Bulk-prefetch cron dedup                          | **fixed** | `92dbfb2`             | performance |
| 1-E           | Gate middleware/callback diagnostic logs          | **fixed** | `147ee99`             | security    |
| 1-F           | `createServiceRoleClient()` replacement           | **fixed** | `bb9a996` + `084a384` | quality     |
| 1-G           | `updated_at` on all mutable tables                | **fixed** | `1183501`             | database    |
| 1-H           | `next/image` + Supabase transforms                | **fixed** | `776d244`             | performance |
| 1-I (DB)      | Unique partial index on `contracts(pairing_code)` | **fixed** | `e80e522`             | database    |
| 1-I (app)     | Atomic claim-the-code UPDATE                      | **fixed** | `ec71baf`             | Tech Lead   |
| 1-J (indexes) | Hot-path indexes (4 indexes)                      | **fixed** | `ab1b03e`             | database    |
| 1-K           | Exclude heavy JSONB from `GET /api/contracts`     | **fixed** | `dc3d32a`             | performance |
| 1-L           | `serverError()` for DB error messages             | **fixed** | `3a08fb3`             | quality     |
| 1-M           | Delete dead `lib/rateLimit.ts`                    | **fixed** | `8deca53`             | quality     |

**13 / 13 Phase 1 items closed.** (1-I has two commits because the audit split it into a migration half owned by the database engineer and an application half owned by security; I wrote the application half as Tech Lead cleanup.)

## Bonus items shipped

- Delete dead `lib/i18n/index.ts` + rewrite `tests/unit/i18n.test.ts` against real locale files (`51c90d5`, quality).
- Dead-code cleanup in `middleware.ts` after dev routes were deleted (`084a384`, quality followup).

---

## Build gate

```
$ rm -rf .next
$ npx tsc --noEmit                 # EXIT 0
$ npm run build                    # EXIT 0, 110 pages generated, 0 warnings
$ npm test                         # 18 passed / 18 total
```

All three gates green on the merge commit.

## Branches merged into `audit-fix-sprint`

| Branch                    | Base commit | Merge commit              |
| ------------------------- | ----------- | ------------------------- |
| `database/audit-fixes`    | `4c6b894`   | `e138e2f`                 |
| `security/audit-fixes`    | `ca50d77`   | `ae4a9f7`                 |
| `quality/audit-fixes`     | `084a384`   | `656f01a`                 |
| `performance/audit-fixes` | `94843b2`   | `d889286`                 |
| Tech Lead fixup           | —           | `ec71baf` (P1-I app side) |

Merge order was database → security → quality → performance so that overlapping files (middleware.ts, locales, next.config.mjs, migrations folder) resolved cleanly. Duplicate commits produced by cross-branch contamination (P0-F on both security and performance; P1-K/P1-H on both performance and quality; 1-M deletion on both performance and quality) all merged as no-ops because the content was identical — git's three-way merge handled it automatically.

---

## What the PO must do manually before deploy

1. **Apply new migrations in the Supabase SQL console, in this order:**
   - `20260411000003_drop_slot_purchases_user_insert.sql` (security — drops the user INSERT RLS on slot_purchases)
   - `20260411000010_contract_state_invariants.sql` (database — state trigger)
   - `20260411000011_updated_at_triggers.sql` (database — audit columns)
   - `20260411000012_pairing_code_unique_index.sql` (database — unique pairing code)
   - `20260411000013_missing_performance_indexes.sql` (database — hot-path indexes)
2. **Run the PO verification checklist** in `sprint-reports/verification-checklist.md`.
3. **Confirm Vercel env vars before deploy**:
   - `ALLOW_MOCK_CHECKOUT` **must NOT** be set to `'true'` in production. If it is set to anything other than literal string `'true'` (including unset), the mock billing checkout returns HTTP 403.
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` must be set. If either is missing, middleware now redirects all traffic to `/maintenance` (fail-closed).
4. **Make the repo private** before Omise keys are added (per project memory: repo stays public for Vercel Hobby until payment integration; Omise work unblocks after this sprint lands).

---

## Known limitations acknowledged this sprint

- **Landlord-side browser tab title** still reads the marketing line — same issue as the tenant tab title fixed in the previous sprint. Not in scope; queued as follow-up.
- **Type system is still hollow** (~50 `as unknown as T` casts). Quality engineer touched `lib/supabase/api.ts` and fixed the `serverError` leak but did not regenerate Supabase types. Tracked in `phase1-remaining.md`.
- **`sendNotification`** still does per-notification profile lookups + FCM pushes. Cron dedup batching (1-D) is the primary win; a full batch-insert path for notifications is a larger refactor.
- **Test coverage** is still F-grade. 18 tests for a 47-page app. 1-A fix has no regression test. 1-I atomic claim has no regression test. Tracked in `phase1-remaining.md`.
- **P0-G root `app/error.tsx`**: created by quality engineer and merged in via contamination through performance's 1-H commit. Content is correct but commit archaeology is messy. No action needed.

---

## Team performance notes

- **security-engineer**: 7 fixes + docs, clean branch. Fastest finisher.
- **performance-engineer**: 5 fixes + docs. Self-reported build green, confirmed. Flagged cross-branch contamination in its own sprint report — this transparency made the merge easier.
- **code-quality-engineer**: 5 fixes + 2 bonus items + docs. Touched the most files. Collaborated well with security on 1-F (the `createServiceRoleClient` replacement was split across two commits because security deleted the dev routes first).
- **database-engineer**: **stalled**. The engineer wrote all four planned migrations to disk but never committed them — the session hung on repeated `.git/index.lock` contention with the other three engineers sharing the same `.git` directory. Tech Lead rescued the untracked files and committed them with proper P1-X prefixes. Root cause is the shared-working-tree model. Next sprint should use `isolation: "worktree"` on Agent spawns to eliminate the contention entirely.

---

## Files changed (high-level)

**Created:**

- `app/error.tsx`, `app/landlord/error.tsx`, `app/tenant/error.tsx`
- `app/maintenance/page.tsx`
- `supabase/migrations/20260411000003_drop_slot_purchases_user_insert.sql`
- `supabase/migrations/20260411000010_contract_state_invariants.sql`
- `supabase/migrations/20260411000011_updated_at_triggers.sql`
- `supabase/migrations/20260411000012_pairing_code_unique_index.sql`
- `supabase/migrations/20260411000013_missing_performance_indexes.sql`
- `sprint-reports/database-fixes.md`
- `sprint-reports/security-fixes.md`
- `sprint-reports/performance-fixes.md`
- `sprint-reports/code-quality-fixes.md`
- `sprint-reports/sprint-summary.md` (this file)
- `sprint-reports/phase1-remaining.md`
- `sprint-reports/verification-checklist.md`

**Deleted:**

- `app/api/dev/` (entire directory: 10 routes)
- `lib/devGuard.ts`
- `lib/rateLimit.ts`
- `lib/i18n/index.ts`
- `supabase/migrations/combined_pro_features.sql`

**Modified (selected):**

- `middleware.ts` — fail-closed + gated logs
- `next.config.mjs` — `images.remotePatterns` for Supabase
- `lib/analytics/getLandlordAnalytics.ts` — N+1 rewrite + cache
- `app/api/cron/daily/route.ts` — bulk dedup + HTTP 500 on errors
- `app/api/ocr/route.ts` — ownership check before download
- `app/api/billing/checkout/route.ts` — mock gate
- `app/api/billing/slots/callback/route.ts` — payment verification
- `app/api/pairing/redeem/route.ts` — atomic claim-the-code
- `app/api/contracts/route.ts` — explicit column list
- `app/api/auth/magic-link/route.ts` — listUsers removed
- `components/landlord/PropertyImageGallery.tsx` — next/image
- `app/tenant/maintenance/TenantMaintenanceClient.tsx` — next/image
- `components/profile/ProfileForm.tsx` — (ProfileForm stays; no changes from this sprint)
- Various API routes using `serverError()` instead of leaking DB messages

---

## Final verdict

**Ready to deploy to Vercel after PO applies the 5 migrations above and runs the verification checklist.** Open public signup once this branch is merged to `master`, migrations applied, and the smoke test is green.
