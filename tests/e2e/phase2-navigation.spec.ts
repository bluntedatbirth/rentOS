import { test, expect } from '@playwright/test';
import { loginAsLandlord, loginAsTenant } from './helpers/auth';

test.describe('Phase 2 - Navigation', () => {
  /**
   * BottomNav: visible on mobile (md:hidden), fixed at bottom, contains 4 tabs.
   * SideNav:   visible on desktop (hidden md:block), left sidebar, contains full nav items.
   *
   * Landlord bottom tabs: Dashboard, Properties, Payments, More
   * Tenant bottom tabs:   Dashboard, My Contract, Payments, More
   *
   * Active state: BottomNav uses text-primary-600, SideNav uses bg-primary-50 text-primary-700
   */

  test.describe('Landlord Mobile Navigation', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test('bottom nav appears on mobile viewport', async ({ page }) => {
      await loginAsLandlord(page);

      // BottomNav should be visible (the nav element with fixed bottom positioning)
      const bottomNav = page.locator('nav.fixed.bottom-0');
      await expect(bottomNav).toBeVisible();
    });

    test('side nav is hidden on mobile viewport', async ({ page }) => {
      await loginAsLandlord(page);

      // SideNav has class "hidden md:block" so should not be visible on mobile
      const sideNav = page.locator('nav.hidden.md\\:block');
      await expect(sideNav).not.toBeVisible();
    });

    test('bottom nav has 4 tabs', async ({ page }) => {
      await loginAsLandlord(page);

      const bottomNav = page.locator('nav.fixed.bottom-0');
      const navLinks = bottomNav.locator('a');
      await expect(navLinks).toHaveCount(4);
    });

    test('bottom nav tabs display correct labels', async ({ page }) => {
      await loginAsLandlord(page);

      const bottomNav = page.locator('nav.fixed.bottom-0');

      // Dashboard tab
      await expect(
        bottomNav.locator('text=Dashboard').or(bottomNav.locator('text=แดชบอร์ด'))
      ).toBeVisible();

      // Properties tab
      await expect(
        bottomNav.locator('text=Properties').or(bottomNav.locator('text=ที่พัก'))
      ).toBeVisible();

      // Payments tab
      await expect(
        bottomNav.locator('text=Payments').or(bottomNav.locator('text=การชำระเงิน'))
      ).toBeVisible();

      // More tab
      await expect(
        bottomNav.locator('text=More').or(bottomNav.locator('text=เพิ่มเติม'))
      ).toBeVisible();
    });

    test('bottom nav Dashboard tab navigates to landlord dashboard', async ({ page }) => {
      await loginAsLandlord(page);
      // Navigate away from dashboard first
      await page.goto('/landlord/properties');
      await page.waitForTimeout(1000);

      const bottomNav = page.locator('nav.fixed.bottom-0');
      const dashboardLink = bottomNav.locator('a[href="/landlord/dashboard"]');
      await dashboardLink.click();

      await page.waitForURL('**/landlord/dashboard', { timeout: 10000 });
      expect(page.url()).toContain('/landlord/dashboard');
    });

    test('bottom nav Properties tab navigates correctly', async ({ page }) => {
      await loginAsLandlord(page);

      const bottomNav = page.locator('nav.fixed.bottom-0');
      const propertiesLink = bottomNav.locator('a[href="/landlord/properties"]');
      await propertiesLink.click();

      await page.waitForURL('**/landlord/properties', { timeout: 10000 });
      expect(page.url()).toContain('/landlord/properties');
    });

    test('bottom nav Payments tab navigates correctly', async ({ page }) => {
      await loginAsLandlord(page);

      const bottomNav = page.locator('nav.fixed.bottom-0');
      const paymentsLink = bottomNav.locator('a[href="/landlord/payments"]');
      await paymentsLink.click();

      await page.waitForURL('**/landlord/payments', { timeout: 10000 });
      expect(page.url()).toContain('/landlord/payments');
    });

    test('active bottom nav tab has primary color', async ({ page }) => {
      await loginAsLandlord(page);
      // On the dashboard page, the dashboard tab should be active
      const bottomNav = page.locator('nav.fixed.bottom-0');
      const dashboardLink = bottomNav.locator('a[href="/landlord/dashboard"]');
      await expect(dashboardLink).toHaveClass(/text-primary-600/);
    });
  });

  test.describe('Landlord Desktop Navigation', () => {
    test.use({ viewport: { width: 1280, height: 720 } });

    test('side nav appears on desktop viewport', async ({ page }) => {
      await loginAsLandlord(page);

      // SideNav should be visible on desktop (md:block)
      const sideNav = page.locator('nav.hidden.md\\:block');
      await expect(sideNav).toBeVisible();
    });

    test('bottom nav is hidden on desktop viewport', async ({ page }) => {
      await loginAsLandlord(page);

      // BottomNav has md:hidden, so should not be visible on desktop
      const bottomNav = page.locator('nav.fixed.bottom-0');
      await expect(bottomNav).not.toBeVisible();
    });

    test('side nav shows all navigation items', async ({ page }) => {
      await loginAsLandlord(page);

      const sideNav = page.locator('nav.hidden.md\\:block');

      // Check key nav items are visible
      const expectedLabels = [
        /Dashboard|แดชบอร์ด/,
        /Properties|ที่พัก/,
        /Payments|การชำระเงิน/,
        /Maintenance|การบำรุงรักษา/,
        /Penalties|ค่าปรับ/,
        /Notifications|การแจ้งเตือน/,
        /Security|ความปลอดภัย/,
        /Profile|โปรไฟล์/,
        /Settings|ตั้งค่า/,
      ];

      for (const label of expectedLabels) {
        const link = sideNav.locator('a').filter({ hasText: label });
        await expect(link).toBeVisible();
      }
    });

    test('side nav Dashboard link navigates correctly', async ({ page }) => {
      await loginAsLandlord(page);
      await page.goto('/landlord/properties');

      const sideNav = page.locator('nav.hidden.md\\:block');
      const dashLink = sideNav.locator('a[href="/landlord/dashboard"]');
      await dashLink.click();

      await page.waitForURL('**/landlord/dashboard', { timeout: 10000 });
      expect(page.url()).toContain('/landlord/dashboard');
    });

    test('side nav Properties link navigates correctly', async ({ page }) => {
      await loginAsLandlord(page);

      const sideNav = page.locator('nav.hidden.md\\:block');
      const link = sideNav.locator('a[href="/landlord/properties"]');
      await link.click();

      await page.waitForURL('**/landlord/properties', { timeout: 10000 });
      expect(page.url()).toContain('/landlord/properties');
    });

    test('side nav Penalties link navigates correctly', async ({ page }) => {
      await loginAsLandlord(page);

      const sideNav = page.locator('nav.hidden.md\\:block');
      const link = sideNav.locator('a[href="/landlord/penalties"]');
      await link.click();

      await page.waitForURL('**/landlord/penalties', { timeout: 10000 });
      expect(page.url()).toContain('/landlord/penalties');
    });

    test('active side nav link has primary background', async ({ page }) => {
      await loginAsLandlord(page);
      // On the dashboard page
      const sideNav = page.locator('nav.hidden.md\\:block');
      const dashLink = sideNav.locator('a[href="/landlord/dashboard"]');
      await expect(dashLink).toHaveClass(/bg-primary-50/);
      await expect(dashLink).toHaveClass(/text-primary-700/);
    });
  });

  test.describe('Tenant Mobile Navigation', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test('tenant bottom nav appears on mobile', async ({ page }) => {
      await loginAsTenant(page);

      const bottomNav = page.locator('nav.fixed.bottom-0');
      await expect(bottomNav).toBeVisible();
    });

    test('tenant bottom nav has 4 tabs', async ({ page }) => {
      await loginAsTenant(page);

      const bottomNav = page.locator('nav.fixed.bottom-0');
      const navLinks = bottomNav.locator('a');
      await expect(navLinks).toHaveCount(4);
    });

    test('tenant bottom nav shows correct labels', async ({ page }) => {
      await loginAsTenant(page);

      const bottomNav = page.locator('nav.fixed.bottom-0');

      // Dashboard
      await expect(
        bottomNav.locator('text=Dashboard').or(bottomNav.locator('text=แดชบอร์ด'))
      ).toBeVisible();

      // My Contract
      await expect(
        bottomNav.locator('text=My Contract').or(bottomNav.locator('text=สัญญาของฉัน'))
      ).toBeVisible();

      // Payments
      await expect(
        bottomNav.locator('text=Payments').or(bottomNav.locator('text=การชำระเงิน'))
      ).toBeVisible();

      // More
      await expect(
        bottomNav.locator('text=More').or(bottomNav.locator('text=เพิ่มเติม'))
      ).toBeVisible();
    });

    test('tenant bottom nav My Contract tab navigates correctly', async ({ page }) => {
      await loginAsTenant(page);

      const bottomNav = page.locator('nav.fixed.bottom-0');
      const contractLink = bottomNav.locator('a[href="/tenant/contract/view"]');
      await contractLink.click();

      await page.waitForURL('**/tenant/contract/view', { timeout: 10000 });
      expect(page.url()).toContain('/tenant/contract/view');
    });
  });

  test.describe('Tenant Desktop Navigation', () => {
    test.use({ viewport: { width: 1280, height: 720 } });

    test('tenant side nav appears on desktop', async ({ page }) => {
      await loginAsTenant(page);

      const sideNav = page.locator('nav.hidden.md\\:block');
      await expect(sideNav).toBeVisible();
    });

    test('tenant side nav shows all items', async ({ page }) => {
      await loginAsTenant(page);

      const sideNav = page.locator('nav.hidden.md\\:block');

      const expectedLabels = [
        /Dashboard|แดชบอร์ด/,
        /Pair|จับคู่/,
        /My Contract|สัญญาของฉัน/,
        /Co-tenants|ผู้เช่าร่วม/,
        /Maintenance|การบำรุงรักษา/,
        /Payments|การชำระเงิน/,
        /Penalties|ค่าปรับ/,
        /Notifications|การแจ้งเตือน/,
        /Security|ความปลอดภัย/,
        /Profile|โปรไฟล์/,
        /Settings|ตั้งค่า/,
      ];

      for (const label of expectedLabels) {
        const link = sideNav.locator('a').filter({ hasText: label });
        await expect(link).toBeVisible();
      }
    });

    test('tenant side nav active state shows on current page', async ({ page }) => {
      await loginAsTenant(page);

      const sideNav = page.locator('nav.hidden.md\\:block');
      const dashLink = sideNav.locator('a[href="/tenant/dashboard"]');
      await expect(dashLink).toHaveClass(/bg-primary-50/);
      await expect(dashLink).toHaveClass(/text-primary-700/);
    });
  });

  test.describe('Header Navigation', () => {
    test('header shows app title as link', async ({ page }) => {
      await loginAsLandlord(page);

      const headerTitle = page.locator('header a').filter({ hasText: 'RentOS' });
      await expect(headerTitle).toBeVisible();
    });

    test('header has language toggle button', async ({ page }) => {
      await loginAsLandlord(page);

      // Language toggle shows "EN" or "TH" depending on current locale
      const langToggle = page.locator('header button').filter({ hasText: /^EN$|^TH$/ });
      await expect(langToggle).toBeVisible();
    });

    test('header has logout button', async ({ page }) => {
      await loginAsLandlord(page);

      const logoutBtn = page.locator('header button').filter({ hasText: /Log Out|ออกจากระบบ/ });
      await expect(logoutBtn).toBeVisible();
    });
  });
});
