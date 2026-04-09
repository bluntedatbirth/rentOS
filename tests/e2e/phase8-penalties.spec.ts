import { test, expect } from '@playwright/test';
import { loginAsLandlord, loginAsTenant } from './helpers/auth';

test.describe('Phase 8 - Penalties', () => {
  test('landlord penalties page shows filter tabs', async ({ page }) => {
    await loginAsLandlord(page);
    await page.goto('/landlord/penalties');
    // Check filter tabs are visible
    await expect(page.locator('button').filter({ hasText: /All|ทั้งหมด/ })).toBeVisible();
    await expect(page.locator('button').filter({ hasText: /Pending|รอดำเนินการ/ })).toBeVisible();
    await expect(page.locator('button').filter({ hasText: /Confirmed|ยืนยันแล้ว/ })).toBeVisible();
    await expect(page.locator('button').filter({ hasText: /Appealed|อุทธรณ์/ })).toBeVisible();
    await expect(page.locator('button').filter({ hasText: /Resolved|แก้ไขแล้ว/ })).toBeVisible();
    await expect(page.locator('button').filter({ hasText: /Waived|ยกเว้นแล้ว/ })).toBeVisible();
  });

  test('landlord can open raise penalty modal', async ({ page }) => {
    await loginAsLandlord(page);
    await page.goto('/landlord/penalties');
    const raiseButton = page.locator('button').filter({ hasText: /Raise Penalty|สร้างค่าปรับ/ });
    await raiseButton.click();
    // Modal or form should appear with contract select
    await expect(
      page
        .locator('select')
        .or(page.locator('text=Select Contract').or(page.locator('text=เลือกสัญญา')))
    ).toBeVisible();
  });

  test('tenant penalties page loads', async ({ page }) => {
    await loginAsTenant(page);
    await page.goto('/tenant/penalties/appeal');
    await expect(page.locator('text=Penalties').or(page.locator('text=ค่าปรับ'))).toBeVisible();
  });

  // SKIPPED: Requires a seeded contract with parsed clauses, plus multiple role switches
  // (landlord raises, tenant appeals, landlord resolves). Needs dev seed to create full
  // penalty test data. TODO(Phase 2): Add /api/dev/seed-penalty and enable this test.
  test.skip('full penalty lifecycle: raise -> appeal -> resolve', async () => {
    // Would test all 6 status state transitions
  });
});
