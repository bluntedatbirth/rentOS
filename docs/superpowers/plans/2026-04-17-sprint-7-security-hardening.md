# Sprint 7 — Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop leaking internal error messages (Supabase/Anthropic) to API consumers, and make the `RATE_LIMIT_BYPASS` env var resilient to email changes.

**Architecture:** Two independent fixes: (1) plug the two error-leak points where raw `err.message` reaches the client, (2) push email-based bypass checking into `checkRateLimit()` so every rate-limited route gets it for free without per-route manual bypass logic.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase JS SDK

**Pre-flight:** No test runner is configured in this codebase. Verification is `npx tsc --noEmit` + `npx next lint` + `npx next build`. You MUST run `unset ANTHROPIC_API_KEY ANTHROPIC_BASE_URL` before any `npx`/`npm` command (the Bash tool injects a blank `ANTHROPIC_API_KEY` that breaks the dev server).

---

## File Map

| File                                         | Action          | Responsibility                                                                            |
| -------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------- |
| `lib/apiErrors.ts`                           | No change       | Already safe — `serverError()` returns `'internal_error'`, logs internally only           |
| `app/api/account/complete-profile/route.ts`  | Modify L57      | Fix: raw `error.message` sent to client via `NextResponse.json`                           |
| `app/api/ocr/route.ts`                       | Modify L447-451 | Fix: raw `err.message` sent via SSE for non-validation errors                             |
| `lib/rateLimit/persistent.ts`                | Modify          | Add `userEmail` param to `checkRateLimit`, consolidate bypass logic, add bypass audit log |
| `app/api/ocr/route.ts`                       | Modify L48-66   | Remove manual `isRateLimitBypassed` calls, pass `user.email` to `checkRateLimit`          |
| `app/api/contracts/[id]/analyze/route.ts`    | Modify L75-84   | Same: remove manual bypass, pass `user.email` to `checkRateLimit`                         |
| `app/api/contracts/compare/route.ts`         | Modify L25      | Pass `user.email` to `checkRateLimit`                                                     |
| `app/api/contracts/suggest-clauses/route.ts` | Modify L20      | Pass `user.email` to `checkRateLimit`                                                     |
| `app/api/contracts/[id]/reparse/route.ts`    | Modify L18      | Pass `user.email` to `checkRateLimit`                                                     |
| `app/api/contracts/[id]/renew/route.ts`      | Modify L112     | Pass `user.email` to `checkRateLimit`                                                     |
| `app/api/notifications/send/route.ts`        | Modify L18      | Pass `user.email` to `checkRateLimit`                                                     |
| `app/api/ai/usage/route.ts`                  | Modify L36-37   | Pass `user.email` to `checkRateLimit`                                                     |

---

### Task 1: Plug error message leak in complete-profile

**Files:**

- Modify: `app/api/account/complete-profile/route.ts:55-58`

- [ ] **Step 1: Add `serverError` import**

Open `app/api/account/complete-profile/route.ts`. It currently uses `NextResponse` directly for the 500 response. Add the `serverError` import from the shared error module:

```ts
// At top of file, add to existing imports:
import { serverError } from '@/lib/apiErrors';
```

Check if `serverError` is already imported (it may come from `@/lib/supabase/api` re-exports). If yes, skip.

- [ ] **Step 2: Replace the leaking response**

Find this block (around line 55-58):

```ts
if (error) {
  console.error('[complete-profile] insert failed', error);
  return NextResponse.json({ error: error.message }, { status: 500 });
}
```

Replace with:

```ts
if (error) {
  return serverError('[complete-profile] ' + error.message);
}
```

The `serverError()` function already does `console.error` internally and returns `{ error: 'internal_error' }` to the client. No raw Supabase message reaches the browser.

- [ ] **Step 3: Verify**

```bash
unset ANTHROPIC_API_KEY ANTHROPIC_BASE_URL && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/account/complete-profile/route.ts
git commit -m "fix(security): stop leaking Supabase error in complete-profile response

The 500 handler was returning raw error.message via NextResponse.json.
Switched to serverError() which logs internally and returns generic
'internal_error' to the client.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Plug error message leak in OCR SSE stream

**Files:**

- Modify: `app/api/ocr/route.ts:443-451`

- [ ] **Step 1: Replace raw err.message in SSE error event**

Find this block (around line 443-451):

```ts
const isValidationErr = err instanceof ContractValidationError;
if (isValidationErr) {
  send({ step: 'error', error: err.code });
} else {
  send({
    step: 'error',
    error: err instanceof Error ? err.message : 'OCR processing failed',
  });
}
```

Replace the `else` branch only — validation errors already use safe error codes:

```ts
const isValidationErr = err instanceof ContractValidationError;
if (isValidationErr) {
  send({ step: 'error', error: err.code });
} else {
  console.error('[ocr] non-validation error:', err instanceof Error ? err.message : err);
  send({ step: 'error', error: 'processing_failed' });
}
```

This logs the real error server-side for debugging, and sends a generic `'processing_failed'` code to the client. The client (`ContractParseProvider.tsx`) already handles `step: 'error'` generically — it doesn't switch on the error string.

- [ ] **Step 2: Verify**

```bash
unset ANTHROPIC_API_KEY ANTHROPIC_BASE_URL && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/ocr/route.ts
git commit -m "fix(security): stop leaking Anthropic error messages in OCR SSE stream

Non-validation errors were sending raw err.message to the client via
the SSE event payload. Now logs internally and sends generic
'processing_failed' code. Validation errors still use their safe
err.code (e.g. 'not_a_contract').

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Harden checkRateLimit with email-based bypass

**Files:**

- Modify: `lib/rateLimit/persistent.ts`

This is the core change. Currently `checkRateLimit(userId, ...)` only checks the UUID against the `RATE_LIMIT_BYPASS` list. If the list contains emails, they never match. Only the OCR and analyze routes do a manual `isRateLimitBypassed(user.email)` check — all other rate-limited routes are unprotected by the email bypass.

- [ ] **Step 1: Add userEmail to RateLimitOptions**

In `lib/rateLimit/persistent.ts`, find the `RateLimitOptions` interface (around line 54-62):

```ts
export interface RateLimitOptions {
  /**
   * If true, only check the limits — do NOT increment the counter.
   * Caller is expected to call `incrementRateLimit()` after the operation
   * succeeds. Used for long-running AI operations where we only want to
   * count successful completions against the limit.
   */
  skipIncrement?: boolean;
}
```

Replace with:

```ts
export interface RateLimitOptions {
  /**
   * If true, only check the limits — do NOT increment the counter.
   * Caller is expected to call `incrementRateLimit()` after the operation
   * succeeds. Used for long-running AI operations where we only want to
   * count successful completions against the limit.
   */
  skipIncrement?: boolean;
  /**
   * Optional user email to check against the RATE_LIMIT_BYPASS list.
   * Allows bypass matching by email in addition to userId, so the env var
   * works regardless of whether it contains UUIDs or email addresses.
   */
  userEmail?: string;
}
```

- [ ] **Step 2: Update the bypass check inside checkRateLimit**

Find this block (around line 70-74):

```ts
// Dev/test accounts bypass all rate limits
if (BYPASS_LIST.includes(userId.toLowerCase())) {
  return { allowed: true };
}
```

Replace with:

```ts
// Dev/test accounts bypass all rate limits (match by UUID or email)
const bypassedById = BYPASS_LIST.includes(userId.toLowerCase());
const bypassedByEmail = !!(
  options.userEmail && BYPASS_LIST.includes(options.userEmail.toLowerCase())
);
if (bypassedById || bypassedByEmail) {
  console.info('[rateLimit] bypass activated', {
    userId,
    email: options.userEmail ?? '(none)',
    endpoint,
  });
  return { allowed: true };
}
```

This checks both the userId (UUID) and the email against the bypass list, and logs an audit line whenever the bypass fires.

- [ ] **Step 3: Verify**

```bash
unset ANTHROPIC_API_KEY ANTHROPIC_BASE_URL && npx tsc --noEmit
```

Expected: 0 errors. The `userEmail` field is optional, so all existing callers still compile.

- [ ] **Step 4: Commit**

```bash
git add lib/rateLimit/persistent.ts
git commit -m "fix(security): checkRateLimit now accepts userEmail for bypass matching

RATE_LIMIT_BYPASS env var can contain UUIDs or emails. Previously only
userId (UUID) was checked, so email entries silently failed on most
routes. Now checks both. Also logs when bypass activates for audit.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Update all checkRateLimit callers to pass userEmail

**Files:**

- Modify: `app/api/contracts/compare/route.ts:25`
- Modify: `app/api/contracts/suggest-clauses/route.ts:20`
- Modify: `app/api/contracts/[id]/reparse/route.ts:18`
- Modify: `app/api/contracts/[id]/renew/route.ts:112`
- Modify: `app/api/notifications/send/route.ts:18`
- Modify: `app/api/ai/usage/route.ts:36-37`

These routes currently call `checkRateLimit(user.id, ...)` without passing the email. They need the `userEmail` option added.

- [ ] **Step 1: Update contracts/compare**

In `app/api/contracts/compare/route.ts`, find (around line 25):

```ts
const rl = await checkRateLimit(user.id, 'compare', 5, 10);
```

Replace with:

```ts
const rl = await checkRateLimit(user.id, 'compare', 5, 10, { userEmail: user.email ?? undefined });
```

- [ ] **Step 2: Update contracts/suggest-clauses**

In `app/api/contracts/suggest-clauses/route.ts`, find (around line 20):

```ts
const rl = await checkRateLimit(user.id, 'suggest-clauses', 10, 20);
```

Replace with:

```ts
const rl = await checkRateLimit(user.id, 'suggest-clauses', 10, 20, {
  userEmail: user.email ?? undefined,
});
```

- [ ] **Step 3: Update contracts/[id]/reparse**

In `app/api/contracts/[id]/reparse/route.ts`, find (around line 18):

```ts
const rl = await checkRateLimit(user.id, 'reparse', 5, 10);
```

Replace with:

```ts
const rl = await checkRateLimit(user.id, 'reparse', 5, 10, { userEmail: user.email ?? undefined });
```

- [ ] **Step 4: Update contracts/[id]/renew**

In `app/api/contracts/[id]/renew/route.ts`, find (around line 112):

```ts
const rl = await checkRateLimit(user.id, 'renew', 5, 10);
```

Replace with:

```ts
const rl = await checkRateLimit(user.id, 'renew', 5, 10, { userEmail: user.email ?? undefined });
```

- [ ] **Step 5: Update notifications/send**

In `app/api/notifications/send/route.ts`, find (around line 18):

```ts
const rl = await checkRateLimit(user.id, 'notifications-send', 20, 100);
```

Replace with:

```ts
const rl = await checkRateLimit(user.id, 'notifications-send', 20, 100, {
  userEmail: user.email ?? undefined,
});
```

- [ ] **Step 6: Update ai/usage**

In `app/api/ai/usage/route.ts`, find (around line 36-39):

```ts
    checkRateLimit(user.id, 'ocr', limits.hourlyOcr, limits.dailyOcr, { skipIncrement: true }),
    checkRateLimit(user.id, 'analyze', limits.hourlyAnalyze, limits.dailyAnalyze, {
      skipIncrement: true,
    }),
```

Replace with:

```ts
    checkRateLimit(user.id, 'ocr', limits.hourlyOcr, limits.dailyOcr, { skipIncrement: true, userEmail: user.email ?? undefined }),
    checkRateLimit(user.id, 'analyze', limits.hourlyAnalyze, limits.dailyAnalyze, {
      skipIncrement: true,
      userEmail: user.email ?? undefined,
    }),
```

- [ ] **Step 7: Verify**

```bash
unset ANTHROPIC_API_KEY ANTHROPIC_BASE_URL && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 8: Commit**

```bash
git add app/api/contracts/compare/route.ts app/api/contracts/suggest-clauses/route.ts app/api/contracts/[id]/reparse/route.ts app/api/contracts/[id]/renew/route.ts app/api/notifications/send/route.ts app/api/ai/usage/route.ts
git commit -m "fix(security): pass userEmail to checkRateLimit in all rate-limited routes

Six routes were calling checkRateLimit with only userId. If
RATE_LIMIT_BYPASS contained an email address, these routes would never
match. Now all pass user.email so bypass works by either UUID or email.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 5: Remove redundant manual bypass from OCR and analyze routes

**Files:**

- Modify: `app/api/ocr/route.ts:48-66`
- Modify: `app/api/contracts/[id]/analyze/route.ts:75-84`

Now that `checkRateLimit` handles the email bypass internally, these two routes no longer need their manual `isRateLimitBypassed` calls + conditional `bypassed` logic.

- [ ] **Step 1: Simplify OCR route**

In `app/api/ocr/route.ts`, find the bypass + rate-limit block (around line 48-67):

```ts
// Dev/test bypass — skip ALL rate limit checks
const bypassed = isRateLimitBypassed(user.id) || isRateLimitBypassed(user.email ?? '');

// Per-user daily AI limit scales with property slots: 4 successful parses/day
// for 2-slot users, scaling up to 20/day for 10-slot users. hourly = daily / 2.
const budgetClient = createServiceRoleClient();
const { count: propertyCount } = await budgetClient
  .from('properties')
  .select('id', { count: 'exact', head: true })
  .eq('landlord_id', user.id);

const limits = getAILimits(propertyCount ?? 0);

// skipIncrement so only SUCCESSFUL parses count — we increment after the
// We call incrementRateLimit(user.id, 'ocr') at the end of the success path.
const rl = bypassed
  ? ({ allowed: true } as const)
  : await checkRateLimit(user.id, 'ocr', limits.hourlyOcr, limits.dailyOcr, {
      skipIncrement: true,
    });
```

Replace with:

```ts
// Per-user daily AI limit scales with property slots: 4 successful parses/day
// for 2-slot users, scaling up to 20/day for 10-slot users. hourly = daily / 2.
const budgetClient = createServiceRoleClient();
const { count: propertyCount } = await budgetClient
  .from('properties')
  .select('id', { count: 'exact', head: true })
  .eq('landlord_id', user.id);

const limits = getAILimits(propertyCount ?? 0);

// skipIncrement so only SUCCESSFUL parses count — we increment after the
// success path via incrementRateLimit(user.id, 'ocr').
// Dev/test bypass is handled inside checkRateLimit via userEmail option.
const rl = await checkRateLimit(user.id, 'ocr', limits.hourlyOcr, limits.dailyOcr, {
  skipIncrement: true,
  userEmail: user.email ?? undefined,
});
```

Also update the import at the top of the file. Find:

```ts
import {
  checkRateLimit,
  incrementRateLimit,
  isRateLimitBypassed,
  logAISpend,
} from '@/lib/rateLimit/persistent';
```

Replace with:

```ts
import { checkRateLimit, incrementRateLimit, logAISpend } from '@/lib/rateLimit/persistent';
```

(Remove `isRateLimitBypassed` from the import.)

- [ ] **Step 2: Simplify analyze route**

In `app/api/contracts/[id]/analyze/route.ts`, find the bypass + rate-limit block (around line 75-84):

```ts
// Dev/test bypass — skip ALL rate limit checks
const bypassed = isRateLimitBypassed(user.id) || isRateLimitBypassed(user.email ?? '');

// skipIncrement so only SUCCESSFUL analyses count — we increment after the
// analysis parses + caches cleanly.
const rl = bypassed
  ? ({ allowed: true } as const)
  : await checkRateLimit(user.id, 'analyze', limits.hourlyAnalyze, limits.dailyAnalyze, {
      skipIncrement: true,
    });
```

Replace with:

```ts
// skipIncrement so only SUCCESSFUL analyses count — we increment after the
// analysis parses + caches cleanly.
// Dev/test bypass is handled inside checkRateLimit via userEmail option.
const rl = await checkRateLimit(user.id, 'analyze', limits.hourlyAnalyze, limits.dailyAnalyze, {
  skipIncrement: true,
  userEmail: user.email ?? undefined,
});
```

Also update the import at the top. Find:

```ts
import {
  checkRateLimit,
  incrementRateLimit,
  isRateLimitBypassed,
  logAISpend,
} from '@/lib/rateLimit/persistent';
```

Replace with:

```ts
import { checkRateLimit, incrementRateLimit, logAISpend } from '@/lib/rateLimit/persistent';
```

- [ ] **Step 3: Check if isRateLimitBypassed still has callers**

Run:

```bash
grep -r "isRateLimitBypassed" app/ lib/ --include="*.ts"
```

If there are no remaining callers, the export in `lib/rateLimit/persistent.ts` is now dead code. Leave it exported for now (harmless, and the auth routes could theoretically use it). If the only references are in `persistent.ts` itself (the definition + `export`), that's fine.

- [ ] **Step 4: Verify**

```bash
unset ANTHROPIC_API_KEY ANTHROPIC_BASE_URL && npx tsc --noEmit && npx next lint
```

Expected: 0 errors, 0 warnings.

- [ ] **Step 5: Commit**

```bash
git add app/api/ocr/route.ts app/api/contracts/[id]/analyze/route.ts
git commit -m "refactor: remove redundant manual bypass from OCR and analyze routes

Now that checkRateLimit handles email-based bypass internally via
userEmail option, the per-route isRateLimitBypassed + conditional
bypassed logic is unnecessary. Simplifies both routes and ensures
consistent bypass behavior.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 6: Final verification — full build

- [ ] **Step 1: Run full build**

```bash
unset ANTHROPIC_API_KEY ANTHROPIC_BASE_URL && npx next build
```

Expected: Build succeeds, 70 pages generated, 0 errors.

- [ ] **Step 2: Spot-check that serverError never leaks**

Quick grep to confirm no remaining `NextResponse.json({ error: error.message` or `NextResponse.json({ error: err.message` patterns in the API routes:

```bash
grep -rn "NextResponse.json.*error.*\.message" app/api/ --include="*.ts"
```

Expected: 0 matches (the complete-profile fix removed the only one).

- [ ] **Step 3: Spot-check SSE error payloads**

```bash
grep -rn "err\.message\|error\.message" app/api/ocr/route.ts
```

Expected: Only the `console.error` line contains `err.message`. The `send()` call should use the generic `'processing_failed'` string.
