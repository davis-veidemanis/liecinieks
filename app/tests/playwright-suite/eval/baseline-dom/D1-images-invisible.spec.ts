// DOM baseline for D1: opacity:0 on product images. Playwright's
// toBeVisible() does NOT check opacity, so the assertion should pass
// even though the image is visually invisible.
import { test, expect } from '@playwright/test';
import { DEFECT_D1_IMAGES_INVISIBLE } from '../defects';

test('D1 dom, product images invisible (opacity 0)', async ({ page, context }) => {
  await context.addInitScript({ content: DEFECT_D1_IMAGES_INVISIBLE });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-test="product-name"]').first().waitFor({ state: 'visible' });
  const firstCard = page.locator(
    '[data-test^="product-"]:not([data-test="product-name"]):not([data-test="product-price"])',
  ).first();
  await expect(firstCard.locator('img').first()).toBeVisible();
});
