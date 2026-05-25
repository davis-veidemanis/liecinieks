// DOM baseline for S3.
import { test, expect } from '@playwright/test';

test('S3 dom, product cards rendered with image+name+price', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-test="product-name"]').first().waitFor({ state: 'visible' });
  const cards = page.locator(
    '[data-test^="product-"]:not([data-test="product-name"]):not([data-test="product-price"])',
  );
  expect(await cards.count()).toBeGreaterThan(0);
  await expect(page.locator('[data-test="product-name"]').first()).toBeVisible();
  await expect(page.locator('[data-test="product-price"]').first()).toBeVisible();
  await expect(cards.first().locator('img').first()).toBeVisible();
});
