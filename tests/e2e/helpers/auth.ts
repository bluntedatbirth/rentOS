import { Page } from '@playwright/test';

// TODO(0-E): /api/dev/signin-browser was deleted as part of the security audit (P0-E).
// These helpers must be updated to use a Supabase test helper that authenticates
// via the Supabase Admin API or a dedicated test-only magic-link flow.
// Until then, e2e tests that call loginAsLandlord/loginAsTenant will fail.
// See sprint-reports/security-fixes.md for the deferral rationale.

export async function loginAsLandlord(page: Page) {
  // TODO(0-E): Replace with Supabase test helper auth
  // Previously: await page.goto('/api/dev/signin-browser?role=landlord');
  throw new Error(
    'loginAsLandlord: /api/dev/signin-browser was deleted (P0-E). Update to use Supabase test auth.'
  );
  await page.waitForURL('**/landlord/dashboard', { timeout: 15000 });
}

export async function loginAsTenant(page: Page) {
  // TODO(0-E): Replace with Supabase test helper auth
  // Previously: await page.goto('/api/dev/signin-browser?role=tenant');
  throw new Error(
    'loginAsTenant: /api/dev/signin-browser was deleted (P0-E). Update to use Supabase test auth.'
  );
  await page.waitForURL('**/tenant/dashboard', { timeout: 15000 });
}
