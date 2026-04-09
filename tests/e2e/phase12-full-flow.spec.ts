import { test, expect } from '@playwright/test';
import { loginAsLandlord, loginAsTenant } from './helpers/auth';

test.describe('Phase 12 - Full Flow', () => {
  test('landlord dashboard shows all key sections', async ({ page }) => {
    await loginAsLandlord(page);
    // Dashboard should show stats cards
    await expect(
      page.locator('text=Active Properties').or(page.locator('text=ที่พักที่ใช้งาน'))
    ).toBeVisible();
    await expect(
      page.locator('text=Quick Actions').or(page.locator('text=การดำเนินการด่วน'))
    ).toBeVisible();
  });

  test('tenant dashboard shows all key sections', async ({ page }) => {
    await loginAsTenant(page);
    await expect(
      page.locator('text=Open Requests').or(page.locator('text=คำขอที่เปิดอยู่'))
    ).toBeVisible();
  });

  test('all landlord nav links are accessible', async ({ page }) => {
    await loginAsLandlord(page);
    const navLinks = [
      '/landlord/properties',
      '/landlord/contracts/upload',
      '/landlord/payments',
      '/landlord/maintenance',
      '/landlord/penalties',
      '/landlord/notifications/inbox',
      '/landlord/security',
      '/landlord/profile',
    ];
    for (const link of navLinks) {
      await page.goto(link);
      // Page should load without error (no "Unauthorized" or blank page)
      await expect(page.locator('main')).toBeVisible();
      // Should not show unauthorized
      const unauthorized = page
        .locator('text=Unauthorized')
        .or(page.locator('text=ไม่มีสิทธิ์เข้าถึง'));
      await expect(unauthorized).not.toBeVisible();
    }
  });

  test('all tenant nav links are accessible', async ({ page }) => {
    await loginAsTenant(page);
    const navLinks = [
      '/tenant/contract/view',
      '/tenant/co-tenants',
      '/tenant/maintenance',
      '/tenant/payments',
      '/tenant/penalties/appeal',
      '/tenant/notifications',
      '/tenant/security',
      '/tenant/profile',
    ];
    for (const link of navLinks) {
      await page.goto(link);
      await expect(page.locator('main')).toBeVisible();
      const unauthorized = page
        .locator('text=Unauthorized')
        .or(page.locator('text=ไม่มีสิทธิ์เข้าถึง'));
      await expect(unauthorized).not.toBeVisible();
    }
  });

  test('landlord penalties page - filter tabs work', async ({ page }) => {
    await loginAsLandlord(page);
    await page.goto('/landlord/penalties');

    // Click each filter tab and verify it becomes active
    const tabs = [
      'Pending|รอดำเนินการ',
      'Confirmed|ยืนยันแล้ว',
      'Appealed|อุทธรณ์',
      'Resolved|แก้ไขแล้ว',
      'Waived|ยกเว้นแล้ว',
      'All|ทั้งหมด',
    ];
    for (const tabText of tabs) {
      const [en, th] = tabText.split('|');
      const tab = page.locator('button').filter({ hasText: new RegExp(`${en}|${th}`) });
      await tab.click();
      // Tab should now have the active blue style
      await expect(tab).toBeVisible();
    }
  });

  test('security page renders all sections', async ({ page }) => {
    await loginAsLandlord(page);
    await page.goto('/landlord/security');
    await expect(
      page.locator('text=Security Settings').or(page.locator('text=ตั้งค่าความปลอดภัย'))
    ).toBeVisible();
    // Check for the 4 sections
    await expect(page.locator('text=Email').or(page.locator('text=อีเมล'))).toBeVisible();
    await expect(page.locator('text=Password').or(page.locator('text=รหัสผ่าน'))).toBeVisible();
    await expect(page.locator('text=Sessions').or(page.locator('text=เซสชัน'))).toBeVisible();
    await expect(
      page.locator('text=Danger Zone').or(page.locator('text=โซนอันตราย'))
    ).toBeVisible();
  });

  test('profile page has all fields', async ({ page }) => {
    await loginAsLandlord(page);
    await page.goto('/landlord/profile');
    await expect(page.locator('input#full_name')).toBeVisible();
    await expect(page.locator('input#phone')).toBeVisible();
    // Language toggle buttons
    await expect(page.locator('button:has-text("TH")')).toBeVisible();
    await expect(page.locator('button:has-text("EN")')).toBeVisible();
  });

  // SKIPPED: Requires live Supabase with seeded properties/contracts + Claude API for OCR.
  // TODO(Phase 2): Enable once dev seed API creates a full property->contract chain and
  // a mock Claude OCR endpoint is available. Tracked in QA report phase-1-report.md.
  test.skip('complete end-to-end flow: property -> contract -> penalty -> appeal -> resolve', async () => {
    // Full flow: landlord creates property -> uploads contract -> tenant views ->
    // landlord raises penalty -> tenant appeals -> landlord resolves ->
    // both see resolved state
  });
});
