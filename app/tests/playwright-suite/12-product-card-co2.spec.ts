// Every product card on the homepage has a small CO₂ footprint badge.
// The model picks these up reliably (usually 3+ instances per view). This
// test just confirms that the model hits this label every time on a
// fresh homepage load.

import { test } from '@playwright/test';
import { yoloAssertVisible } from './liecinieks-runtime';
import { WEIGHTS, LABELS, IOU_THRESHOLD } from './liecinieks-config';

test('product cards, CO₂ badge detected on homepage cards', async ({ page }, testInfo) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-test="product-name"]').first().waitFor({ state: 'visible' });

  await yoloAssertVisible(page, testInfo, {
    weights: WEIGHTS,
    labels: LABELS,
    label: 'product_co2',
    verifyLocation: false,
    expectedBbox: { x: 0, y: 0, w: 0, h: 0 },
    iouThreshold: IOU_THRESHOLD,
    negate: false,
  });
});
