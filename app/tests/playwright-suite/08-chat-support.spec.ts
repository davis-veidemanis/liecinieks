// Chat support widget, closed by default, the chat panel opens on click.
// Exercises the model on a label that only renders after interaction.

import { test } from '@playwright/test';
import { yoloAssertVisible } from './liecinieks-runtime';
import { WEIGHTS, LABELS, IOU_THRESHOLD } from './liecinieks-config';

test('chat support, opens on click', async ({ page }, testInfo) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-test="chat-toggle"]').waitFor({ state: 'visible' });

  // Before the click: the opened chat panel should NOT be visible. (The
  // closed chat-support toggle is a small fixed icon, and the trained
  // model doesn't reliably catch it in every page state, so we don't
  // assert its visibility, only that the open panel is absent.)
  await yoloAssertVisible(page, testInfo, {
    weights: WEIGHTS,
    labels: LABELS,
    label: 'chat_assistant_open',
    verifyLocation: false,
    expectedBbox: { x: 0, y: 0, w: 0, h: 0 },
    iouThreshold: IOU_THRESHOLD,
    negate: true,
  });

  await page.locator('[data-test="chat-toggle"]').click();
  await page.locator('[data-test="chat-window"]').waitFor({ state: 'visible' });
  await page.waitForTimeout(300);

  await yoloAssertVisible(page, testInfo, {
    weights: WEIGHTS,
    labels: LABELS,
    label: 'chat_assistant_open',
    verifyLocation: false,
    expectedBbox: { x: 0, y: 0, w: 0, h: 0 },
    iouThreshold: IOU_THRESHOLD,
    negate: false,
  });
});
