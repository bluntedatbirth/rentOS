import { test, expect } from '@playwright/test';
import { loginAsLandlord, loginAsTenant } from './helpers/auth';

test.describe('Phase 9 - Notifications', () => {
  test('landlord notification inbox loads', async ({ page }) => {
    await loginAsLandlord(page);
    await page.goto('/landlord/notifications/inbox');
    await expect(
      page.locator('text=Notifications').or(page.locator('text=การแจ้งเตือน'))
    ).toBeVisible();
  });

  test('tenant notification inbox loads', async ({ page }) => {
    await loginAsTenant(page);
    await page.goto('/tenant/notifications');
    await expect(
      page.locator('text=Notifications').or(page.locator('text=การแจ้งเตือน'))
    ).toBeVisible();
  });

  test('landlord notification settings page loads', async ({ page }) => {
    await loginAsLandlord(page);
    await page.goto('/landlord/notifications');
    await expect(
      page.locator('text=Notification Settings').or(page.locator('text=ตั้งค่าการแจ้งเตือน'))
    ).toBeVisible();
    // Verify toggle switches exist
    const switches = page.locator('button[role="switch"]');
    await expect(switches.first()).toBeVisible();
  });

  // SKIPPED: Requires seeded penalty data and real-time subscription to detect badge update.
  // TODO(Phase 2): Add /api/dev/seed-penalty, then confirm penalty and assert unread count.
  test.skip('penalty confirm triggers unread badge', async () => {
    // Needs: seed penalty -> confirm it -> verify notification badge increments
  });
});
