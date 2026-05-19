
import { test } from '@playwright/test';
import { yoloAssertVisible } from './liecinieks-runtime';
import { WEIGHTS, LABELS, IOU_THRESHOLD } from './liecinieks-config';

test('login — invalid credentials show the auth-error region', async ({ page }, testInfo) => {
  await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-test="login-submit"]').waitFor({ state: 'visible' });

  const loginChrome = ['login_page', 'login_email', 'login_password', 'login_btn'];
  for (const label of loginChrome) {
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

  await page.locator('[data-test="email"]').fill('nobody@example.invalid');
  await page.locator('input[type="password"]').first().fill('definitely-not-the-password');
  await page.locator('[data-test="login-submit"]').click();
  await page.locator('[data-test="login-error"]').waitFor({ state: 'visible' });

  await yoloAssertVisible(page, testInfo, {
    weights: WEIGHTS,
    labels: LABELS,
    label: 'login_invalid_creds_err',
    verifyLocation: false,
    expectedBbox: { x: 0, y: 0, w: 0, h: 0 },
    iouThreshold: IOU_THRESHOLD,
    negate: false,
  });
});
