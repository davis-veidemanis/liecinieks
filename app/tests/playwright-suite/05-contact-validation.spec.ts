
import { test } from '@playwright/test';
import { yoloAssertVisible } from './liecinieks-runtime';
import { WEIGHTS, LABELS, IOU_THRESHOLD } from './liecinieks-config';

test('contact form — empty-submit triggers every field error', async ({ page }, testInfo) => {
  await page.goto('/contact', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-test="contact-submit"]').waitFor({ state: 'visible' });

  const upperFields = [
    'contact_us_form',
    'contact_us_firstname',
    'contact_us_lastname',
    'contact_us_email',
    'contact_us_subject',
    'contact_us_message',
  ];
  for (const label of upperFields) {
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
  await page.locator('[data-test="contact-submit"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await yoloAssertVisible(page, testInfo, {
    weights: WEIGHTS,
    labels: LABELS,
    label: 'contact_us_send_btn',
    verifyLocation: false,
    expectedBbox: { x: 0, y: 0, w: 0, h: 0 },
    iouThreshold: IOU_THRESHOLD,
    negate: false,
  });
  for (const label of ['contact_us_firstname_err', 'contact_us_email_err']) {
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

  await page.locator('[data-test="contact-submit"]').click();
  await page.locator('[data-test="first-name-error"]').waitFor({ state: 'visible' });

  const errorsVisible = [
    'contact_us_firstname_err',
    'contact_us_lastname_err',
    'contact_us_subject_err',
    'contact_us_email_err',
  ];
  for (const label of errorsVisible) {
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
