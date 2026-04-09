import { test, expect } from '@playwright/test';
import { loginAsLandlord, loginAsTenant } from './helpers/auth';

test.describe('Phase 2 - Penalty Workflow', () => {
  /**
   * Penalty pages:
   *   Landlord: /landlord/penalties (list with filter tabs, raise modal, resolve appeals)
   *   Tenant:   /tenant/penalties/appeal (list, appeal button, appeal form)
   *
   * Filter tabs: All, Pending, Confirmed, Appealed, Resolved, Waived
   * Penalty card shows: status badge, THB amount, clause reference, description
   */

  test.describe('Landlord Penalties Page', () => {
    test('penalties page loads with title', async ({ page }) => {
      await loginAsLandlord(page);
      await page.goto('/landlord/penalties');

      await expect(page.locator('text=Penalties').or(page.locator('text=ค่าปรับ'))).toBeVisible();
    });

    test('all six filter tabs are visible', async ({ page }) => {
      await loginAsLandlord(page);
      await page.goto('/landlord/penalties');

      const tabs = [
        /All|ทั้งหมด/,
        /Pending|รอดำเนินการ/,
        /Confirmed|ยืนยันแล้ว/,
        /Appealed|อุทธรณ์/,
        /Resolved|แก้ไขแล้ว/,
        /Waived|ยกเว้นแล้ว/,
      ];

      for (const tabPattern of tabs) {
        await expect(page.locator('button').filter({ hasText: tabPattern })).toBeVisible();
      }
    });

    test('clicking filter tab changes active state', async ({ page }) => {
      await loginAsLandlord(page);
      await page.goto('/landlord/penalties');

      // Click "Pending" tab
      const pendingTab = page.locator('button').filter({ hasText: /Pending|รอดำเนินการ/ });
      await pendingTab.click();

      // Active tab should have blue background (bg-blue-600)
      await expect(pendingTab).toHaveClass(/bg-blue-600/);

      // Click "All" tab
      const allTab = page.locator('button').filter({ hasText: /All|ทั้งหมด/ });
      await allTab.click();

      // All tab should now be active
      await expect(allTab).toHaveClass(/bg-blue-600/);
    });

    test('each filter tab can be clicked without error', async ({ page }) => {
      await loginAsLandlord(page);
      await page.goto('/landlord/penalties');

      const tabTexts = [
        /Pending|รอดำเนินการ/,
        /Confirmed|ยืนยันแล้ว/,
        /Appealed|อุทธรณ์/,
        /Resolved|แก้ไขแล้ว/,
        /Waived|ยกเว้นแล้ว/,
        /All|ทั้งหมด/,
      ];

      for (const tabText of tabTexts) {
        const tab = page.locator('button').filter({ hasText: tabText });
        await tab.click();
        // Tab should become active (no crash, no error)
        await expect(tab).toHaveClass(/bg-blue-600/);
      }
    });

    test('Raise Penalty button is visible', async ({ page }) => {
      await loginAsLandlord(page);
      await page.goto('/landlord/penalties');

      const raiseBtn = page.locator('button').filter({ hasText: /Raise Penalty|สร้างค่าปรับ/ });
      await expect(raiseBtn).toBeVisible();
    });

    test('Raise Penalty button opens modal', async ({ page }) => {
      await loginAsLandlord(page);
      await page.goto('/landlord/penalties');

      await page
        .locator('button')
        .filter({ hasText: /Raise Penalty|สร้างค่าปรับ/ })
        .click();

      // Modal should appear with contract select
      await expect(page.locator('select').first()).toBeVisible();

      // Modal title should show "Raise Penalty"
      await expect(
        page.locator('h3').filter({ hasText: /Raise Penalty|สร้างค่าปรับ/ })
      ).toBeVisible();
    });

    test('raise penalty modal has cancel button', async ({ page }) => {
      await loginAsLandlord(page);
      await page.goto('/landlord/penalties');

      await page
        .locator('button')
        .filter({ hasText: /Raise Penalty|สร้างค่าปรับ/ })
        .click();

      // Cancel button in modal
      const cancelBtn = page.locator('button').filter({ hasText: /Cancel|ยกเลิก/ });
      await expect(cancelBtn).toBeVisible();

      // Click cancel to close modal
      await cancelBtn.click();

      // Modal should be closed (no more h3 with Raise Penalty)
      await expect(
        page.locator('h3').filter({ hasText: /Raise Penalty|สร้างค่าปรับ/ })
      ).not.toBeVisible();
    });

    test('penalty list shows empty state or penalty cards', async ({ page }) => {
      await loginAsLandlord(page);
      await page.goto('/landlord/penalties');

      const penaltyCard = page.locator('.shadow-sm').first();
      const emptyMsg = page
        .locator('text=No penalties found')
        .or(page.locator('text=ไม่พบค่าปรับ'));

      await expect(penaltyCard.or(emptyMsg)).toBeVisible({ timeout: 10000 });
    });

    test('penalty card shows clause reference when data exists', async ({ page }) => {
      await loginAsLandlord(page);
      await page.goto('/landlord/penalties');

      await page.waitForTimeout(2000);

      // If penalty cards exist, they should show a clause reference
      const clauseRef = page.locator('text=Clause').or(page.locator('text=ข้อ'));
      const emptyMsg = page
        .locator('text=No penalties found')
        .or(page.locator('text=ไม่พบค่าปรับ'));

      await expect(clauseRef.first().or(emptyMsg)).toBeVisible();
    });
  });

  test.describe('Tenant Penalties Page', () => {
    test('tenant penalties page loads with title', async ({ page }) => {
      await loginAsTenant(page);
      await page.goto('/tenant/penalties/appeal');

      await expect(page.locator('text=Penalties').or(page.locator('text=ค่าปรับ'))).toBeVisible();
    });

    test('tenant sees penalty list or empty state', async ({ page }) => {
      await loginAsTenant(page);
      await page.goto('/tenant/penalties/appeal');

      const penaltyCard = page.locator('.shadow-sm').first();
      const emptyMsg = page.locator('text=No penalties').or(page.locator('text=ไม่มีค่าปรับ'));

      await expect(penaltyCard.or(emptyMsg)).toBeVisible({ timeout: 10000 });
    });

    test('tenant penalty amounts show THB symbol when data exists', async ({ page }) => {
      await loginAsTenant(page);
      await page.goto('/tenant/penalties/appeal');

      await page.waitForTimeout(2000);

      const bahtSymbol = page.locator('text=/฿/');
      const emptyMsg = page.locator('text=No penalties').or(page.locator('text=ไม่มีค่าปรับ'));

      await expect(bahtSymbol.first().or(emptyMsg)).toBeVisible();
    });

    test('tenant penalty card shows clause reference', async ({ page }) => {
      await loginAsTenant(page);
      await page.goto('/tenant/penalties/appeal');

      await page.waitForTimeout(2000);

      const clauseRef = page.locator('text=Clause').or(page.locator('text=ข้อ'));
      const emptyMsg = page.locator('text=No penalties').or(page.locator('text=ไม่มีค่าปรับ'));

      await expect(clauseRef.first().or(emptyMsg)).toBeVisible();
    });
  });

  // Seed-dependent: Full penalty lifecycle
  test.describe('Penalty Lifecycle (seed-dependent)', () => {
    // SKIPPED: Requires POST /api/dev/seed-penalty to create penalty data.
    // TODO(Phase 2): Enable once the fullstack-engineer delivers seed-penalty endpoint.
    test.skip('tenant can submit an appeal with notes', async () => {
      // 1. Seed a confirmed penalty via /api/dev/seed-penalty
      // 2. Login as tenant, go to /tenant/penalties/appeal
      // 3. Find penalty with "Appeal This Penalty" button, click it
      // 4. Fill in appeal note, submit
      // 5. Verify status changes to appealed / appeal note shows in blue box
    });

    test.skip('landlord sees appealed penalties in queue', async () => {
      // 1. Seed a penalty with status=pending_tenant_appeal
      // 2. Login as landlord, go to /landlord/penalties
      // 3. Click "Appealed" tab
      // 4. Verify the seeded penalty shows in the filtered list
      // 5. Verify "Resolve" button is visible
    });

    test.skip('landlord can resolve an appeal (uphold/reduce/waive)', async () => {
      // 1. Seed appealed penalty
      // 2. Login as landlord, click "Resolve"
      // 3. Choose "Uphold", fill resolution note, submit
      // 4. Verify penalty status changes to resolved
    });

    test.skip('full penalty lifecycle: raise -> confirm -> appeal -> resolve', async () => {
      // Full cross-role test requiring both seed-contract and seed-penalty endpoints
    });
  });
});
