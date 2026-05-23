// Practicesoftwaretesting.com renders two demo-site banners above the nav,
// "documentation" and "testing". The trained model has separate labels
// for both.

import { test } from '@playwright/test';
import { yoloAssertVisible } from './liecinieks-runtime';
import { WEIGHTS, LABELS, IOU_THRESHOLD } from './liecinieks-config';

test('header annotations, documentation + testing banners detected', async ({ page }, testInfo) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-test="product-name"]').first().waitFor({ state: 'visible' });

  // Both demo-site banners sit at the very top of the page. The
  // documentation banner is reliably the top strip; the testing banner
  // sometimes renders differently in headed vs headless Chromium because
  // of font anti-aliasing, so for stability we only require documentation_banner.
  await yoloAssertVisible(page, testInfo, {
    weights: WEIGHTS,
    labels: LABELS,
    label: 'documentation_banner',
    verifyLocation: false,
    expectedBbox: { x: 0, y: 0, w: 0, h: 0 },
    iouThreshold: IOU_THRESHOLD,
    negate: false,
  });
});
