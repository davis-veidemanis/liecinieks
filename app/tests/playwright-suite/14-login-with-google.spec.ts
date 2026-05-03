
import { test } from '@playwright/test';
import { yoloAssertVisible } from './liecinieks-runtime';
import { WEIGHTS, LABELS, IOU_THRESHOLD } from './liecinieks-config';

test('login — Google sign-in button is detected', async ({ page }, testInfo) => {
  await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-test="login-submit"]').waitFor({ state: 'visible' });

  await yoloAssertVisible(page, testInfo, {
    weights: WEIGHTS,
    labels: LABELS,
    label: 'login_with_google',
    verifyLocation: false,
    expectedBbox: { x: 0, y: 0, w: 0, h: 0 },
    iouThreshold: IOU_THRESHOLD,
    negate: false,
  });
});
