// D3: Search input + submit button scaled to 40 % of their normal size
// (60 % cut). DOM box stays positive, toBeVisible() still passes; YOLO
// trained on typical-sized search bars should miss the shrunken one.

import { test } from '@playwright/test';
import { yoloAssertVisible } from '../liecinieks-runtime';
import { WEIGHTS, LABELS, IOU_THRESHOLD } from '../liecinieks-config';
import { DEFECT_D3_SEARCH_SHRINK } from './defects';

test('D3, search bar shrunk to 40% (60% smaller)', async ({ page, context }, testInfo) => {
  await context.addInitScript({ content: DEFECT_D3_SEARCH_SHRINK });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-test="product-name"]').first().waitFor({ state: 'visible' });
  await page.waitForTimeout(400);

  // YOLO assertion under test: Search should be visible. With the defect
  // injected, the model should fail to detect it because the aspect ratio
  // and size break the learned visual signature.
  await yoloAssertVisible(page, testInfo, {
    weights: WEIGHTS,
    labels: LABELS,
    label: 'Search',
    verifyLocation: false,
    expectedBbox: { x: 0, y: 0, w: 0, h: 0 },
    iouThreshold: IOU_THRESHOLD,
    negate: false,
  });
});
