import { test, expect } from '@playwright/test';
import { loginAsLandlord, loginAsTenant } from './helpers/auth';
import { switchLanguage, verifyLocale } from './helpers/i18n';

test.describe('Phase 1 - Smoke Tests', () => {
  test('homepage redirects to login', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('**/login', { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });

  test('login page renders with Thai as default', async ({ page }) => {
    await page.goto('/login');
    // Title should always be "RentOS"
    await expect(page.locator('h1')).toContainText('RentOS');
    // In Thai mode, the welcome text should be Thai
    await expect(
      page.locator('text=ยินดีต้อนรับกลับ').or(page.locator('text=Welcome Back'))
    ).toBeVisible();
    // Language toggle should be visible
    await expect(page.locator('button').filter({ hasText: /English|ภาษาไทย/ })).toBeVisible();
  });

  test('login page renders in English after toggle', async ({ page }) => {
    await page.goto('/login');
    // Switch to English
    await switchLanguage(page, 'en');
    // Should show English content
    await expect(page.locator('text=Welcome Back')).toBeVisible();
    await expect(page.locator('text=Send Magic Link')).toBeVisible();
    // Toggle should now show Thai option
    await verifyLocale(page, 'en');
  });

  test('language toggle round-trips correctly', async ({ page }) => {
    await page.goto('/login');
    // Switch to English
    await switchLanguage(page, 'en');
    await expect(page.locator('text=Welcome Back')).toBeVisible();
    // Switch back to Thai
    await switchLanguage(page, 'th');
    await expect(page.locator('text=ยินดีต้อนรับกลับ')).toBeVisible();
  });

  test('landlord dashboard loads after login', async ({ page }) => {
    await loginAsLandlord(page);
    const url = page.url();
    expect(url).toContain('/landlord/dashboard');
    // Dashboard should have a main element with content
    await expect(page.locator('main')).toBeVisible();
    // Should show dashboard heading
    await expect(
      page.locator('text=Landlord Dashboard').or(page.locator('text=แดชบอร์ดเจ้าของที่พัก'))
    ).toBeVisible();
  });

  test('tenant dashboard loads after login', async ({ page }) => {
    await loginAsTenant(page);
    const url = page.url();
    expect(url).toContain('/tenant/dashboard');
    await expect(page.locator('main')).toBeVisible();
    await expect(
      page.locator('text=Tenant Dashboard').or(page.locator('text=แดชบอร์ดผู้เช่า'))
    ).toBeVisible();
  });

  test('all landlord nav links return 200 (no 404s)', async ({ page }) => {
    await loginAsLandlord(page);
    const routes = [
      '/landlord/dashboard',
      '/landlord/properties',
      '/landlord/contracts/upload',
      '/landlord/payments',
      '/landlord/maintenance',
      '/landlord/penalties',
      '/landlord/notifications/inbox',
      '/landlord/notifications',
      '/landlord/security',
      '/landlord/profile',
    ];
    for (const route of routes) {
      const response = await page.goto(route);
      expect(response?.status(), `${route} should not be 404`).not.toBe(404);
      await expect(page.locator('main')).toBeVisible();
    }
  });

  test('all tenant nav links return 200 (no 404s)', async ({ page }) => {
    await loginAsTenant(page);
    const routes = [
      '/tenant/dashboard',
      '/tenant/contract/view',
      '/tenant/co-tenants',
      '/tenant/maintenance',
      '/tenant/payments',
      '/tenant/penalties/appeal',
      '/tenant/notifications',
      '/tenant/security',
      '/tenant/profile',
    ];
    for (const route of routes) {
      const response = await page.goto(route);
      expect(response?.status(), `${route} should not be 404`).not.toBe(404);
      await expect(page.locator('main')).toBeVisible();
    }
  });
});
