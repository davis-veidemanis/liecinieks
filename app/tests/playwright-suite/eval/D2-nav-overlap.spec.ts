// D2: contact_nav and sign_in_nav shifted to overlap by ~50 %. Both DOM
// elements remain and toBeVisible() still passes; YOLO should fail to
// detect both classes distinctly because the visual signature is garbled
// where two buttons collide.

import { test } from '@playwright/test';
import { yoloAssertVisible } from '../liecinieks-runtime';
import { WEIGHTS, LABELS, IOU_THRESHOLD } from '../liecinieks-config';
import { DEFECT_D2_NAV_OVERLAP } from './defects';

test('D2, contact_nav and sign_in_nav 50% overlap', async ({ page, context }, testInfo) => {
  await context.addInitScript({ content: DEFECT_D2_NAV_OVERLAP });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-test="product-name"]').first().waitFor({ state: 'visible' });
  await page.waitForTimeout(400);

  // YOLO assertion under test: both contact_nav and sign_in_nav should be
  // visible as separate classes. The defect collides them, so at least one
  // should drop out of the model's detection set.
  for (const label of ['contact_nav', 'sign_in_nav']) {
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
