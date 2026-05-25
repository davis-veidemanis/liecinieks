// DOM baseline for S2.
import { test, expect } from '@playwright/test';

test('S2 dom, successful-login removes auth error', async ({ page }) => {
  await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-test="email"]').fill('customer@practicesoftwaretesting.com');
  await page.locator('input[type="password"]').first().fill('welcome01');
  await page.locator('[data-test="login-submit"]').click();
  await page.waitForURL('**/account', { timeout: 15000 }).catch(() => undefined);
  await page.waitForTimeout(500);
  await expect(page.locator('[data-test="login-error"]')).not.toBeVisible();
});
