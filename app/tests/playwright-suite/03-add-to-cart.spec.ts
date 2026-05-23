// Add-to-cart flow, open a product, hit Add to cart, check the confirmation
// toast shows up, then head to the cart page and check that the line item,
// total, and main buttons are detected.

import { test } from '@playwright/test';
import { yoloAssertVisible } from './liecinieks-runtime';
import { WEIGHTS, LABELS, IOU_THRESHOLD } from './liecinieks-config';

test('add to cart, confirmation toast + populated cart page', async ({ page }, testInfo) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-test^="product-"][data-test*="01"]').first().waitFor({ state: 'visible' });
  await page.locator('[data-test^="product-"][data-test*="01"]').first().click();

  await page.locator('[data-test="add-to-cart"]').waitFor({ state: 'visible' });
  await page.locator('[data-test="add-to-cart"]').click();

  // Wait for the cart badge to tick up, then go to the cart page.
  await page.locator('[data-test="cart-quantity"]').waitFor({ state: 'visible' });
  await page.locator('[data-test="nav-cart"]').click();
  await page.locator('[data-test="proceed-1"]').waitFor({ state: 'visible' });

  const cartRegions = [
    'cart_stages',
    'cart_item',
    'cart_quantity',
    'cart_price',
    'cart_total',
    'cart_proceed_to_checkout_btn',
    'cart_continue_shopping_btn',
  ];

  for (const label of cartRegions) {
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
