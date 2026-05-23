// Empty cart, jump straight to the checkout page in a fresh session.
// Nothing has been added, so the cart-line, totals, and checkout button
// regions should NOT be detected.

import { test } from '@playwright/test';
import { yoloAssertVisible } from './liecinieks-runtime';
import { WEIGHTS, LABELS, IOU_THRESHOLD } from './liecinieks-config';

test('empty cart, cart line-items and totals are NOT detected', async ({ page }, testInfo) => {
  // Open the homepage, wait for the product grid (a signal that the SPA
  // has booted), then jump to the cart page. Use page.goto instead of the
  // nav-cart link because the cart icon in the top bar is rendered via a
  // CSS background image (the link itself has no test-id in this build).
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-test="product-name"]').first().waitFor({ state: 'visible' });
  await page.goto('/checkout', { waitUntil: 'domcontentloaded' });
  await page.locator('app-checkout, .container').first().waitFor({ state: 'visible' });
  await page.waitForTimeout(1200);

  const shouldBeAbsent = ['cart_item', 'cart_quantity', 'cart_price', 'cart_total'];

  for (const label of shouldBeAbsent) {
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

  // The page chrome (navigation_bar) should still be there.
  await yoloAssertVisible(page, testInfo, {
    weights: WEIGHTS,
    labels: LABELS,
    label: 'navigation_bar',
    verifyLocation: false,
    expectedBbox: { x: 0, y: 0, w: 0, h: 0 },
    iouThreshold: IOU_THRESHOLD,
    negate: false,
  });

  // Scroll so the Footer is in view, then assert it.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(400);
  await yoloAssertVisible(page, testInfo, {
    weights: WEIGHTS,
    labels: LABELS,
    label: 'Footer',
    verifyLocation: false,
    expectedBbox: { x: 0, y: 0, w: 0, h: 0 },
    iouThreshold: IOU_THRESHOLD,
    negate: false,
  });
});
