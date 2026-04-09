import { test, expect } from '@playwright/test';
import { loginAsLandlord } from './helpers/auth';

test.describe('Phase 5 - Contract Management', () => {
  // SKIPPED: Requires Supabase Storage for file upload + Claude API for OCR processing.
  // TODO(Phase 2): Mock the /api/contracts/ocr endpoint or use a local OCR stub so this
  // test can run without external dependencies. See docs/qa-reports/phase-1-report.md.
  test.skip('upload contract and OCR processing', async () => {
    // Would test: upload test fixture -> poll until OCR completes -> clause list renders
  });

  test('landlord can view contract upload page', async ({ page }) => {
    await loginAsLandlord(page);
    await page.goto('/landlord/contracts/upload');
    await expect(
      page.locator('text=Upload Contract').or(page.locator('text=อัปโหลดสัญญา'))
    ).toBeVisible();
  });

  test('landlord properties page loads', async ({ page }) => {
    await loginAsLandlord(page);
    await page.goto('/landlord/properties');
    // Should see properties page
    await expect(page.locator('h2').or(page.locator('h1'))).toBeVisible();
  });
});
