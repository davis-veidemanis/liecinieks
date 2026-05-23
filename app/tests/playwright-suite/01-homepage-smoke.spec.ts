// Homepage smoke test, load the shop and check that YOLO detects each
// main layout region. The negate checks confirm that PDP and chat elements
// are correctly absent on the homepage.

import { test } from '@playwright/test';
import { yoloAssertVisible } from './liecinieks-runtime';
import { WEIGHTS, LABELS, IOU_THRESHOLD } from './liecinieks-config';

test('homepage smoke, primary layout regions are detected', async ({ page }, testInfo) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-test="product-name"]').first().waitFor({ state: 'visible' });

  // Top-of-page regions that are visible without scrolling.
  const topVisible = [
    'logo',
    'navigation_bar',
    'banner',
    'Sidebar',
    'Search',
    'Sort',
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

  // PDP, chat, cart, and login elements should NOT be present on the homepage.
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

  // Scroll to the bottom so the Footer shows up, then check it.
  // Single-viewport screenshots can't see anything off-screen.
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
