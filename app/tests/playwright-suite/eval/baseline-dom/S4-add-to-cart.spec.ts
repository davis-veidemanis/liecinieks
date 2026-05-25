// DOM baseline for S4.
import { test, expect } from '@playwright/test';

test('S4 dom, add-to-cart shows toast and updates cart badge', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page
    .locator('[data-test^="product-"]:not([data-test="product-name"]):not([data-test="product-price"])')
    .first()
    .click();
  await page.locator('[data-test="add-to-cart"]').click();
  await expect(page.locator('[data-test="cart-quantity"]')).toBeVisible();
  // The success toast is the closest DOM equivalent to pdp_cart_confirmation.
  await expect(page.locator('.toast-success, .toast, .alert-success').first()).toBeVisible();
});
