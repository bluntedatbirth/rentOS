import { test, expect } from '@playwright/test';
import { loginAsLandlord } from './helpers/auth';

// ---------------------------------------------------------------------------
// Phase 3 – Billing API Endpoint Tests
//
// These tests call the billing REST API directly via fetch() inside a
// Playwright page context so that session cookies are forwarded correctly.
//
// Endpoints covered:
//   POST /api/billing/checkout  – mock checkout, upgrades tier
//   GET  /api/billing/status    – returns current tier info
//   POST /api/billing/cancel    – downgrades to free
//   POST /api/contracts/compare – expected to 404 if not implemented
// ---------------------------------------------------------------------------

test.describe('Phase 3 - Billing API: POST /api/billing/checkout', () => {
  test('returns 200 and success payload for plan=monthly', async ({ page }) => {
    await loginAsLandlord(page);

    const result = await page.evaluate(async () => {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'monthly' }),
      });
      const data = await res.json();
      return { status: res.status, data };
    });

    expect(result.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.tier).toBe('pro');
    expect(result.data.billing_cycle).toBe('monthly');
    expect(result.data.tier_expires_at).toBeTruthy();
  });

  test('returns 200 and success payload for plan=yearly', async ({ page }) => {
    await loginAsLandlord(page);

    const result = await page.evaluate(async () => {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'yearly' }),
      });
      const data = await res.json();
      return { status: res.status, data };
    });

    expect(result.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.tier).toBe('pro');
    expect(result.data.billing_cycle).toBe('yearly');
  });

  test('returns 400 for invalid plan value', async ({ page }) => {
    await loginAsLandlord(page);

    const result = await page.evaluate(async () => {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'weekly' }), // invalid
      });
      const data = await res.json();
      return { status: res.status, data };
    });

    expect(result.status).toBe(400);
  });

  test('returns 400 for missing plan field', async ({ page }) => {
    await loginAsLandlord(page);

    const result = await page.evaluate(async () => {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      return { status: res.status, data };
    });

    expect(result.status).toBe(400);
  });

  test('returns 401 when unauthenticated', async ({ page }) => {
    // Do NOT login — hit the endpoint cold
    await page.goto('/');

    const result = await page.evaluate(async () => {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'monthly' }),
      });
      return { status: res.status };
    });

    expect(result.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------

test.describe('Phase 3 - Billing API: GET /api/billing/status', () => {
  test('returns 200 with tier info for authenticated user', async ({ page }) => {
    await loginAsLandlord(page);

    const result = await page.evaluate(async () => {
      const res = await fetch('/api/billing/status');
      const data = await res.json();
      return { status: res.status, data };
    });

    expect(result.status).toBe(200);
    // tier must be 'free' or 'pro'
    expect(['free', 'pro']).toContain(result.data.tier);
    // billing_cycle must be present
    expect(result.data.billing_cycle).toBeTruthy();
    // tier_expires_at is nullable — just verify key exists
    expect('tier_expires_at' in result.data).toBe(true);
  });

  test('returns tier=free for a freshly-cancelled subscription', async ({ page }) => {
    await loginAsLandlord(page);

    // 1. Upgrade to pro
    await page.evaluate(async () => {
      await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'monthly' }),
      });
    });

    // 2. Cancel immediately
    await page.evaluate(async () => {
      await fetch('/api/billing/cancel', { method: 'POST' });
    });

    // 3. Status should now return free
    const result = await page.evaluate(async () => {
      const res = await fetch('/api/billing/status');
      const data = await res.json();
      return { status: res.status, data };
    });

    expect(result.status).toBe(200);
    expect(result.data.tier).toBe('free');
    expect(result.data.tier_expires_at).toBeNull();
  });

  test('returns 401 when unauthenticated', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(async () => {
      const res = await fetch('/api/billing/status');
      return { status: res.status };
    });

    expect(result.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------

test.describe('Phase 3 - Billing API: POST /api/billing/cancel', () => {
  test('returns 200 and success payload', async ({ page }) => {
    await loginAsLandlord(page);

    // Ensure user is on pro first
    await page.evaluate(async () => {
      await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'monthly' }),
      });
    });

    const result = await page.evaluate(async () => {
      const res = await fetch('/api/billing/cancel', { method: 'POST' });
      const data = await res.json();
      return { status: res.status, data };
    });

    expect(result.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.tier).toBe('free');
  });

  test('cancelling a free-tier account returns 200 (idempotent)', async ({ page }) => {
    await loginAsLandlord(page);

    // Cancel without upgrading first (already free)
    const result = await page.evaluate(async () => {
      const res = await fetch('/api/billing/cancel', { method: 'POST' });
      const data = await res.json();
      return { status: res.status, data };
    });

    // Should succeed idempotently
    expect(result.status).toBe(200);
    expect(result.data.tier).toBe('free');
  });

  test('returns 401 when unauthenticated', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(async () => {
      const res = await fetch('/api/billing/cancel', { method: 'POST' });
      return { status: res.status };
    });

    expect(result.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------

test.describe('Phase 3 - Billing API: Full Upgrade/Downgrade Cycle', () => {
  test('checkout -> status -> cancel -> status round-trip', async ({ page }) => {
    await loginAsLandlord(page);

    // Step 1: Upgrade monthly
    const upgradeResult = await page.evaluate(async () => {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'monthly' }),
      });
      return res.json();
    });
    expect(upgradeResult.tier).toBe('pro');

    // Step 2: Status reflects pro
    const statusAfterUpgrade = await page.evaluate(async () => {
      const res = await fetch('/api/billing/status');
      return res.json();
    });
    expect(statusAfterUpgrade.tier).toBe('pro');
    expect(statusAfterUpgrade.billing_cycle).toBe('monthly');

    // Step 3: Cancel
    const cancelResult = await page.evaluate(async () => {
      const res = await fetch('/api/billing/cancel', { method: 'POST' });
      return res.json();
    });
    expect(cancelResult.tier).toBe('free');

    // Step 4: Status reflects free
    const statusAfterCancel = await page.evaluate(async () => {
      const res = await fetch('/api/billing/status');
      return res.json();
    });
    expect(statusAfterCancel.tier).toBe('free');
  });

  test('checkout yearly and verify tier_expires_at is ~365 days out', async ({ page }) => {
    await loginAsLandlord(page);

    const result = await page.evaluate(async () => {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'yearly' }),
      });
      const data = await res.json();
      return data;
    });

    expect(result.tier).toBe('pro');
    const expiresAt = new Date(result.tier_expires_at as string);
    const now = new Date();
    const diffDays = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    // Should be approximately 365 days (±2 day tolerance)
    expect(diffDays).toBeGreaterThan(363);
    expect(diffDays).toBeLessThan(367);
  });
});

// ---------------------------------------------------------------------------

test.describe('Phase 3 - Contracts Compare API', () => {
  test('POST /api/contracts/compare returns 400 or 404 for missing params', async ({ page }) => {
    await loginAsLandlord(page);

    const result = await page.evaluate(async () => {
      const res = await fetch('/api/contracts/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      return { status: res.status };
    });

    // Endpoint not yet implemented → 404, OR implemented with validation → 400
    expect([400, 404, 405]).toContain(result.status);
  });
});
