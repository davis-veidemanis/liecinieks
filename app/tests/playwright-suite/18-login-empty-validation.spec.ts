// Submitting an empty login form triggers per-field validation. The
// trained model has separate labels for both empty-field errors.

import { test } from '@playwright/test';
import { yoloAssertVisible } from './liecinieks-runtime';
import { WEIGHTS, LABELS, IOU_THRESHOLD } from './liecinieks-config';

test('login, empty submit triggers email + password errors', async ({ page }, testInfo) => {
  await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-test="login-submit"]').waitFor({ state: 'visible' });

  for (const label of ['login_email_err', 'login_password_err']) {
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

  // Focus and then blur each field to trigger Angular's touched-state
  // errors.
  await page.locator('[data-test="email"]').click();
  await page.locator('input[type="password"]').first().click();
  await page.locator('[data-test="email"]').click();
  await page.locator('[data-test="login-submit"]').click();
  await page.waitForTimeout(500);

  for (const label of ['login_email_err', 'login_password_err']) {
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
