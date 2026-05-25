// Defect injection payloads for chapter 6.3 evaluation.
// Each defect is a self-contained string passed to page.addInitScript so
// it runs before the target site's own JS. All three defects are chosen
// so that DOM-only assertions (toBeVisible) still PASS — the element is
// in the DOM with display:block and visibility:visible — but the visual
// signature is destroyed enough that the trained YOLO model should miss
// it. Pure-CSS approach via attribute and class selectors so Angular's
// view encapsulation can't strip the rules.

// D1: paint the product-image area solid magenta. The <img> is forced to
// opacity:0 (Playwright does not consider that a visibility failure) and
// the wrapper underneath gets a magenta background, so the model sees a
// uniform pink-purple rectangle where the trained product photo used to be.
export const DEFECT_D1_IMAGES_INVISIBLE = `
  (function () {
    const style = document.createElement('style');
    style.id = '__defect-d1';
    style.textContent = \`
      .card-img-wrapper,
      .card-img-wrapper * {
        background-color: #d946ef !important;
      }
      .card-img-wrapper img,
      img.card-img-top {
        opacity: 0 !important;
      }
    \`;
    const inject = () => {
      if (document.head && !document.getElementById('__defect-d1')) {
        document.head.appendChild(style);
      }
    };
    if (document.head) inject();
    else document.addEventListener('DOMContentLoaded', inject);
  })();
`;

// D2: shift contact_nav and sign_in_nav so they overlap by ~50 %. Both
// DOM elements remain with their original size and toBeVisible() passes,
// but the rendered nav bar shows one garbled blob where two distinct
// buttons used to be.
export const DEFECT_D2_NAV_OVERLAP = `
  (function () {
    const style = document.createElement('style');
    style.id = '__defect-d2';
    style.textContent = \`
      [data-test="nav-contact"] {
        position: relative !important;
        left: 28px !important;
        background: rgba(255,255,255,0.6) !important;
        z-index: 5 !important;
      }
      [data-test="nav-sign-in"] {
        position: relative !important;
        left: -28px !important;
        background: rgba(255,255,255,0.6) !important;
        z-index: 4 !important;
      }
    \`;
    const inject = () => {
      if (document.head && !document.getElementById('__defect-d2')) {
        document.head.appendChild(style);
      }
    };
    if (document.head) inject();
    else document.addEventListener('DOMContentLoaded', inject);
  })();
`;

// D3: scale the search input + submit to 20 % and strip their visual
// chrome. DOM box stays non-zero, toBeVisible() still passes, but the
// rendered output is a tiny unstyled text field — not the trained
// "Search" visual signature.
export const DEFECT_D3_SEARCH_SHRINK = `
  (function () {
    const style = document.createElement('style');
    style.id = '__defect-d3';
    style.textContent = \`
      [data-test="search-query"] {
        transform: scale(0.2) !important;
        transform-origin: left center !important;
        border: none !important;
        background: transparent !important;
        box-shadow: none !important;
        outline: none !important;
        padding: 0 !important;
      }
      [data-test="search-submit"] {
        transform: scale(0.2) !important;
        transform-origin: left center !important;
        background: transparent !important;
        border: none !important;
        color: transparent !important;
        box-shadow: none !important;
      }
    \`;
    const inject = () => {
      if (document.head && !document.getElementById('__defect-d3')) {
        document.head.appendChild(style);
      }
    };
    if (document.head) inject();
    else document.addEventListener('DOMContentLoaded', inject);
  })();
`;
