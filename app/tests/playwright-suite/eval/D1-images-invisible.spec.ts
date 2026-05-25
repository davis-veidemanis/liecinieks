// D1: opacity:0 on every product image. DOM toBeVisible() still passes;
// YOLO should NOT detect product_image. Expected outcome: assertion fails
// = defect detected.

import { test } from '@playwright/test';
import { yoloAssertVisible } from '../liecinieks-runtime';
import { WEIGHTS, LABELS, IOU_THRESHOLD } from '../liecinieks-config';
import { DEFECT_D1_IMAGES_INVISIBLE } from './defects';

test('D1, product images invisible (opacity 0)', async ({ page, context }, testInfo) => {
  await context.addInitScript({ content: DEFECT_D1_IMAGES_INVISIBLE });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-test="product-name"]').first().waitFor({ state: 'visible' });
  await page.waitForTimeout(600);

  // YOLO assertion under test: product_image should be visible somewhere.
  // With the defect injected, the model should fail to find any.
  await yoloAssertVisible(page, testInfo, {
    weights: WEIGHTS,
    labels: LABELS,
    label: 'product_image',
    verifyLocation: false,
    expectedBbox: { x: 0, y: 0, w: 0, h: 0 },
    iouThreshold: IOU_THRESHOLD,
    negate: false,
  });
});
