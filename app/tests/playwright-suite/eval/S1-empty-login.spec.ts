// S1: Empty login submission triggers per-field errors.
// Chapter 6.1 evaluation scenario 1.

import { test } from '@playwright/test';
import { yoloAssertVisible } from '../liecinieks-runtime';
import { WEIGHTS, LABELS, IOU_THRESHOLD } from '../liecinieks-config';

test('S1 empty-login, email + password errors visible after blank submit', async ({ page }, testInfo) => {
  await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-test="login-submit"]').waitFor({ state: 'visible' });

  await page.locator('[data-test="login-submit"]').click();
  await page.locator('[data-test="email-error"]').waitFor({ state: 'visible' });

  // After submit: the two per-field errors visible, the invalid-creds error is not.
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
  await yoloAssertVisible(page, testInfo, {
    weights: WEIGHTS,
    labels: LABELS,
    label: 'login_invalid_creds_err',
    verifyLocation: false,
    expectedBbox: { x: 0, y: 0, w: 0, h: 0 },
    iouThreshold: IOU_THRESHOLD,
    negate: true,
  });
});
