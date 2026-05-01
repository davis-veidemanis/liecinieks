
import { test } from '@playwright/test';
import { yoloAssertVisible } from './liecinieks-runtime';
import { WEIGHTS, LABELS, IOU_THRESHOLD } from './liecinieks-config';

test('empty cart — cart line-items and totals are NOT detected', async ({ page }, testInfo) => {
  await page.goto('/checkout', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');

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

  for (const label of ['navigation_bar', 'Footer']) {
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
