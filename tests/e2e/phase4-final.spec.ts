import { test, expect } from '@playwright/test';
import { loginAsLandlord, loginAsTenant } from './helpers/auth';

// ---------------------------------------------------------------------------
// Phase 4 – Final E2E Test Suite
// Covers three test domains:
//   A) Landlord complete journey (multi-page navigation + content verification)
//   B) Error handling / auth isolation (unauthenticated access, role mismatch)
//   C) Mobile viewport (375px, no horizontal scroll, bottom nav, form usability)
// All selectors use bilingual .or() patterns (Thai / English) throughout.
// ---------------------------------------------------------------------------

// ============================================================================
// A) LANDLORD COMPLETE JOURNEY
// ============================================================================

test.describe('Phase 4 - Landlord Complete Journey', () => {
  test('landlord login lands on dashboard with stats visible', async ({ page }) => {
    await loginAsLandlord(page);

    // Confirm URL
    expect(page.url()).toContain('/landlord/dashboard');

    // Dashboard heading
    await expect(
      page.locator('text=Landlord Dashboard').or(page.locator('text=แดชบอร์ดเจ้าของที่พัก'))
    ).toBeVisible({ timeout: 10000 });

    // Stats section — at least one stat card should be present
    await expect(
      page.locator('text=Active Properties').or(page.locator('text=ที่พักที่ใช้งาน'))
    ).toBeVisible();

    // Quick Actions section
    await expect(
      page.locator('text=Quick Actions').or(page.locator('text=การดำเนินการด่วน'))
    ).toBeVisible();
  });

  test('landlord navigates to properties page and list renders', async ({ page }) => {
    await loginAsLandlord(page);
    await page.goto('/landlord/properties');

    // Page title
    await expect(
      page.locator('text=Properties').or(page.locator('text=ที่พัก')).first()
    ).toBeVisible();

    // Either property cards exist or the empty state is shown
    const propertyCard = page.locator('.shadow-sm, .shadow-md, .rounded-lg').first();
    const emptyMsg = page
      .locator('text=No properties')
      .or(page.locator('text=ยังไม่มีที่พัก'))
      .or(page.locator('text=Add your first property'))
      .or(page.locator('text=เพิ่มที่พักแรกของคุณ'));

    await expect(propertyCard.or(emptyMsg)).toBeVisible({ timeout: 10000 });
  });

  test('landlord navigates to payments page and status filters work', async ({ page }) => {
    await loginAsLandlord(page);
    await page.goto('/landlord/payments');

    // Page heading
    await expect(
      page.locator('text=Payments').or(page.locator('text=การชำระเงิน')).first()
    ).toBeVisible();

    // The Create Payment button should always be present for landlords
    await expect(
      page.locator('button').filter({ hasText: /Create Payment|สร้างการชำระเงิน/ })
    ).toBeVisible();

    // Status filter tabs / selects — at minimum the page does not error out
    // Filter buttons like All / Pending / Paid (if present)
    const filterEl = page
      .locator('button')
      .filter({ hasText: /All|ทั้งหมด|Pending|รอชำระ|Paid|ชำระแล้ว/ })
      .first();

    // If filter tabs exist, click the first one and verify page stays stable
    const filterCount = await filterEl.count();
    if (filterCount > 0) {
      await filterEl.click();
      await expect(page.locator('main')).toBeVisible();
    }
  });

  test('landlord navigates to billing/upgrade page and pricing displays', async ({ page }) => {
    await loginAsLandlord(page);
    await page.goto('/landlord/billing/upgrade');

    // Upgrade page heading
    await expect(
      page
        .locator('text=Choose Your Plan')
        .or(page.locator('text=เลือกแผนของคุณ'))
        .or(page.locator('h1'))
    ).toBeVisible({ timeout: 10000 });

    // Free and Pro plan cards
    await expect(page.locator('text=Free').or(page.locator('text=ฟรี')).first()).toBeVisible();

    await expect(page.locator('text=Pro').or(page.locator('text=โปร')).first()).toBeVisible();

    // Monthly price should be visible
    await expect(page.locator('text=฿199')).toBeVisible();

    // Upgrade Now CTA
    await expect(
      page
        .locator('button')
        .filter({ hasText: /Upgrade Now|อัพเกรดตอนนี้|Get Started|เริ่มต้น/ })
        .first()
    ).toBeVisible();
  });

  test('landlord navigates to notification settings and toggles are present', async ({ page }) => {
    await loginAsLandlord(page);
    await page.goto('/landlord/notifications');

    await expect(
      page.locator('text=Notification Settings').or(page.locator('text=ตั้งค่าการแจ้งเตือน'))
    ).toBeVisible({ timeout: 10000 });

    // At least one toggle switch should be rendered
    const switches = page.locator('button[role="switch"]');
    await expect(switches.first()).toBeVisible();
  });

  test('landlord navigates to notification inbox', async ({ page }) => {
    await loginAsLandlord(page);
    await page.goto('/landlord/notifications/inbox');

    await expect(
      page.locator('text=Notifications').or(page.locator('text=การแจ้งเตือน')).first()
    ).toBeVisible({ timeout: 10000 });

    // Page loads without error
    await expect(page.locator('main')).toBeVisible();

    // Should not show generic error or unauthorized
    await expect(page.locator('text=Unauthorized')).not.toBeVisible();
    await expect(page.locator('text=500')).not.toBeVisible();
  });
});

// ============================================================================
// B) ERROR HANDLING & AUTH ISOLATION
// ============================================================================

test.describe('Phase 4 - Error Handling', () => {
  test('unauthenticated user accessing /landlord/dashboard is redirected to /login', async ({
    page,
  }) => {
    // Navigate directly without logging in
    await page.goto('/landlord/dashboard');
    // Should redirect to login
    await page.waitForURL('**/login', { timeout: 15000 });
    expect(page.url()).toContain('/login');
  });

  test('unauthenticated user accessing /landlord/properties is redirected to /login', async ({
    page,
  }) => {
    await page.goto('/landlord/properties');
    await page.waitForURL('**/login', { timeout: 15000 });
    expect(page.url()).toContain('/login');
  });

  test('unauthenticated user accessing /tenant/dashboard is redirected to /login', async ({
    page,
  }) => {
    await page.goto('/tenant/dashboard');
    await page.waitForURL('**/login', { timeout: 15000 });
    expect(page.url()).toContain('/login');
  });

  test('tenant accessing /landlord/* is redirected to tenant dashboard', async ({ page }) => {
    await loginAsTenant(page);
    await page.goto('/landlord/dashboard');
    // Should redirect to tenant area
    await page.waitForURL('**/tenant/**', { timeout: 15000 });
    expect(page.url()).toContain('/tenant/');
  });

  test('landlord accessing /tenant/* is redirected to landlord dashboard', async ({ page }) => {
    await loginAsLandlord(page);
    await page.goto('/tenant/dashboard');
    // Should redirect to landlord area
    await page.waitForURL('**/landlord/**', { timeout: 15000 });
    expect(page.url()).toContain('/landlord/');
  });

  test('API call to protected endpoint without auth returns 401', async ({ page }) => {
    // Use page.evaluate to make a fetch without credentials
    await page.goto('/login');

    const status = await page.evaluate(async () => {
      const res = await fetch('/api/billing/status', {
        method: 'GET',
        credentials: 'omit',
      });
      return res.status;
    });

    expect(status).toBe(401);
  });

  test('API call to properties endpoint without auth returns 401', async ({ page }) => {
    await page.goto('/login');

    const status = await page.evaluate(async () => {
      const res = await fetch('/api/properties', {
        method: 'GET',
        credentials: 'omit',
      });
      return res.status;
    });

    expect(status).toBe(401);
  });

  test('API call to billing checkout without auth returns 401', async ({ page }) => {
    await page.goto('/login');

    const status = await page.evaluate(async () => {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'monthly' }),
      });
      return res.status;
    });

    expect(status).toBe(401);
  });

  test('API call to payments endpoint without auth returns 401', async ({ page }) => {
    await page.goto('/login');

    const status = await page.evaluate(async () => {
      const res = await fetch('/api/payments', {
        method: 'GET',
        credentials: 'omit',
      });
      return res.status;
    });

    expect(status).toBe(401);
  });
});

// ============================================================================
// C) MOBILE VIEWPORT (375px)
// ============================================================================

test.describe('Phase 4 - Mobile Viewport', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('landlord dashboard renders without horizontal scroll at 375px', async ({ page }) => {
    await loginAsLandlord(page);

    // scrollWidth should equal clientWidth — no horizontal overflow
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalScroll).toBe(false);
  });

  test('landlord properties page renders without horizontal scroll at 375px', async ({ page }) => {
    await loginAsLandlord(page);
    await page.goto('/landlord/properties');

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalScroll).toBe(false);
  });

  test('landlord payments page renders without horizontal scroll at 375px', async ({ page }) => {
    await loginAsLandlord(page);
    await page.goto('/landlord/payments');

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalScroll).toBe(false);
  });

  test('tenant dashboard renders without horizontal scroll at 375px', async ({ page }) => {
    await loginAsTenant(page);

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalScroll).toBe(false);
  });

  test('bottom nav is visible and functional on mobile', async ({ page }) => {
    await loginAsLandlord(page);

    // BottomNav should be visible at 375px
    const bottomNav = page.locator('nav.fixed.bottom-0');
    await expect(bottomNav).toBeVisible();

    // All 4 tabs should be present
    const navLinks = bottomNav.locator('a');
    await expect(navLinks).toHaveCount(4);

    // Tapping the Properties tab should navigate correctly
    const propertiesLink = bottomNav.locator('a[href="/landlord/properties"]');
    await propertiesLink.click();
    await page.waitForURL('**/landlord/properties', { timeout: 10000 });
    expect(page.url()).toContain('/landlord/properties');
  });

  test('tenant bottom nav is visible and functional on mobile', async ({ page }) => {
    await loginAsTenant(page);

    const bottomNav = page.locator('nav.fixed.bottom-0');
    await expect(bottomNav).toBeVisible();

    // Payments tab navigates correctly
    const paymentsLink = bottomNav.locator('a[href="/tenant/payments"]');
    await paymentsLink.click();
    await page.waitForURL('**/tenant/payments', { timeout: 10000 });
    expect(page.url()).toContain('/tenant/payments');
  });

  test('Create Payment form fields are usable on mobile', async ({ page }) => {
    await loginAsLandlord(page);
    await page.goto('/landlord/payments');

    // Open the form
    const createBtn = page.locator('button').filter({ hasText: /Create Payment|สร้างการชำระเงิน/ });
    await createBtn.click();

    // Form should be visible and inputs should be interactable
    const amountInput = page.locator('input[type="number"]');
    await expect(amountInput).toBeVisible();

    // Input should be clickable and accept text on mobile
    await amountInput.click();
    await amountInput.fill('5000');
    await expect(amountInput).toHaveValue('5000');

    // Date input should be visible
    const dateInput = page.locator('input[type="date"]');
    await expect(dateInput).toBeVisible();

    // Close form cleanly
    await page
      .locator('button')
      .filter({ hasText: /Cancel|ยกเลิก/ })
      .click();
  });

  test('login form is usable at mobile viewport', async ({ page }) => {
    await page.goto('/login');

    // Email input should be visible and fillable
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    await emailInput.fill('test@example.com');
    await expect(emailInput).toHaveValue('test@example.com');

    // Submit button should be fully visible (not cut off)
    const submitBtn = page
      .locator('button[type="submit"]')
      .or(page.locator('button').filter({ hasText: /Send Magic Link|ส่งลิงก์เวทมนตร์/ }));
    await expect(submitBtn).toBeVisible();

    // No horizontal scroll on login page at mobile
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalScroll).toBe(false);
  });
});
