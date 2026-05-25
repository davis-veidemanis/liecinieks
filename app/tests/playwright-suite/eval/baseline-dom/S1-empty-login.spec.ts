// DOM baseline for S1.
import { test, expect } from '@playwright/test';

test('S1 dom, empty-login error states visible', async ({ page }) => {
  await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-test="login-submit"]').click();
  await expect(page.locator('[data-test="email-error"]')).toBeVisible();
  await expect(page.locator('[data-test="password-error"]')).toBeVisible();
  await expect(page.locator('[data-test="login-error"]')).not.toBeVisible();
});
