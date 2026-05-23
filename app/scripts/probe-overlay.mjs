// Standalone probe that injects the overlay script into a throwaway Chromium
// page and triggers showLabelMenu with a synthetic right-click. Used to check
// the menu layout without going through the full Liecinieks recording flow.

import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OVERLAY_TS = resolve(HERE, '..', 'src', 'main-modules', 'overlay.ts');
const OUT_DIR = '/tmp/liecinieks-probe';

// Drive a headless Chromium through the overlay sidebar and snapshot each visible state.
async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const overlayText = await fs.readFile(OVERLAY_TS, 'utf-8');
  // Pull out the JS payload between String.raw` ... `;
  const m = overlayText.match(/export const OVERLAY_SCRIPT = String\.raw`([\s\S]*?)`;\s*$/m);
  if (!m) throw new Error('Could not extract OVERLAY_SCRIPT from overlay.ts');
  const script = m[1];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  await context.exposeBinding('liecinieksHandle', async (_source, payload) => {
    console.log('[overlay event]', JSON.stringify(payload));
  });

  await context.addInitScript({ content: script });

  const labels = [
    'banner', 'cart_continue_shopping_btn', 'cart_item', 'cart_nav_bar',
    'cart_price', 'cart_proceed_to_checkout_btn', 'cart_product_deleted',
    'cart_quantity', 'cart_remove_item', 'cart_stages', 'cart_total',
    'Categories', 'categories_nav', 'chat-support', 'chat_assistant_open',
    'compare_btn', 'contact_nav', 'contact_us_attachment', 'contact_us_email',
    'contact_us_email_err', 'contact_us_firstname', 'contact_us_firstname_err',
    'contact_us_form', 'contact_us_lastname', 'contact_us_lastname_err',
    'contact_us_message', 'contact_us_message_err', 'contact_us_send_btn',
    'contact_us_subject', 'contact_us_subject_err', 'documentation_banner',
    'eco_tag', 'Filters', 'Footer', 'forgot_password_email',
    'home_nav', 'language_nav', 'login_btn', 'login_email',
    'login_password', 'logo', 'navigation_bar', 'page_count',
    'pdp_add_to_cart_btn', 'pdp_compare_btn', 'product_image', 'product_name',
    'product_price', 'rentals_page', 'Search', 'Sidebar', 'sign_in_nav',
    'sort_expanded', 'Sort', 'testing_banner',
  ];

  const page = await context.newPage();
  await page.goto(
    'data:text/html,' +
      encodeURIComponent(`
        <html><body style="font:14px system-ui;padding:60px;background:#f5f7fb;">
          <h1 id="hd">Right-click me to open the assertion menu</h1>
          <p style="max-width:540px;line-height:1.5;color:#555;">
            This is a probe page. The overlay script has been injected; right-clicking
            should slide a sidebar in from the right with the label menu inside it.
          </p>
          <button id="btn" style="padding:10px 16px;">A page button</button>
        </body></html>
      `),
  );

  // Seed the labels into the overlay state.
  await page.evaluate((labels) => {
    window.__liecinieksState = {
      recording: true,
      mode: 'normal',
      bulkLabel: null,
      bulkVerifyLocation: false,
      labels,
    };
  }, labels);

  // Synthetic right-click on the heading.
  await page.click('#hd', { button: 'right' });

  // Wait for the menu to mount, then for the slide-in transition to finish.
  await page.waitForSelector('#__liecinieks-menu', { state: 'attached' });
  await page.waitForTimeout(260);

  // Read the computed sidebar layout so we can debug without screenshots.
  const layout = await page.evaluate(() => {
    const menu = document.getElementById('__liecinieks-menu');
    if (!menu) return null;
    const bar = menu.children[1]; // [0] backdrop, [1] bar
    const rect = bar.getBoundingClientRect();
    const okBtn = document.getElementById('__liecinieks-menu-ok');
    const bulkBtn = document.getElementById('__liecinieks-menu-bulk');
    const okRect = okBtn ? okBtn.getBoundingClientRect() : null;
    const bulkRect = bulkBtn ? bulkBtn.getBoundingClientRect() : null;
    return {
      vpW: window.innerWidth,
      vpH: window.innerHeight,
      bar: { x: rect.left, y: rect.top, w: rect.width, h: rect.height },
      ok: okRect && { x: okRect.left, y: okRect.top, w: okRect.width, h: okRect.height, visible: okRect.top < window.innerHeight && okRect.bottom > 0 },
      bulk: bulkRect && { x: bulkRect.left, y: bulkRect.top, w: bulkRect.width, h: bulkRect.height, visible: bulkRect.top < window.innerHeight && bulkRect.bottom > 0 },
    };
  });
  console.log('[layout]', JSON.stringify(layout, null, 2));

  await page.screenshot({ path: `${OUT_DIR}/sidebar-default.png`, fullPage: false });

  // Click one chip so we can see the selected state.
  await page.evaluate(() => {
    const chip = Array.from(document.querySelectorAll('#__liecinieks-menu button')).find(
      (b) => b.textContent === 'logo',
    );
    if (chip) chip.click();
  });
  await page.waitForTimeout(100);
  await page.screenshot({ path: `${OUT_DIR}/sidebar-selected.png`, fullPage: false });

  // Type into the search box.
  await page.fill('#__liecinieks-menu input[type="search"]', 'cart');
  await page.waitForTimeout(100);
  await page.screenshot({ path: `${OUT_DIR}/sidebar-filtered.png`, fullPage: false });

  console.log('[probe] screenshots in', OUT_DIR);
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
