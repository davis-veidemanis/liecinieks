// Language switcher, clicking the locale toggle opens an expanded dropdown,
// which is a separately labeled region in the trained model.

import { test } from '@playwright/test';
import { yoloAssertVisible } from './liecinieks-runtime';
import { WEIGHTS, LABELS, IOU_THRESHOLD } from './liecinieks-config';

test('language switcher, dropdown expands on click', async ({ page }, testInfo) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-test="language-select"]').waitFor({ state: 'visible' });

  // Before the click: the language toggle is part of the nav, but the
  // expanded panel isn't rendered yet.
  await yoloAssertVisible(page, testInfo, {
    weights: WEIGHTS,
    labels: LABELS,
    label: 'language_nav',
    verifyLocation: false,
    expectedBbox: { x: 0, y: 0, w: 0, h: 0 },
    iouThreshold: IOU_THRESHOLD,
    negate: false,
  });
  await yoloAssertVisible(page, testInfo, {
    weights: WEIGHTS,
    labels: LABELS,
    label: 'nav_locale_expanded',
    verifyLocation: false,
    expectedBbox: { x: 0, y: 0, w: 0, h: 0 },
    iouThreshold: IOU_THRESHOLD,
    negate: true,
  });

  // Click to expand.
  await page.locator('[data-test="language-select"]').click();
  await page.locator('[data-test="lang-en"]').waitFor({ state: 'visible' });

  await yoloAssertVisible(page, testInfo, {
    weights: WEIGHTS,
    labels: LABELS,
    label: 'nav_locale_expanded',
    verifyLocation: false,
    expectedBbox: { x: 0, y: 0, w: 0, h: 0 },
    iouThreshold: IOU_THRESHOLD,
    negate: false,
  });
});
