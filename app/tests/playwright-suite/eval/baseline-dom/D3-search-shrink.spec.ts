// DOM baseline for D3: search input scaled to 40%. CSS transform does
// not change the layout box, so toBeVisible() still passes — DOM has no
// way to know the rendered output is shrunken.
import { test, expect } from '@playwright/test';
import { DEFECT_D3_SEARCH_SHRINK } from '../defects';

test('D3 dom, search bar shrunk to 40%', async ({ page, context }) => {
  await context.addInitScript({ content: DEFECT_D3_SEARCH_SHRINK });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-test="product-name"]').first().waitFor({ state: 'visible' });
  await expect(page.locator('[data-test="search-query"]')).toBeVisible();
  await expect(page.locator('[data-test="search-submit"]')).toBeVisible();
});
