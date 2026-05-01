
import { test } from '@playwright/test';
import { yoloAssertVisible } from './liecinieks-runtime';
import { WEIGHTS, LABELS, IOU_THRESHOLD } from './liecinieks-config';

test('homepage smoke — primary layout regions are detected', async ({ page }, testInfo) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-test="product-name"]').first().waitFor({ state: 'visible' });

  const topVisible = [
    'logo',
    'navigation_bar',
    'banner',
    'Sidebar',
    'Footer',
    'Search',
    'Sort',
    'Categories',
    'Filters',
    'product-container',
    'product_image',
    'product_name',
    'product_price',
  ];

  for (const label of topVisible) {
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

  const absent = ['chat_assistant_open', 'pdp_specifications', 'cart_item', 'login_page'];
  for (const label of absent) {
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
