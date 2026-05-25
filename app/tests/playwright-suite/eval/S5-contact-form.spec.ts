// S5: Submit a valid contact form, confirm no field-error labels render.
// Chapter 6.1 evaluation scenario 5.

import { test } from '@playwright/test';
import { yoloAssertVisible } from '../liecinieks-runtime';
import { WEIGHTS, LABELS, IOU_THRESHOLD } from '../liecinieks-config';

test('S5 contact-form, no field-error labels after valid submit', async ({ page }, testInfo) => {
  await page.goto('/contact', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-test="contact-submit"]').waitFor({ state: 'visible' });

  await page.locator('[data-test="first-name"]').fill('Test');
  await page.locator('[data-test="last-name"]').fill('User');
  await page.locator('[data-test="email"]').fill('test@example.com');
  await page.locator('[data-test="subject"]').selectOption({ index: 1 });
  await page.locator('[data-test="message"]').fill('This is a valid test message body that is long enough to pass.');
  await page.locator('[data-test="contact-submit"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await page.locator('[data-test="contact-submit"]').click();
  await page.waitForTimeout(1500);

  const errorLabels = [
    'contact_us_firstname_err',
    'contact_us_lastname_err',
    'contact_us_subject_err',
    'contact_us_email_err',
    'contact_us_message_err',
  ];
  for (const label of errorLabels) {
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
