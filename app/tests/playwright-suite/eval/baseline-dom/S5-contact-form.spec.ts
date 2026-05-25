// DOM baseline for S5.
import { test, expect } from '@playwright/test';

test('S5 dom, contact-form valid submit has no field errors', async ({ page }) => {
  await page.goto('/contact', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-test="first-name"]').fill('Test');
  await page.locator('[data-test="last-name"]').fill('User');
  await page.locator('[data-test="email"]').fill('test@example.com');
  await page.locator('[data-test="subject"]').selectOption({ index: 1 });
  await page.locator('[data-test="message"]').fill('This is a valid test message body that is long enough to pass.');
  await page.locator('[data-test="contact-submit"]').click();
  await page.waitForTimeout(1500);
  await expect(page.locator('[data-test="first-name-error"]')).not.toBeVisible();
  await expect(page.locator('[data-test="last-name-error"]')).not.toBeVisible();
  await expect(page.locator('[data-test="email-error"]')).not.toBeVisible();
  await expect(page.locator('[data-test="subject-error"]')).not.toBeVisible();
  await expect(page.locator('[data-test="message-error"]')).not.toBeVisible();
});
