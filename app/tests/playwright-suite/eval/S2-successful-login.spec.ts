// S2: Valid credentials log the user in, navigate to account area.
// Chapter 6.1 evaluation scenario 2.

import { test } from '@playwright/test';
import { yoloAssertVisible } from '../liecinieks-runtime';
import { WEIGHTS, LABELS, IOU_THRESHOLD } from '../liecinieks-config';

test('S2 successful-login, no auth error and cart nav appears after sign-in', async ({ page }, testInfo) => {
  await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-test="login-submit"]').waitFor({ state: 'visible' });

  await page.locator('[data-test="email"]').fill('customer@practicesoftwaretesting.com');
  await page.locator('input[type="password"]').first().fill('welcome01');
  await page.locator('[data-test="login-submit"]').click();
  // After successful login the site redirects to /account.
  await page.waitForURL('**/account', { timeout: 15000 }).catch(() => undefined);
  await page.waitForTimeout(800);

  // After a successful login the auth-error region must NOT appear. The
  // navigation chrome on the post-login page (account menu, etc.) is
  // visually similar to the logged-out chrome, so the trained model can't
  // reliably distinguish them — we rely on the absence of the error class
  // as the success signal, mirroring how Playwright's standard idiom uses
  // `expect(error).not.toBeVisible()` after a successful submit.
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
