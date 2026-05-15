
export const OVERLAY_SCRIPT = String.raw`
(function () {
  if (window.__liecinieksInitialised) return;
  window.__liecinieksInitialised = true;

  if (!window.__liecinieksState) {
    window.__liecinieksState = {
      recording: true,
      labels: [],
      activeLabel: null,
      verifyLocation: false,
      negate: false,
    };
  }

  const HIGHLIGHT_ID = '__liecinieks-highlight';
  const MENU_ID = '__liecinieks-menu';
  const DIALOG_ID = '__liecinieks-dialog';
  const TAG_ID = '__liecinieks-cursor-tag';
  const HIGHLIGHT_BORDER_NORMAL = '2px solid #4ade80';
  const HIGHLIGHT_FILL_NORMAL = 'rgba(74, 222, 128, 0.16)';
  const HIGHLIGHT_BORDER_ASSERT = '2px solid #06b6d4';
  const HIGHLIGHT_FILL_ASSERT = 'rgba(6, 182, 212, 0.18)';

  function isVisible(el) {
    if (!el || el.nodeType !== 1) return false;
    const style = window.getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none') return false;
    return true;
  }

  function escAttr(value) {
    return String(value).replace(/"/g, '\\"');
  }

  function deriveSelector(el) {
    if (!el || el.nodeType !== 1) return { selector: 'body', fallback: '' };
    if (el.getAttribute('data-test')) {
      return { selector: '[data-test="' + escAttr(el.getAttribute('data-test')) + '"]', fallback: el.getAttribute('data-test') };
    }
    if (el.getAttribute('data-testid')) {
      return { selector: '[data-testid="' + escAttr(el.getAttribute('data-testid')) + '"]', fallback: el.getAttribute('data-testid') };
    }
    if (el.id) {
      return { selector: '[id="' + escAttr(el.id) + '"]', fallback: el.id };
    }
    const role = el.getAttribute('role');
    const text = (el.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 40);
    if (role && text) {
      return {
        selector: 'role=' + role + '[name="' + escAttr(text) + '"]',
        fallback: text,
      };
    }
    if (text && text.length < 50) {
      return { selector: 'text=' + JSON.stringify(text), fallback: text };
    }
    const parts = [];
    let cur = el;
    while (cur && cur.nodeType === 1 && cur !== document.body) {
      const parent = cur.parentElement;
      if (!parent) break;
      const tag = cur.tagName.toLowerCase();
      const sameTag = Array.from(parent.children).filter(function (c) { return c.tagName === cur.tagName; });
      const idx = sameTag.indexOf(cur) + 1;
      parts.unshift(tag + ':nth-of-type(' + idx + ')');
      cur = parent;
    }
    return { selector: parts.join(' > ') || 'body', fallback: el.tagName.toLowerCase() };
  }

  function getBBox(el) {
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
  }

  function isInOurUi(el) {
    if (!el || typeof el.closest !== 'function') return false;
    return !!el.closest('#__liecinieks-menu, #__liecinieks-dialog, #__liecinieks-highlight, #__liecinieks-cursor-tag');
  }

  function isUiOpen() {
    return !!document.getElementById('__liecinieks-menu') ||
           !!document.getElementById('__liecinieks-dialog');
  }

  function isInputElement(el) {
    if (!el || el.nodeType !== 1) return false;
    const tag = el.tagName ? el.tagName.toLowerCase() : '';
    if (tag === 'textarea') return true;
    if (tag === 'input') {
      const t = (el.getAttribute('type') || 'text').toLowerCase();
      const skip = ['button', 'submit', 'reset', 'checkbox', 'radio', 'file', 'hidden', 'image'];
      return skip.indexOf(t) === -1;
    }
    return false;
  }

  let shiftHeld = false;
  let lastMouseX = 0;
  let lastMouseY = 0;

  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Shift' || shiftHeld) return;
    shiftHeld = true;
    updateCursorTag();
    rePaintCurrentHighlight();
  }, true);

  document.addEventListener('keyup', function (ev) {
    if (ev.key !== 'Shift') return;
    shiftHeld = false;
    updateCursorTag();
    rePaintCurrentHighlight();
  }, true);

  window.addEventListener('blur', function () {
    if (!shiftHeld) return;
    shiftHeld = false;
    updateCursorTag();
  });

  let highlightEl = null;
  let highlightTarget = null;
  function ensureHighlight() {
    if (highlightEl && highlightEl.isConnected) return highlightEl;
    highlightEl = document.createElement('div');
    highlightEl.id = HIGHLIGHT_ID;
    highlightEl.style.position = 'fixed';
    highlightEl.style.pointerEvents = 'none';
    highlightEl.style.zIndex = '2147483646';
    highlightEl.style.transition = 'all 60ms ease-out';
    highlightEl.style.boxSizing = 'border-box';
    highlightEl.style.display = 'none';
    applyHighlightStyle();
    document.documentElement.appendChild(highlightEl);
    return highlightEl;
  }

  function applyHighlightStyle() {
    if (!highlightEl) return;
    if (shiftHeld) {
      highlightEl.style.border = HIGHLIGHT_BORDER_ASSERT;
      highlightEl.style.background = HIGHLIGHT_FILL_ASSERT;
    } else {
      highlightEl.style.border = HIGHLIGHT_BORDER_NORMAL;
      highlightEl.style.background = HIGHLIGHT_FILL_NORMAL;
    }
  }

  function rePaintCurrentHighlight() {
    ensureHighlight();
    applyHighlightStyle();
  }

  function moveHighlight(el) {
    const node = ensureHighlight();
    if (!el || !isVisible(el) || el === document.body || el === document.documentElement) {
      node.style.display = 'none';
      highlightTarget = null;
      return;
    }
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) {
      node.style.display = 'none';
      highlightTarget = null;
      return;
    }
    highlightTarget = el;
    applyHighlightStyle();
    node.style.left = r.left + 'px';
    node.style.top = r.top + 'px';
    node.style.width = r.width + 'px';
    node.style.height = r.height + 'px';
    node.style.display = 'block';
  }

  function hideHighlight() {
    const node = ensureHighlight();
    node.style.display = 'none';
    highlightTarget = null;
  }

  function elementUnderCursor(ev) {
    const h = ensureHighlight();
    const prevH = h.style.display;
    h.style.display = 'none';
    const t = document.getElementById(TAG_ID);
    const prevT = t ? t.style.display : null;
    if (t) t.style.display = 'none';
    const target = document.elementFromPoint(ev.clientX, ev.clientY);
    h.style.display = prevH;
    if (t && prevT !== null) t.style.display = prevT;
    return target;
  }

  document.addEventListener('mousemove', function (ev) {
    lastMouseX = ev.clientX;
    lastMouseY = ev.clientY;
    updateCursorTag();
    if (!window.__liecinieksState.recording) return;
    if (isUiOpen()) {
      hideHighlight();
      return;
    }
    if (isInOurUi(ev.target)) {
      hideHighlight();
      return;
    }
    const target = elementUnderCursor(ev);
    if (isInOurUi(target)) {
      hideHighlight();
      return;
    }
    moveHighlight(target);
  }, { capture: true });

  document.addEventListener('mouseout', function () {
    hideHighlight();
  }, { capture: true });

  let tagEl = null;
  function ensureCursorTag() {
    if (tagEl && tagEl.isConnected) return tagEl;
    tagEl = document.createElement('div');
    tagEl.id = TAG_ID;
    tagEl.style.position = 'fixed';
    tagEl.style.pointerEvents = 'none';
    tagEl.style.zIndex = '2147483646';
    tagEl.style.padding = '5px 10px';
    tagEl.style.borderRadius = '6px';
    tagEl.style.fontSize = '12px';
    tagEl.style.fontWeight = '500';
    tagEl.style.fontFamily = 'system-ui, -apple-system, "SF Pro Text", "Segoe UI", Roboto, sans-serif';
    tagEl.style.lineHeight = '1.3';
    tagEl.style.letterSpacing = '0.005em';
    tagEl.style.boxShadow = '0 2px 8px rgba(20,24,31,0.22)';
    tagEl.style.whiteSpace = 'nowrap';
    tagEl.style.display = 'none';
    document.documentElement.appendChild(tagEl);
    return tagEl;
  }

  function updateCursorTag() {
    const node = ensureCursorTag();
    if (!window.__liecinieksState.recording || isUiOpen()) {
      node.style.display = 'none';
      return;
    }
    const st = window.__liecinieksState;
    node.style.fontFamily = 'system-ui, -apple-system, "Segoe UI", sans-serif';
    node.style.textTransform = 'none';
    node.style.letterSpacing = '0';
    node.style.fontWeight = '500';
    if (shiftHeld) {
      const lbl = st.activeLabel;
      if (lbl) {
        const flags = [];
        if (st.verifyLocation) flags.push('+loc');
        if (st.negate) flags.push('NOT');
        const flagStr = flags.length ? '  ' + flags.join(' ') : '';
        node.textContent = 'assert · ' + lbl + flagStr;
        node.style.background = st.negate ? '#f87171' : '#06b6d4';
        node.style.color = '#ffffff';
        node.style.border = '0';
        node.style.fontSize = '12px';
        node.style.opacity = '1';
      } else {
        node.textContent = 'assert · right-click to pick a label';
        node.style.background = '#27272a';
        node.style.color = '#e4e4e7';
        node.style.border = '0';
        node.style.fontSize = '12px';
        node.style.opacity = '1';
      }
    } else {
      node.textContent = 'navigate';
      node.style.background = 'rgba(39, 39, 42, 0.85)';
      node.style.color = '#a1a1aa';
      node.style.border = '0';
      node.style.fontSize = '11px';
      node.style.opacity = '0.85';
    }
    const offsetX = 14;
    const offsetY = 16;
    let left = lastMouseX + offsetX;
    let top = lastMouseY + offsetY;
    node.style.left = '0';
    node.style.top = '0';
    node.style.display = 'block';
    const tw = node.offsetWidth;
    const th = node.offsetHeight;
    const vw = window.innerWidth || 1280;
    const vh = window.innerHeight || 720;
    if (left + tw + 8 > vw) left = Math.max(8, lastMouseX - tw - offsetX);
    if (top + th + 8 > vh) top = Math.max(8, lastMouseY - th - offsetY);
    node.style.left = left + 'px';
    node.style.top = top + 'px';
  }

  function hideCursorTag() {
    const node = ensureCursorTag();
    node.style.display = 'none';
  }

  function spawnFlash(bbox, borderColor, fillColor) {
    if (!bbox || bbox.w < 2 || bbox.h < 2) return;
    const flash = document.createElement('div');
    flash.style.position = 'fixed';
    flash.style.pointerEvents = 'none';
    flash.style.zIndex = '2147483645';
    flash.style.left = bbox.x + 'px';
    flash.style.top = bbox.y + 'px';
    flash.style.width = bbox.w + 'px';
    flash.style.height = bbox.h + 'px';
    flash.style.border = '2px solid ' + borderColor;
    flash.style.background = fillColor;
    flash.style.borderRadius = '4px';
    flash.style.boxSizing = 'border-box';
    flash.style.transformOrigin = 'center center';
    flash.style.transform = 'scale(1)';
    flash.style.opacity = '1';
    flash.style.transition = 'opacity 180ms ease-out, transform 180ms ease-out';
    document.documentElement.appendChild(flash);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        flash.style.opacity = '0';
        flash.style.transform = 'scale(1.06)';
      });
    });
    setTimeout(function () { if (flash.parentNode) flash.parentNode.removeChild(flash); }, 220);
  }

  function flashSuccess(bbox) {
    spawnFlash(bbox, '#4ade80', 'rgba(74, 222, 128, 0.35)');
  }

  function flashRejection(bbox) {
    spawnFlash(bbox, '#fbbf24', 'rgba(251, 191, 36, 0.4)');
  }

  function showInputDialog(title, defaultValue) {
    return new Promise(function (resolve) {
      const old = document.getElementById(DIALOG_ID);
      if (old) old.remove();
      const wrap = document.createElement('div');
      wrap.id = DIALOG_ID;
      wrap.style.position = 'fixed';
      wrap.style.inset = '0';
      wrap.style.background = 'rgba(0,0,0,0.4)';
      wrap.style.zIndex = '2147483647';
      wrap.style.display = 'flex';
      wrap.style.alignItems = 'center';
      wrap.style.justifyContent = 'center';
      wrap.innerHTML =
        '<div style="background:white;color:#1a1a1a;font-family:system-ui,sans-serif;padding:18px 22px;border-radius:8px;min-width:340px;box-shadow:0 8px 30px rgba(0,0,0,0.3);">' +
        '<div style="margin-bottom:10px;font-weight:600;">' + title + '</div>' +
        '<input id="__liecinieks-dialog-input" type="text" value="' + escAttr(defaultValue || '') + '" style="width:100%;padding:8px 10px;border:1px solid #ccc;border-radius:4px;font-size:14px;box-sizing:border-box;" />' +
        '<div style="margin-top:14px;display:flex;justify-content:flex-end;gap:8px;">' +
        '<button id="__liecinieks-dialog-skip" style="padding:6px 14px;border:1px solid #ccc;background:#f5f5f5;border-radius:4px;cursor:pointer;">Skip</button>' +
        '<button id="__liecinieks-dialog-ok" style="padding:6px 14px;border:0;background:#06b6d4;color:white;border-radius:4px;cursor:pointer;font:inherit;font-weight:500;">Add type step</button>' +
        '</div></div>';
      document.documentElement.appendChild(wrap);
      const input = document.getElementById('__liecinieks-dialog-input');
      input.focus();
      input.select();
      function done(value) {
        wrap.remove();
        resolve(value);
      }
      document.getElementById('__liecinieks-dialog-skip').addEventListener('click', function () { done(null); });
      document.getElementById('__liecinieks-dialog-ok').addEventListener('click', function () { done(input.value); });
      input.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') done(input.value);
        if (ev.key === 'Escape') done(null);
      });
    });
  }

  function showLabelMenu() {
    return new Promise(function (resolve) {
      const old = document.getElementById(MENU_ID);
      if (old) old.remove();
      const state = window.__liecinieksState || {};
      const labels = (state.labels || []).slice();
      const initialLabel = state.activeLabel || null;
      const initialVerify = !!state.verifyLocation;
      const initialNegate = !!state.negate;

      const wrap = document.createElement('div');
      wrap.id = MENU_ID;
      wrap.style.position = 'fixed';
      wrap.style.inset = '0';
      wrap.style.zIndex = '2147483647';
      wrap.style.pointerEvents = 'none';

      const backdrop = document.createElement('div');
      backdrop.style.position = 'absolute';
      backdrop.style.inset = '0';
      backdrop.style.background = 'rgba(20, 24, 31, 0.42)';
      backdrop.style.opacity = '0';
      backdrop.style.transition = 'opacity 0.16s ease-out';
      backdrop.style.pointerEvents = 'auto';
      wrap.appendChild(backdrop);

      const bar = document.createElement('div');
      bar.style.position = 'fixed';
      bar.style.top = '0';
      bar.style.right = '0';
      bar.style.bottom = 'auto';
      bar.style.height = 'auto';
      bar.style.width = '400px';
      bar.style.maxWidth = '90vw';
      bar.style.background = '#27272a';
      bar.style.color = '#fafafa';
      bar.style.fontFamily = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
      bar.style.fontSize = '14px';
      bar.style.padding = '18px 20px 20px';
      bar.style.boxShadow = '-8px 0 24px rgba(0,0,0,0.3)';
      bar.style.borderLeft = '1px solid #3f3f46';
      bar.style.borderBottom = '1px solid #3f3f46';
      bar.style.borderBottomLeftRadius = '8px';
      bar.style.display = 'flex';
      bar.style.flexDirection = 'column';
      bar.style.gap = '12px';
      bar.style.transform = 'translateX(100%)';
      bar.style.transition = 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)';
      bar.style.pointerEvents = 'auto';
      bar.style.boxSizing = 'border-box';
      bar.style.zIndex = '2147483647';
      wrap.appendChild(bar);

      requestAnimationFrame(function () {
        bar.style.transform = 'translateX(0)';
        backdrop.style.opacity = '1';
      });

      const hdr = document.createElement('div');
      hdr.style.display = 'flex';
      hdr.style.alignItems = 'center';
      hdr.style.gap = '10px';

      const title = document.createElement('div');
      title.textContent = 'Pick label';
      title.style.fontWeight = '600';
      title.style.fontSize = '15px';
      title.style.letterSpacing = '-0.01em';
      title.style.color = '#fafafa';
      hdr.appendChild(title);

      const hint = document.createElement('span');
      hint.textContent = labels.length + ' labels · Esc to close';
      hint.style.fontSize = '12px';
      hint.style.color = '#71717a';
      hdr.appendChild(hint);

      const spacer1 = document.createElement('div');
      spacer1.style.flex = '1';
      hdr.appendChild(spacer1);

      const closeBtn = document.createElement('button');
      closeBtn.id = '__liecinieks-menu-cancel';
      closeBtn.setAttribute('aria-label', 'Close');
      closeBtn.textContent = '✕';
      closeBtn.style.cssText =
        'padding:4px 9px;border:0;background:#3f3f46;border-radius:4px;' +
        'cursor:pointer;font:inherit;font-size:13px;color:#a1a1aa;line-height:1;';
      hdr.appendChild(closeBtn);
      bar.appendChild(hdr);

      const activeRow = document.createElement('div');
      activeRow.style.display = 'flex';
      activeRow.style.alignItems = 'center';
      activeRow.style.gap = '8px';
      activeRow.style.fontSize = '12.5px';
      activeRow.style.color = '#555c66';
      activeRow.style.padding = '0 2px';
      const activePrefix = document.createElement('span');
      activePrefix.textContent = 'Active:';
      activePrefix.style.color = '#71717a';
      activePrefix.style.fontSize = '12.5px';
      activeRow.appendChild(activePrefix);
      const activeChip = document.createElement('span');
      activeChip.style.padding = '2px 9px';
      activeChip.style.borderRadius = '4px';
      activeChip.style.fontSize = '12.5px';
      activeChip.style.fontWeight = '500';
      if (initialLabel) {
        activeChip.textContent = initialLabel;
        activeChip.style.background = 'rgba(6, 182, 212, 0.16)';
        activeChip.style.color = '#a3adff';
      } else {
        activeChip.textContent = 'none — pick one below';
        activeChip.style.color = '#71717a';
      }
      activeRow.appendChild(activeChip);
      const spacerA = document.createElement('div');
      spacerA.style.flex = '1';
      activeRow.appendChild(spacerA);
      if (initialLabel) {
        const clearBtn = document.createElement('button');
        clearBtn.id = '__liecinieks-menu-clear';
        clearBtn.textContent = 'Clear';
        clearBtn.style.cssText =
          'padding:3px 10px;border:0;background:transparent;color:#a1a1aa;' +
          'border-radius:4px;cursor:pointer;font:inherit;font-size:12px;';
        activeRow.appendChild(clearBtn);
      }
      bar.appendChild(activeRow);

      const toggles = document.createElement('div');
      toggles.style.display = 'flex';
      toggles.style.alignItems = 'center';
      toggles.style.gap = '16px';
      toggles.style.padding = '10px 12px';
      toggles.style.background = '#18181b';
      toggles.style.border = '0';
      toggles.style.borderRadius = '6px';
      toggles.style.flexWrap = 'wrap';

      const verifyRow = document.createElement('label');
      verifyRow.style.display = 'inline-flex';
      verifyRow.style.alignItems = 'center';
      verifyRow.style.gap = '6px';
      verifyRow.style.cursor = 'pointer';
      verifyRow.style.userSelect = 'none';
      verifyRow.style.fontSize = '13px';
      verifyRow.innerHTML =
        '<input type="checkbox" id="__liecinieks-verify-loc" ' + (initialVerify ? 'checked' : '') + ' style="accent-color:#06b6d4;" />' +
        '<span>Verify location</span>';
      toggles.appendChild(verifyRow);

      const negateRow = document.createElement('label');
      negateRow.style.display = 'inline-flex';
      negateRow.style.alignItems = 'center';
      negateRow.style.gap = '6px';
      negateRow.style.cursor = 'pointer';
      negateRow.style.userSelect = 'none';
      negateRow.style.fontSize = '13px';
      negateRow.innerHTML =
        '<input type="checkbox" id="__liecinieks-negate" ' + (initialNegate ? 'checked' : '') + ' style="accent-color:#f87171;" />' +
        '<span>Assert NOT visible</span>';
      toggles.appendChild(negateRow);

      const togHint = document.createElement('span');
      togHint.textContent = 'apply to next Shift+click';
      togHint.style.fontSize = '11.5px';
      togHint.style.color = '#71717a';
      togHint.style.marginLeft = 'auto';
      toggles.appendChild(togHint);

      bar.appendChild(toggles);

      const search = document.createElement('input');
      search.type = 'search';
      search.placeholder = 'Filter labels…';
      search.style.width = '100%';
      search.style.padding = '8px 12px';
      search.style.border = '0';
      search.style.borderRadius = '4px';
      search.style.font = 'inherit';
      search.style.fontSize = '14px';
      search.style.boxSizing = 'border-box';
      search.style.outline = 'none';
      search.style.background = '#18181b';
      search.style.color = '#fafafa';
      search.addEventListener('focus', function () {
        search.style.boxShadow = '0 0 0 2px rgba(6, 182, 212,0.5)';
      });
      search.addEventListener('blur', function () {
        search.style.boxShadow = 'none';
      });
      bar.appendChild(search);

      if (labels.length === 0) {
        const empty = document.createElement('div');
        empty.textContent = 'No labels loaded. Load a model + CSV first.';
        empty.style.color = '#8a929c';
        empty.style.padding = '6px 0';
        bar.appendChild(empty);
      }

      const chips = document.createElement('div');
      chips.style.display = 'flex';
      chips.style.flexWrap = 'wrap';
      chips.style.alignContent = 'flex-start';
      chips.style.gap = '6px';
      chips.style.minHeight = '0';
      chips.style.overflowY = 'auto';
      chips.style.padding = '8px';
      chips.style.background = '#18181b';
      chips.style.border = '0';
      chips.style.borderRadius = '6px';
      const chipEls = [];

      function paintChip(chip, lbl, selected) {
        if (selected) {
          chip.style.background = '#06b6d4';
          chip.style.color = '#ffffff';
        } else {
          chip.style.background = '#3f3f46';
          chip.style.color = '#e4e4e7';
        }
      }

      labels.forEach(function (lbl) {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.textContent = lbl;
        chip.dataset.label = lbl.toLowerCase();
        chip.style.cssText =
          'padding:6px 11px;border:0;background:#3f3f46;color:#e4e4e7;' +
          'border-radius:4px;cursor:pointer;font:inherit;font-size:13px;line-height:1.3;' +
          'transition:background 0.12s,color 0.12s;';
        paintChip(chip, lbl, lbl === initialLabel);
        chip.addEventListener('mouseenter', function () {
          if (lbl !== initialLabel) {
            chip.style.background = '#4e5058';
            chip.style.color = '#ffffff';
          }
        });
        chip.addEventListener('mouseleave', function () {
          if (lbl !== initialLabel) {
            chip.style.background = '#3f3f46';
            chip.style.color = '#e4e4e7';
          }
        });
        chip.addEventListener('click', function () {
          close({
            label: lbl,
            verifyLocation: document.getElementById('__liecinieks-verify-loc').checked,
            negate: document.getElementById('__liecinieks-negate').checked,
          });
        });
        chips.appendChild(chip);
        chipEls.push(chip);
      });
      bar.appendChild(chips);

      search.addEventListener('input', function () {
        const q = search.value.trim().toLowerCase();
        chipEls.forEach(function (c) {
          c.style.display = !q || c.dataset.label.indexOf(q) !== -1 ? '' : 'none';
        });
      });

      function syncBarLayout() {
        const inner = window.innerHeight || 720;
        const outer = window.outerHeight || 0;
        const innerW = window.innerWidth || 1280;
        const outerW = window.outerWidth || 0;
        const chromeOverhead = 90;
        const outerEstimate = outer > 0 ? Math.max(240, outer - chromeOverhead) : inner;
        const visible = Math.min(inner, outerEstimate);
        const breathingRoom = 16;
        const cap = Math.max(220, visible - breathingRoom);
        bar.style.maxHeight = cap + 'px';
        const fixedOverhead = 230;
        const chipsMax = Math.max(80, cap - fixedOverhead);
        chips.style.maxHeight = chipsMax + 'px';
        const rightOffset = outerW > 0 && outerW < innerW ? (innerW - outerW) : 0;
        bar.style.right = rightOffset + 'px';
      }
      syncBarLayout();
      function onWindowResize() { syncBarLayout(); }
      window.addEventListener('resize', onWindowResize);

      document.documentElement.appendChild(wrap);
      backdrop.addEventListener('click', function () {
        const cancel = document.getElementById('__liecinieks-menu-cancel');
        if (cancel) cancel.click();
      });
      setTimeout(function () { search.focus(); }, 0);

      function close(payload) {
        wrap.remove();
        document.removeEventListener('keydown', onKey, true);
        window.removeEventListener('resize', onWindowResize);
        resolve(payload);
      }
      function onKey(ev) {
        if (ev.key === 'Escape') close(null);
      }
      document.addEventListener('keydown', onKey, true);
      document.getElementById('__liecinieks-menu-cancel').addEventListener('click', function () { close(null); });
      const clear = document.getElementById('__liecinieks-menu-clear');
      if (clear) {
        clear.addEventListener('click', function () { close({ label: null, verifyLocation: false, negate: false }); });
      }
    });
  }

  async function handleLeftClick(ev) {
    if (!window.__liecinieksState.recording) return;
    const openMenu = document.getElementById('__liecinieks-menu');
    if (openMenu && !openMenu.contains(ev.target)) {
      ev.preventDefault();
      ev.stopPropagation();
      const cancelBtn = document.getElementById('__liecinieks-menu-cancel');
      if (cancelBtn) cancelBtn.click();
      return;
    }
    if (isInOurUi(ev.target)) return;
    const target = elementUnderCursor(ev);
    if (!target || isInOurUi(target)) return;
    const bbox = getBBox(target);

    if (ev.shiftKey) {
      ev.preventDefault();
      ev.stopPropagation();
      const st = window.__liecinieksState;
      if (!st.activeLabel) {
        flashRejection(bbox);
        return;
      }
      flashSuccess(bbox);
      window.liecinieksHandle({
        kind: 'assertion',
        label: st.activeLabel,
        verifyLocation: !!st.verifyLocation,
        negate: !!st.negate,
        bbox: bbox,
      });
      const sel = window.getSelection && window.getSelection();
      if (sel && sel.removeAllRanges) sel.removeAllRanges();
      return;
    }

    const sel = deriveSelector(target);
    const isInput = isInputElement(target);
    window.liecinieksHandle({
      kind: 'click',
      selector: sel.selector,
      fallbackText: sel.fallback,
      bbox: bbox,
      isInput: isInput,
    });
    if (isInput) {
      const text = await showInputDialog('Type some text? (Skip to record only the click)', '');
      if (text !== null && text !== '') {
        window.liecinieksHandle({
          kind: 'type',
          selector: sel.selector,
          fallbackText: sel.fallback,
          text: text,
        });
      }
    }
  }

  async function handleRightClick(ev) {
    if (!window.__liecinieksState.recording) return;
    if (isInOurUi(ev.target)) return;
    ev.preventDefault();
    ev.stopPropagation();
    const result = await showLabelMenu();
    if (result) {
      window.liecinieksHandle({
        kind: 'set-active-label',
        label: result.label,
        verifyLocation: !!result.verifyLocation,
        negate: !!result.negate,
      });
    }
  }

  document.addEventListener('mousedown', function (ev) {
    if (!ev.shiftKey || ev.button !== 0) return;
    if (!window.__liecinieksState.recording) return;
    if (isInOurUi(ev.target)) return;
    ev.preventDefault();
  }, { capture: true });

  document.addEventListener('selectstart', function (ev) {
    if (!shiftHeld) return;
    if (!window.__liecinieksState.recording) return;
    if (isInOurUi(ev.target)) return;
    ev.preventDefault();
  }, { capture: true });

  document.addEventListener('click', handleLeftClick, { capture: true });
  document.addEventListener('contextmenu', handleRightClick, { capture: true });

  window.__liecinieksRender = function () {
    rePaintCurrentHighlight();
    updateCursorTag();
  };
})();
`;
