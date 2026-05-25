// DOM baseline for D2: contact_nav and sign_in_nav overlap. Both DOM
// elements remain with normal display/visibility, so toBeVisible() passes
// even though the rendered nav bar is garbled.
import { test, expect } from '@playwright/test';
import { DEFECT_D2_NAV_OVERLAP } from '../defects';

test('D2 dom, nav links overlap', async ({ page, context }) => {
  await context.addInitScript({ content: DEFECT_D2_NAV_OVERLAP });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-test="product-name"]').first().waitFor({ state: 'visible' });
  await expect(page.locator('[data-test="nav-contact"]')).toBeVisible();
  await expect(page.locator('[data-test="nav-sign-in"]')).toBeVisible();
});
