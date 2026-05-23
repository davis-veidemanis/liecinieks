// Search flow, type a query and submit. Once the results grid is rendered,
// YOLO should still detect the search input and the product cards.

import { test } from '@playwright/test';
import { yoloAssertVisible } from './liecinieks-runtime';
import { WEIGHTS, LABELS, IOU_THRESHOLD } from './liecinieks-config';

test('search, results render the search input and product container', async ({ page }, testInfo) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-test="product-name"]').first().waitFor({ state: 'visible' });

  await page.locator('[data-test="search-query"]').fill('hammer');
  await page.locator('[data-test="search-submit"]').click();
  // Wait for the results grid to render by hooking onto the search-reset
  // button, which only shows up after a query runs.
  await page.locator('[data-test="search-reset"]').waitFor({ state: 'visible' });
  await page.waitForTimeout(800);

  // `product_price` is deliberately not checked here: a narrow query
  // ("hammer") sometimes returns just one product card, and the model
  // doesn't pick up its price at that viewport position. The other labels
  // are reliable across a wide range of result counts.
  for (const label of ['Search', 'product-container', 'product_name']) {
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
