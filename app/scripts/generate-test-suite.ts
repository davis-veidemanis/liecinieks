// Generates a Playwright test suite by feeding programmatically built
// Scenario objects to the Liecinieks app's actual exporter.
// The `.spec.ts`, `liecinieks-runtime.ts`, and `liecinieks-inference.py`
// files produced here are byte-identical to what the app UI would write
// via the Export Playwright… action.
//
// Run with:
//   node --experimental-strip-types scripts/generate-test-suite.ts
//
// (The strip-types flag needs Node 22+.)

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { exportPlaywright } from '../src/main-modules/codegen.ts';
import type { Scenario, Step } from '../src/types.ts';

// Repo root is one level above this script's directory (the `app/` folder).
const REPO = path.resolve(import.meta.dirname, '..');
// Outer monorepo root, one level above REPO; holds yolo-results/ and yolo-training/.
const LIECINIEKS = path.resolve(import.meta.dirname, '..', '..');
// Model weights live in the outer repo (~50 MB).
const WEIGHTS = path.resolve(LIECINIEKS, 'yolo-results/runs/YOLOv12s/weights/best.pt');
// The labels CSV is small and lives in the app repo.
const LABELS = path.join(REPO, 'yolo-data', 'labels.csv');
const OUT = path.join(REPO, 'tests', 'playwright-suite-generated');

const VIEWPORT = { width: 1440, height: 900 };
const DSF = 1;
const BASE = 'https://practicesoftwaretesting.com';

let stepCounter = 0;
// Produce a fresh padded step id like "s0001" for each call.
function nextId(): string {
  stepCounter += 1;
  return `s${String(stepCounter).padStart(4, '0')}`;
}

// Shorthand for a click/navigate step.
function nav(selector: string, fallbackText = ''): Step {
  return { id: nextId(), type: 'navigate', selector, fallbackText };
}
// Shorthand for a "type into selector" step.
function typeStep(selector: string, text: string): Step {
  return { id: nextId(), type: 'type', selector, text };
}
// Shorthand for a visibility assertion step (default verifyLocation off).
function assertVisible(label: string, negate = false): Step {
  return {
    id: nextId(),
    type: 'assert-visible',
    label,
    verifyLocation: false,
    expectedBbox: { x: 0, y: 0, w: 0, h: 0 },
    iouThreshold: 0.5,
    negate,
  };
}
// Build one assertVisible step per label in the list.
function assertList(labels: string[], negate = false): Step[] {
  return labels.map((l) => assertVisible(l, negate));
}

// Wrap step list and metadata into a Scenario record for the exporter.
function scenario(name: string, startUrl: string, steps: Step[]): Scenario {
  return {
    name,
    createdAt: new Date().toISOString(),
    viewport: VIEWPORT,
    deviceScaleFactor: DSF,
    modelLabels: [],
    startUrl,
    steps,
  };
}

const scenarios: Scenario[] = [
  // 01, homepage smoke test (above the fold only; the app doesn't have a scroll
  // step yet, so the Footer assertion from the hand-written suite is skipped).
  scenario('01 homepage smoke', `${BASE}/`, [
    ...assertList([
      'logo',
      'navigation_bar',
      'banner',
      'Sidebar',
      'Search',
      'Sort',
      'product-container',
      'product_image',
      'product_name',
      'product_price',
    ]),
    ...assertList(
      ['chat_assistant_open', 'pdp_specifications', 'cart_item', 'login_page'],
      true,
    ),
  ]),

  // 02, PDP visibility.
  scenario('02 pdp visibility', `${BASE}/`, [
    nav('[data-test^="product-"]:not([data-test="product-name"]):not([data-test="product-price"])'),
    ...assertList([
      'product_detail_page',
      'pdp_specifications',
      'pdp_product_description',
      'pdp_add_to_cart_btn',
      'pdp_add_to_favorites_btn',
      'pdp_compare_btn',
      'pdp_item_count',
      'pdp_product_tags',
    ]),
    ...assertList(['Sort', 'Filters', 'cart_item', 'cart_total'], true),
  ]),

  // 03, add to cart and view a filled cart.
  scenario('03 add to cart', `${BASE}/`, [
    nav('[data-test^="product-"]:not([data-test="product-name"]):not([data-test="product-price"])'),
    nav('[data-test="add-to-cart"]'),
    nav('[data-test="nav-cart"]'),
    ...assertList([
      'cart_stages',
      'cart_item',
      'cart_quantity',
      'cart_price',
      'cart_total',
      'cart_proceed_to_checkout_btn',
      'cart_continue_shopping_btn',
    ]),
  ]),

  // 04, empty cart (nothing has been added).
  scenario('04 cart empty', `${BASE}/checkout`, [
    ...assertList(['cart_item', 'cart_quantity', 'cart_price', 'cart_total'], true),
    assertVisible('navigation_bar'),
  ]),

  // 05, contact form: empty submit triggers per-field errors.
  scenario('05 contact validation', `${BASE}/contact`, [
    ...assertList([
      'contact_us_form',
      'contact_us_firstname',
      'contact_us_lastname',
      'contact_us_email',
      'contact_us_subject',
      'contact_us_message',
    ]),
    ...assertList(['contact_us_firstname_err', 'contact_us_email_err'], true),
    nav('[data-test="contact-submit"]'),
    ...assertList([
      'contact_us_firstname_err',
      'contact_us_lastname_err',
      'contact_us_subject_err',
      'contact_us_email_err',
    ]),
  ]),

  // 06, invalid login credentials show the auth error.
  scenario('06 login invalid creds', `${BASE}/auth/login`, [
    ...assertList(['login_page', 'login_email', 'login_password', 'login_btn']),
    assertVisible('login_invalid_creds_err', true),
    typeStep('[data-test="email"]', 'nobody@example.invalid'),
    typeStep('input[type="password"]', 'definitely-not-the-password'),
    nav('[data-test="login-submit"]'),
    assertVisible('login_invalid_creds_err'),
  ]),

  // 07, language switcher: dropdown expands on click.
  scenario('07 language switcher', `${BASE}/`, [
    assertVisible('language_nav'),
    assertVisible('nav_locale_expanded', true),
    nav('[data-test="language-select"]'),
    assertVisible('nav_locale_expanded'),
  ]),

  // 08, chat support opens on click.
  scenario('08 chat support', `${BASE}/`, [
    assertVisible('chat_assistant_open', true),
    nav('[data-test="chat-toggle"]'),
    assertVisible('chat_assistant_open'),
  ]),

  // 09, header annotation banners.
  scenario('09 header annotations', `${BASE}/`, [assertVisible('documentation_banner')]),

  // 10, each top-nav link is its own labeled region.
  scenario('10 nav link presence', `${BASE}/`, [
    ...assertList(['home_nav', 'categories_nav', 'contact_nav', 'sign_in_nav', 'language_nav']),
  ]),

  // 11, homepage sidebar widgets.
  scenario('11 homepage sidebar', `${BASE}/`, [...assertList(['Sidebar', 'price_range'])]),

  // 12, CO2 badge on product cards.
  scenario('12 product card co2', `${BASE}/`, [assertVisible('product_co2')]),

  // 14, login page Google OAuth button.
  scenario('14 login with google', `${BASE}/auth/login`, [assertVisible('login_with_google')]),

  // 15, search flow.
  scenario('15 search flow', `${BASE}/`, [
    typeStep('[data-test="search-query"]', 'hammer'),
    nav('[data-test="search-submit"]'),
    ...assertList(['Search', 'product-container', 'product_name']),
  ]),

  // 17, removing an item from the cart.
  scenario('17 cart item removal', `${BASE}/`, [
    nav('[data-test^="product-"]:not([data-test="product-name"]):not([data-test="product-price"])'),
    nav('[data-test="add-to-cart"]'),
    nav('[data-test="nav-cart"]'),
    assertVisible('cart_item'),
    nav('table tbody tr a.btn-danger'),
    assertVisible('cart_product_deleted'),
    ...assertList(['cart_item', 'cart_total', 'cart_remove_item'], true),
  ]),

  // 18, empty login submit triggers per-field errors.
  scenario('18 login empty validation', `${BASE}/auth/login`, [
    ...assertList(['login_email_err', 'login_password_err'], true),
    nav('[data-test="email"]'),
    nav('input[type="password"]'),
    nav('[data-test="email"]'),
    nav('[data-test="login-submit"]'),
    ...assertList(['login_email_err', 'login_password_err']),
  ]),

  // 19, forgot password.
  scenario('19 forgot password', `${BASE}/auth/login`, [
    nav('[data-test="forgot-password-link"]'),
    ...assertList(['forgot_password_from', 'forgot_password_email']),
  ]),
];

// Wipe the output dir and re-emit all spec files plus Playwright scaffolding.
async function main(): Promise<void> {
  await fs.mkdir(OUT, { recursive: true });
  // Wipe regenerable artifacts, but keep node_modules and package-lock so
  // we don't have to run npm install on every refresh.
  for (const entry of await fs.readdir(OUT)) {
    if (entry === 'node_modules' || entry === 'package-lock.json') continue;
    await fs.rm(path.join(OUT, entry), { recursive: true, force: true });
  }

  console.log(`generating ${scenarios.length} specs into ${OUT}…`);
  for (const sc of scenarios) {
    const result = await exportPlaywright(sc, OUT, WEIGHTS, LABELS);
    console.log('  +', path.basename(result.specFile));
  }

  // Write the Playwright project scaffolding around the generated spec files.
  await fs.writeFile(
    path.join(OUT, 'package.json'),
    JSON.stringify(
      {
        name: 'liecinieks-test-suite-generated',
        version: '1.0.0',
        private: true,
        scripts: {
          test: 'playwright test',
          report: 'playwright show-report',
        },
        devDependencies: {
          '@playwright/test': '^1.59.1',
          typescript: '^5.9.3',
        },
      },
      null,
      2,
    ) + '\n',
    'utf-8',
  );

  await fs.writeFile(
    path.join(OUT, 'playwright.config.ts'),
    `import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    headless: true,
    testIdAttribute: 'data-test',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
`,
    'utf-8',
  );

  await fs.writeFile(
    path.join(OUT, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'CommonJS',
          moduleResolution: 'Node',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
        },
      },
      null,
      2,
    ) + '\n',
    'utf-8',
  );

  console.log(`done. ${scenarios.length} specs + scaffolding written.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
