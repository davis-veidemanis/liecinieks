// S4: Add a product to cart and verify the success toast renders.
// Chapter 6.1 evaluation scenario 4.

import { test } from '@playwright/test';
import { yoloAssertVisible } from '../liecinieks-runtime';
import { WEIGHTS, LABELS, IOU_THRESHOLD } from '../liecinieks-config';

test('S4 add-to-cart, confirmation toast + cart nav appear', async ({ page }, testInfo) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page
    .locator('[data-test^="product-"]:not([data-test="product-name"]):not([data-test="product-price"])')
    .first()
    .waitFor({ state: 'visible' });
  await page
    .locator('[data-test^="product-"]:not([data-test="product-name"]):not([data-test="product-price"])')
    .first()
    .click();
  await page.locator('[data-test="add-to-cart"]').waitFor({ state: 'visible' });
  await page.locator('[data-test="add-to-cart"]').click();
  // Wait for the cart-quantity badge to update in the top bar.
  await page.locator('[data-test="cart-quantity"]').waitFor({ state: 'visible' });
  await page.waitForTimeout(400);

  for (const label of ['pdp_cart_confirmation', 'cart_nav_bar']) {
    await yoloAssertVisible(page, testInfo, {
      weights: WEIGHTS,
      labels: LABELS,
      label,
      verifyLocation: false,
      expectedBbox: { x: 0, y: 0, w: 0, h: 0 },
      iouThreshold: IOU_THRESHOLD,
      negate: false,
    });
  }
});
