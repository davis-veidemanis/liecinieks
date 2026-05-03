
import { test } from '@playwright/test';
import { yoloAssertVisible } from './liecinieks-runtime';
import { WEIGHTS, LABELS, IOU_THRESHOLD } from './liecinieks-config';

test('forgot password — form + email field detected after click', async ({ page }, testInfo) => {
  await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-test="forgot-password-link"]').waitFor({ state: 'visible' });
  await page.locator('[data-test="forgot-password-link"]').click();
  await page.waitForURL('**/forgot-password');
  await page.waitForTimeout(500);

  for (const label of ['forgot_password_from', 'forgot_password_email']) {
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
