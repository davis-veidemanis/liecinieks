// Add one line to the cart and then remove it. After removal, the
// cart_item region should disappear and the cart_product_deleted
// confirmation should briefly show up.

import { test } from '@playwright/test';
import { yoloAssertVisible } from './liecinieks-runtime';
import { WEIGHTS, LABELS, IOU_THRESHOLD } from './liecinieks-config';

test('cart, removing the only item empties the cart', async ({ page }, testInfo) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-test^="product-"][data-test*="01"]').first().waitFor({ state: 'visible' });
  await page.locator('[data-test^="product-"][data-test*="01"]').first().click();
  await page.locator('[data-test="add-to-cart"]').waitFor({ state: 'visible' });
  await page.locator('[data-test="add-to-cart"]').click();
  await page.locator('[data-test="cart-quantity"]').waitFor({ state: 'visible' });

  await page.locator('[data-test="nav-cart"]').click();
  await page.locator('[data-test="proceed-1"]').waitFor({ state: 'visible' });

  // Sanity check: before deletion cart_item is visible.
  await yoloAssertVisible(page, testInfo, {
    weights: WEIGHTS,
    labels: LABELS,
    label: 'cart_item',
    verifyLocation: false,
    expectedBbox: { x: 0, y: 0, w: 0, h: 0 },
    iouThreshold: IOU_THRESHOLD,
    negate: false,
  });

  // Click the red remove icon (last cell of the only cart row).
  await page.locator('table tbody tr a.btn-danger').first().click();
  await page.waitForTimeout(1200);

  // After removal: the cart_product_deleted region renders (empty-state
  // message), and the row, totals, and remove icon disappear.
  await yoloAssertVisible(page, testInfo, {
    weights: WEIGHTS,
    labels: LABELS,
    label: 'cart_product_deleted',
    verifyLocation: false,
    expectedBbox: { x: 0, y: 0, w: 0, h: 0 },
    iouThreshold: IOU_THRESHOLD,
    negate: false,
  });
  for (const label of ['cart_item', 'cart_total', 'cart_remove_item']) {
    await yoloAssertVisible(page, testInfo, {
      weights: WEIGHTS,
      labels: LABELS,
      label,
      verifyLocation: false,
      expectedBbox: { x: 0, y: 0, w: 0, h: 0 },
      iouThreshold: IOU_THRESHOLD,
      negate: true,
    });
  }
});
