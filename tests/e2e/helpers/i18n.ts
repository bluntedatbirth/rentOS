import { Page, expect } from '@playwright/test';

type Locale = 'th' | 'en';

/**
 * Switches the app language by clicking the language toggle button on the current page.
 * Assumes a toggle button exists that switches between TH and EN.
 *
 * @param page - Playwright Page object
 * @param targetLocale - The locale to switch to ('th' or 'en')
 */
export async function switchLanguage(page: Page, targetLocale: Locale): Promise<void> {
  // The login page toggle shows "English" when in TH mode, and "ภาษาไทย" when in EN mode
  const toggleButton = page.locator('button').filter({
    hasText: targetLocale === 'en' ? /English/ : /ภาษาไทย/,
  });

  // Only click if the toggle is visible (meaning we're in the opposite locale)
  if (await toggleButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await toggleButton.click();
  }
}

/**
 * Verifies that the page is displaying content in the expected locale.
 * Checks for known locale-specific strings.
 *
 * @param page - Playwright Page object
 * @param expectedLocale - The locale to verify ('th' or 'en')
 */
export async function verifyLocale(page: Page, expectedLocale: Locale): Promise<void> {
  if (expectedLocale === 'th') {
    // In Thai mode, the toggle should show "English" (to switch to EN)
    await expect(page.locator('button').filter({ hasText: /English/ })).toBeVisible({
      timeout: 5000,
    });
  } else {
    // In English mode, the toggle should show "ภาษาไทย" (to switch to TH)
    await expect(page.locator('button').filter({ hasText: /ภาษาไทย/ })).toBeVisible({
      timeout: 5000,
    });
  }
}

/**
 * Switches language and verifies the switch was successful.
 */
export async function switchAndVerifyLanguage(page: Page, targetLocale: Locale): Promise<void> {
  await switchLanguage(page, targetLocale);
  await verifyLocale(page, targetLocale);
}
