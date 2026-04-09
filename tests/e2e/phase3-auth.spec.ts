import { test, expect } from '@playwright/test';
import { loginAsLandlord, loginAsTenant } from './helpers/auth';

test.describe('Phase 3 - Authentication', () => {
  test('landlord login reaches correct dashboard', async ({ page }) => {
    await loginAsLandlord(page);
    // Check we're on landlord dashboard
    await expect(
      page.locator('text=Landlord Dashboard').or(page.locator('text=แดชบอร์ดเจ้าของที่พัก'))
    ).toBeVisible();
  });

  test('tenant login reaches correct dashboard', async ({ page }) => {
    await loginAsTenant(page);
    await expect(
      page.locator('text=Tenant Dashboard').or(page.locator('text=แดชบอร์ดผู้เช่า'))
    ).toBeVisible();
  });

  test('tenant cannot access landlord routes', async ({ page }) => {
    await loginAsTenant(page);
    await page.goto('/landlord/dashboard');
    // Should be redirected back to tenant dashboard
    await page.waitForURL('**/tenant/**');
    const url = page.url();
    expect(url).toContain('/tenant/');
  });

  test('language toggle on login page works', async ({ page }) => {
    await page.goto('/login');
    // Default is Thai, look for the toggle button
    const enButton = page.locator('button:has-text("EN")');
    if (await enButton.isVisible()) {
      await enButton.click();
      // After clicking EN, UI should show English text
      await expect(page.locator('text=Welcome Back').or(page.locator('text=Log In'))).toBeVisible();
    }
  });
});
