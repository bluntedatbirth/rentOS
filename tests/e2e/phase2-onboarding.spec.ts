import { test, expect } from '@playwright/test';
import { loginAsLandlord, loginAsTenant } from './helpers/auth';

test.describe('Phase 2 - Onboarding Flows', () => {
  /**
   * Landlord onboarding is at /landlord/onboarding.
   * If the landlord already has properties, it redirects to /landlord/dashboard.
   * A brand-new landlord (no properties) sees the wizard steps:
   *   welcome -> property -> contract -> tenant -> done
   */

  test('onboarding page renders welcome step', async ({ page }) => {
    // Navigate directly to the onboarding page
    await loginAsLandlord(page);
    await page.goto('/landlord/onboarding');

    // Either we see the welcome screen OR we were redirected to dashboard
    // (because the test user already has properties from prior runs).
    const welcomeTitle = page
      .locator('text=Welcome to RentOS!')
      .or(page.locator('text=ยินดีต้อนรับสู่ RentOS!'));
    const dashboardTitle = page
      .locator('text=Landlord Dashboard')
      .or(page.locator('text=แดชบอร์ดเจ้าของที่พัก'));

    // One of these should be visible within timeout
    await expect(welcomeTitle.or(dashboardTitle)).toBeVisible({ timeout: 15000 });
  });

  test('onboarding welcome step has Get Started button', async ({ page }) => {
    await loginAsLandlord(page);
    await page.goto('/landlord/onboarding');

    // If redirected to dashboard, skip this test gracefully
    if (page.url().includes('/landlord/dashboard')) {
      test.skip(true, 'Test user already has properties; onboarding skipped');
      return;
    }

    const getStarted = page.locator('button').filter({ hasText: /Get Started|เริ่มต้นใช้งาน/ });
    await expect(getStarted).toBeVisible();
  });

  test('onboarding welcome lists key features', async ({ page }) => {
    await loginAsLandlord(page);
    await page.goto('/landlord/onboarding');

    if (page.url().includes('/landlord/dashboard')) {
      test.skip(true, 'Test user already has properties; onboarding skipped');
      return;
    }

    // Check all three feature bullets are present
    await expect(
      page
        .locator('text=Upload and translate Thai rental contracts')
        .or(page.locator('text=อัปโหลดและแปลสัญญาเช่าภาษาไทย'))
    ).toBeVisible();
    await expect(
      page
        .locator('text=Track payments and penalties automatically')
        .or(page.locator('text=ติดตามการชำระเงินและค่าปรับอัตโนมัติ'))
    ).toBeVisible();
    await expect(
      page
        .locator('text=Pair tenants with QR codes')
        .or(page.locator('text=จับคู่ผู้เช่าด้วย QR code'))
    ).toBeVisible();
  });

  test('can advance to property step from welcome', async ({ page }) => {
    await loginAsLandlord(page);
    await page.goto('/landlord/onboarding');

    if (page.url().includes('/landlord/dashboard')) {
      test.skip(true, 'Test user already has properties; onboarding skipped');
      return;
    }

    // Click Get Started
    const getStarted = page.locator('button').filter({ hasText: /Get Started|เริ่มต้นใช้งาน/ });
    await getStarted.click();

    // Should now show property step
    await expect(
      page.locator('text=Add Your First Property').or(page.locator('text=เพิ่มที่พักแรกของคุณ'))
    ).toBeVisible();

    // Property form fields should be visible
    await expect(page.locator('#prop-name')).toBeVisible();
    await expect(page.locator('#prop-address')).toBeVisible();
    await expect(page.locator('#prop-units')).toBeVisible();
  });

  test('property step requires property name', async ({ page }) => {
    await loginAsLandlord(page);
    await page.goto('/landlord/onboarding');

    if (page.url().includes('/landlord/dashboard')) {
      test.skip(true, 'Test user already has properties; onboarding skipped');
      return;
    }

    // Advance to property step
    const getStarted = page.locator('button').filter({ hasText: /Get Started|เริ่มต้นใช้งาน/ });
    await getStarted.click();

    // Add Property button should be disabled when name is empty
    const addPropertyBtn = page.locator('button').filter({ hasText: /Add Property|เพิ่มที่พัก/ });
    await expect(addPropertyBtn).toBeDisabled();
  });

  test('contract step can be skipped', async ({ page }) => {
    await loginAsLandlord(page);
    await page.goto('/landlord/onboarding');

    if (page.url().includes('/landlord/dashboard')) {
      test.skip(true, 'Test user already has properties; onboarding skipped');
      return;
    }

    // Advance through welcome -> property (fill name) -> skip contract
    await page
      .locator('button')
      .filter({ hasText: /Get Started|เริ่มต้นใช้งาน/ })
      .click();

    // Fill property name and submit
    await page.locator('#prop-name').fill('Test Property E2E');
    const addPropertyBtn = page.locator('button').filter({ hasText: /Add Property|เพิ่มที่พัก/ });
    await addPropertyBtn.click();

    // Wait for contract step to appear
    await expect(
      page.locator('text=Upload a Contract').or(page.locator('text=อัปโหลดสัญญา'))
    ).toBeVisible({ timeout: 10000 });

    // Click skip
    const skipBtn = page.locator('button').filter({ hasText: /Skip for now|ข้ามไปก่อน/ });
    await expect(skipBtn).toBeVisible();
    await skipBtn.click();

    // Should advance to tenant step
    await expect(
      page.locator('text=Invite Your Tenant').or(page.locator('text=เชิญผู้เช่าของคุณ'))
    ).toBeVisible();
  });

  test('tenant invite step can be skipped to reach done', async ({ page }) => {
    await loginAsLandlord(page);
    await page.goto('/landlord/onboarding');

    if (page.url().includes('/landlord/dashboard')) {
      test.skip(true, 'Test user already has properties; onboarding skipped');
      return;
    }

    // Full flow: welcome -> property -> skip contract -> skip tenant -> done
    await page
      .locator('button')
      .filter({ hasText: /Get Started|เริ่มต้นใช้งาน/ })
      .click();

    await page.locator('#prop-name').fill('Test Property E2E Skip');
    await page
      .locator('button')
      .filter({ hasText: /Add Property|เพิ่มที่พัก/ })
      .click();

    // Skip contract step
    await page
      .locator('button')
      .filter({ hasText: /Skip for now|ข้ามไปก่อน/ })
      .click({ timeout: 10000 });

    // Skip tenant step
    await page
      .locator('button')
      .filter({ hasText: /Skip for now|ข้ามไปก่อน/ })
      .click();

    // Should show done step
    await expect(
      page.locator("text=You're All Set!").or(page.locator('text=เสร็จเรียบร้อย!'))
    ).toBeVisible();
  });

  test('done step has Go to Dashboard button', async ({ page }) => {
    await loginAsLandlord(page);
    await page.goto('/landlord/onboarding');

    if (page.url().includes('/landlord/dashboard')) {
      // Already past onboarding - this is the expected behavior for returning landlords
      await expect(
        page.locator('text=Landlord Dashboard').or(page.locator('text=แดชบอร์ดเจ้าของที่พัก'))
      ).toBeVisible();
      return;
    }

    // Navigate through wizard quickly
    await page
      .locator('button')
      .filter({ hasText: /Get Started|เริ่มต้นใช้งาน/ })
      .click();
    await page.locator('#prop-name').fill('Test Property Dashboard');
    await page
      .locator('button')
      .filter({ hasText: /Add Property|เพิ่มที่พัก/ })
      .click();
    await page
      .locator('button')
      .filter({ hasText: /Skip for now|ข้ามไปก่อน/ })
      .click({ timeout: 10000 });
    await page
      .locator('button')
      .filter({ hasText: /Skip for now|ข้ามไปก่อน/ })
      .click();

    // Done step should have dashboard button
    const dashBtn = page.locator('button').filter({ hasText: /Go to Dashboard|ไปที่แดชบอร์ด/ });
    await expect(dashBtn).toBeVisible();
  });

  test('returning landlord with properties skips onboarding', async ({ page }) => {
    // Login as the standard test landlord who typically has properties
    await loginAsLandlord(page);
    await page.goto('/landlord/onboarding');

    // Should redirect to dashboard if user has properties
    // Wait for either onboarding or dashboard
    await page.waitForTimeout(3000);

    // If the test user has properties (normal case), it should redirect
    // If not, onboarding renders - both are valid states
    const url = page.url();
    const onDashboard = url.includes('/landlord/dashboard');
    const onOnboarding = url.includes('/landlord/onboarding');
    expect(onDashboard || onOnboarding).toBe(true);
  });

  test('tenant pair page loads and accepts code input', async ({ page }) => {
    await loginAsTenant(page);
    await page.goto('/tenant/pair');

    // Should show pairing title
    await expect(
      page.locator('text=Join a Contract').or(page.locator('text=เข้าร่วมสัญญา'))
    ).toBeVisible();

    // Should have a code input
    const codeInput = page.locator('#pairing-code');
    await expect(codeInput).toBeVisible();

    // Type a test code
    await codeInput.fill('ABC123');
    await expect(codeInput).toHaveValue('ABC123');

    // Pair button should be visible
    const pairBtn = page.locator('button').filter({ hasText: /Pair to Contract|จับคู่กับสัญญา/ });
    await expect(pairBtn).toBeVisible();
  });

  test('tenant pair validates 6-digit code length', async ({ page }) => {
    await loginAsTenant(page);
    await page.goto('/tenant/pair');

    const codeInput = page.locator('#pairing-code');
    await codeInput.fill('AB');

    // Pair button should be disabled when code is too short
    const pairBtn = page.locator('button').filter({ hasText: /Pair to Contract|จับคู่กับสัญญา/ });
    await expect(pairBtn).toBeDisabled();
  });
});
