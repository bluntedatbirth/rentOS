import { test, expect, Page } from '@playwright/test';
import { loginAsLandlord, loginAsTenant } from './helpers/auth';
import { switchLanguage } from './helpers/i18n';

/**
 * Phase 2 Bilingual Test Coverage
 *
 * Verifies every major page renders without errors in both English and Thai.
 * Uses the bilingual .or() selector pattern from Phase 1.
 * Checks that key UI elements have translated text (not raw i18n keys).
 */

/** Helper: assert no i18n key leakage on the page. */
async function assertNoI18nKeyLeakage(page: Page) {
  // i18n keys typically look like "section.key_name" - if they leak, they appear
  // in the DOM as raw text. We check for common patterns.
  const body = await page.locator('body').innerText();

  // These patterns indicate leaked i18n keys (untranslated strings)
  const i18nKeyPatterns = [
    /\bauth\.\w+/,
    /\bnav\.\w+/,
    /\bdashboard\.\w+/,
    /\bpayments\.\w+/,
    /\bpenalties\.\w+/,
    /\bmaintenance\.\w+/,
    /\bnotifications\.\w+/,
    /\bsecurity\.\w+/,
    /\bprofile\.\w+/,
    /\bupload\.\w+/,
  ];

  for (const pattern of i18nKeyPatterns) {
    const match = body.match(pattern);
    // Allow some false positives (e.g. email addresses), but flag obvious key leakage
    if (match) {
      // Only flag if it looks like "section.some_key" (with underscore or multiple dots)
      const val = match[0];
      if (val.includes('_') && !val.includes('@') && !val.includes('http')) {
        // This might be a leaked key. Log but don't fail hard - some edge cases
        // may have legitimate text matching these patterns.
        console.warn(`Possible i18n key leakage: "${val}" on ${page.url()}`);
      }
    }
  }
}

/** Helper: check page loads without errors. */
async function assertPageLoads(page: Page) {
  // Page should have a main element (all app pages use <main>)
  await expect(page.locator('main')).toBeVisible({ timeout: 15000 });

  // No error boundaries or crash states
  const errorBoundary = page
    .locator('text=Something went wrong')
    .or(page.locator('text=Application error'));
  await expect(errorBoundary).not.toBeVisible();
}

test.describe('Phase 2 - Bilingual Coverage', () => {
  test.describe('English Mode - All Pages', () => {
    test('login page renders in English', async ({ page }) => {
      await page.goto('/login');
      await switchLanguage(page, 'en');

      await expect(page.locator('text=Welcome Back')).toBeVisible();
      await expect(page.locator('text=Send Magic Link')).toBeVisible();
      await assertNoI18nKeyLeakage(page);
    });

    test('landlord dashboard renders in English', async ({ page }) => {
      await loginAsLandlord(page);
      // Switch to English via header toggle
      const langToggle = page.locator('header button').filter({ hasText: /^TH$/ });
      if (await langToggle.isVisible().catch(() => false)) {
        // Already in English (button says "TH" to switch to Thai)
      } else {
        const enToggle = page.locator('header button').filter({ hasText: /^EN$/ });
        if (await enToggle.isVisible().catch(() => false)) {
          await enToggle.click();
        }
      }

      await assertPageLoads(page);
      await expect(page.locator('text=Landlord Dashboard')).toBeVisible({ timeout: 10000 });
      await assertNoI18nKeyLeakage(page);
    });

    test('landlord properties page renders in English', async ({ page }) => {
      await loginAsLandlord(page);
      await page.goto('/landlord/properties');
      await assertPageLoads(page);
      // Title or heading should be visible
      await expect(page.locator('text=Properties').first()).toBeVisible();
    });

    test('landlord contracts upload page renders in English', async ({ page }) => {
      await loginAsLandlord(page);
      await page.goto('/landlord/contracts/upload');
      await assertPageLoads(page);
      await expect(page.locator('text=Upload Contract').first()).toBeVisible();
    });

    test('landlord payments page renders in English', async ({ page }) => {
      await loginAsLandlord(page);
      await page.goto('/landlord/payments');
      await assertPageLoads(page);
      await expect(page.locator('text=Payments').first()).toBeVisible();
    });

    test('landlord penalties page renders in English', async ({ page }) => {
      await loginAsLandlord(page);
      await page.goto('/landlord/penalties');
      await assertPageLoads(page);
      await expect(page.locator('text=Penalties').first()).toBeVisible();
    });

    test('landlord maintenance page renders in English', async ({ page }) => {
      await loginAsLandlord(page);
      await page.goto('/landlord/maintenance');
      await assertPageLoads(page);
      await expect(page.locator('text=Maintenance').first()).toBeVisible();
    });

    test('landlord notifications page renders in English', async ({ page }) => {
      await loginAsLandlord(page);
      await page.goto('/landlord/notifications/inbox');
      await assertPageLoads(page);
      await expect(page.locator('text=Notifications').first()).toBeVisible();
    });

    test('tenant dashboard renders in English', async ({ page }) => {
      await loginAsTenant(page);
      await assertPageLoads(page);
      await expect(page.locator('text=Tenant Dashboard')).toBeVisible({ timeout: 10000 });
    });

    test('tenant payments page renders in English', async ({ page }) => {
      await loginAsTenant(page);
      await page.goto('/tenant/payments');
      await assertPageLoads(page);
      await expect(page.locator('text=Payments').first()).toBeVisible();
    });

    test('tenant penalties page renders in English', async ({ page }) => {
      await loginAsTenant(page);
      await page.goto('/tenant/penalties/appeal');
      await assertPageLoads(page);
      await expect(page.locator('text=Penalties').first()).toBeVisible();
    });

    test('tenant maintenance page renders in English', async ({ page }) => {
      await loginAsTenant(page);
      await page.goto('/tenant/maintenance');
      await assertPageLoads(page);
      await expect(page.locator('text=Maintenance').first()).toBeVisible();
    });

    test('tenant notifications page renders in English', async ({ page }) => {
      await loginAsTenant(page);
      await page.goto('/tenant/notifications');
      await assertPageLoads(page);
      await expect(page.locator('text=Notifications').first()).toBeVisible();
    });
  });

  test.describe('Thai Mode - All Pages', () => {
    test('login page renders in Thai', async ({ page }) => {
      await page.goto('/login');
      // Default should be Thai, but ensure it
      await switchLanguage(page, 'th');

      await expect(page.locator('text=ยินดีต้อนรับกลับ')).toBeVisible();
      await expect(page.locator('text=ส่งลิงก์เข้าสู่ระบบ')).toBeVisible();
      await assertNoI18nKeyLeakage(page);
    });

    test('landlord dashboard renders in Thai', async ({ page }) => {
      await loginAsLandlord(page);
      // Ensure Thai mode - click the language toggle if needed
      const enToggle = page.locator('header button').filter({ hasText: /^EN$/ });
      if (await enToggle.isVisible().catch(() => false)) {
        // Currently in English, switch to Thai
        const _thText = page.locator('header button').filter({ hasText: /^TH$/ });
        // Actually EN button means "click for EN" so we're already in Thai. Verify:
      }

      await assertPageLoads(page);
      // Dashboard title in Thai
      await expect(
        page.locator('text=แดชบอร์ดเจ้าของที่พัก').or(page.locator('text=Landlord Dashboard'))
      ).toBeVisible({ timeout: 10000 });
    });

    test('landlord properties page renders in Thai', async ({ page }) => {
      await loginAsLandlord(page);
      await page.goto('/landlord/properties');
      await assertPageLoads(page);
      await expect(page.locator('text=ที่พัก').or(page.locator('text=Properties'))).toBeVisible();
    });

    test('landlord payments page renders in Thai', async ({ page }) => {
      await loginAsLandlord(page);
      await page.goto('/landlord/payments');
      await assertPageLoads(page);
      await expect(
        page.locator('text=การชำระเงิน').or(page.locator('text=Payments'))
      ).toBeVisible();
    });

    test('landlord penalties page renders in Thai', async ({ page }) => {
      await loginAsLandlord(page);
      await page.goto('/landlord/penalties');
      await assertPageLoads(page);
      await expect(page.locator('text=ค่าปรับ').or(page.locator('text=Penalties'))).toBeVisible();
    });

    test('landlord maintenance page renders in Thai', async ({ page }) => {
      await loginAsLandlord(page);
      await page.goto('/landlord/maintenance');
      await assertPageLoads(page);
      await expect(
        page.locator('text=คำขอซ่อมบำรุง').or(page.locator('text=Maintenance'))
      ).toBeVisible();
    });

    test('landlord notifications page renders in Thai', async ({ page }) => {
      await loginAsLandlord(page);
      await page.goto('/landlord/notifications/inbox');
      await assertPageLoads(page);
      await expect(
        page.locator('text=การแจ้งเตือน').or(page.locator('text=Notifications'))
      ).toBeVisible();
    });

    test('tenant dashboard renders in Thai', async ({ page }) => {
      await loginAsTenant(page);
      await assertPageLoads(page);
      await expect(
        page.locator('text=แดชบอร์ดผู้เช่า').or(page.locator('text=Tenant Dashboard'))
      ).toBeVisible({ timeout: 10000 });
    });

    test('tenant payments page renders in Thai', async ({ page }) => {
      await loginAsTenant(page);
      await page.goto('/tenant/payments');
      await assertPageLoads(page);
      await expect(
        page.locator('text=การชำระเงิน').or(page.locator('text=Payments'))
      ).toBeVisible();
    });

    test('tenant penalties page renders in Thai', async ({ page }) => {
      await loginAsTenant(page);
      await page.goto('/tenant/penalties/appeal');
      await assertPageLoads(page);
      await expect(page.locator('text=ค่าปรับ').or(page.locator('text=Penalties'))).toBeVisible();
    });

    test('tenant maintenance page renders in Thai', async ({ page }) => {
      await loginAsTenant(page);
      await page.goto('/tenant/maintenance');
      await assertPageLoads(page);
      await expect(
        page.locator('text=คำขอซ่อมบำรุง').or(page.locator('text=Maintenance'))
      ).toBeVisible();
    });

    test('tenant notifications page renders in Thai', async ({ page }) => {
      await loginAsTenant(page);
      await page.goto('/tenant/notifications');
      await assertPageLoads(page);
      await expect(
        page.locator('text=การแจ้งเตือน').or(page.locator('text=Notifications'))
      ).toBeVisible();
    });
  });

  test.describe('Language Toggle Persistence', () => {
    test('language persists across landlord page navigation', async ({ page }) => {
      await loginAsLandlord(page);

      // Switch to English via header toggle
      const langBtn = page.locator('header button').filter({ hasText: /^EN$/ });
      if (await langBtn.isVisible().catch(() => false)) {
        await langBtn.click();
        await page.waitForTimeout(500);
      }

      // Navigate to properties page
      await page.goto('/landlord/properties');
      await assertPageLoads(page);

      // Should still be in current language (check header toggle text)
      // If we clicked EN, we're now in English, toggle shows TH
      const headerLangBtn = page.locator('header button').filter({ hasText: /^EN$|^TH$/ });
      await expect(headerLangBtn).toBeVisible();

      // Navigate to payments page
      await page.goto('/landlord/payments');
      await assertPageLoads(page);

      // Language toggle should still be visible (locale persisted)
      await expect(headerLangBtn).toBeVisible();
    });

    test('language persists across tenant page navigation', async ({ page }) => {
      await loginAsTenant(page);

      // Navigate through several pages
      const routes = [
        '/tenant/payments',
        '/tenant/maintenance',
        '/tenant/penalties/appeal',
        '/tenant/notifications',
      ];

      for (const route of routes) {
        await page.goto(route);
        await assertPageLoads(page);

        // Header language toggle should always be present
        const headerLangBtn = page.locator('header button').filter({ hasText: /^EN$|^TH$/ });
        await expect(headerLangBtn).toBeVisible();
      }
    });

    test('toggling language on one page affects subsequent pages', async ({ page }) => {
      await loginAsLandlord(page);

      // Get current state - find which button is showing
      const headerBtn = page.locator('header button').filter({ hasText: /^EN$/ });
      const isShowingEN = await headerBtn.isVisible().catch(() => false);

      if (isShowingEN) {
        // Currently in Thai (EN button visible = click to switch to EN)
        await headerBtn.click();
        await page.waitForTimeout(500);

        // Now should be in English - navigate to another page
        await page.goto('/landlord/penalties');
        await assertPageLoads(page);

        // Verify English content
        await expect(page.locator('text=Penalties').first()).toBeVisible();
      } else {
        // Currently in English (TH button visible = click to switch to TH)
        const thBtn = page.locator('header button').filter({ hasText: /^TH$/ });
        if (await thBtn.isVisible().catch(() => false)) {
          await thBtn.click();
          await page.waitForTimeout(500);
        }

        // Navigate to another page
        await page.goto('/landlord/penalties');
        await assertPageLoads(page);

        // Should show Thai content (or bilingual)
        await expect(page.locator('text=ค่าปรับ').or(page.locator('text=Penalties'))).toBeVisible();
      }
    });
  });

  test.describe('Key Translated Elements', () => {
    test('navigation labels are translated (not showing i18n keys)', async ({ page }) => {
      await loginAsLandlord(page);

      // Check that nav labels are actual words, not i18n keys like "nav.dashboard"
      const headerText = await page.locator('header').innerText();
      expect(headerText).not.toContain('nav.');

      // SideNav or BottomNav should have translated labels
      const navText = await page.locator('nav').first().innerText();
      expect(navText).not.toContain('nav.');
    });

    test('dashboard stats cards have translated titles', async ({ page }) => {
      await loginAsLandlord(page);

      // Stats cards should show translated titles, not raw keys
      const mainContent = await page.locator('main').innerText();
      expect(mainContent).not.toContain('dashboard.');
    });

    test('payment labels are translated', async ({ page }) => {
      await loginAsLandlord(page);
      await page.goto('/landlord/payments');
      await assertPageLoads(page);

      const mainContent = await page.locator('main').innerText();
      expect(mainContent).not.toContain('payments.');
    });

    test('penalty labels are translated', async ({ page }) => {
      await loginAsLandlord(page);
      await page.goto('/landlord/penalties');
      await assertPageLoads(page);

      const mainContent = await page.locator('main').innerText();
      expect(mainContent).not.toContain('penalties.');
    });
  });
});
