
import { test } from '@playwright/test';
import { yoloAssertVisible } from './liecinieks-runtime';
import { WEIGHTS, LABELS, IOU_THRESHOLD } from './liecinieks-config';

test('PDP — signature regions visible after clicking a product', async ({ page }, testInfo) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-test^="product-"][data-test*="01"]').first().waitFor({ state: 'visible' });
  await page.locator('[data-test^="product-"][data-test*="01"]').first().click();

  await page.locator('[data-test="add-to-cart"]').waitFor({ state: 'visible' });

  const visible = [
    'product_detail_page',
    'pdp_specifications',
    'pdp_product_description',
    'pdp_add_to_cart_btn',
    'pdp_add_to_favorites_btn',
    'pdp_compare_btn',
    'pdp_item_count',
    'pdp_product_tags',
  ];

  for (const label of visible) {
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

  const absent = ['Sort', 'Filters', 'cart_item', 'cart_total'];
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
