import { Page } from '@playwright/test';

export async function loginAsLandlord(page: Page) {
  await page.goto('/api/dev/signin-browser?role=landlord');
  // Wait for redirect to dashboard
  await page.waitForURL('**/landlord/dashboard', { timeout: 15000 });
}

export async function loginAsTenant(page: Page) {
  await page.goto('/api/dev/signin-browser?role=tenant');
  await page.waitForURL('**/tenant/dashboard', { timeout: 15000 });
}
