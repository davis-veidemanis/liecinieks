// Wraps a Playwright Chromium instance that the Liecinieks app uses to
// record user actions on a target page. The main process owns a single host
// at a time, opens a new headed browser per scenario, and forwards every
// overlay event back to the renderer over IPC.

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { screen, type BrowserWindow } from 'electron';
import { OVERLAY_SCRIPT } from './overlay';
import { IPC } from '../ipc-channels';
import type { ViewportSize } from '../types';

// Work out the device-scale-factor needed to fit a large viewport on the user's screen.
function computeFitScale(viewport: ViewportSize): number {
  const display = screen.getPrimaryDisplay();
  const { width: screenW, height: screenH } = display.workAreaSize;
  // Leave room for Chromium's chrome (~110px) and a small margin.
  const usableW = Math.max(320, screenW - 40);
  const usableH = Math.max(320, screenH - 130);
  const scale = Math.min(usableW / viewport.width, usableH / viewport.height, 1);
  // Round to 2 decimals; ignore tiny shrinks that aren't worth
  // the visual hit.
  const rounded = Math.round(scale * 100) / 100;
  return rounded >= 0.98 ? 1 : rounded;
}

type OverlayPayload =
  | { kind: 'click'; selector: string; fallbackText: string; bbox: { x: number; y: number; w: number; h: number }; isInput: boolean }
  | { kind: 'type'; selector: string; fallbackText: string; text: string }
  | { kind: 'assertion'; label: string; verifyLocation: boolean; negate: boolean; bbox: { x: number; y: number; w: number; h: number } }
  | { kind: 'set-active-label'; label: string | null; verifyLocation: boolean; negate: boolean };

type OverlayState = {
  recording: boolean;
  activeLabel: string | null;
  verifyLocation: boolean;
  negate: boolean;
  labels: string[];
};

export class PlaywrightHost {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private mainWindow: BrowserWindow;
  private currentState: OverlayState = {
    recording: true,
    activeLabel: null,
    verifyLocation: false,
    negate: false,
    labels: [],
  };

  // Keep a reference to the Electron window so overlay events can be forwarded to the renderer.
  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
  }

  // Launch Chromium, navigate to the URL, install the overlay script, and start recording.
  async open(url: string, viewport: ViewportSize, deviceScaleFactor: number, labels: string[]): Promise<void> {
    await this.close();
    this.currentState = {
      recording: true,
      activeLabel: null,
      verifyLocation: false,
      negate: false,
      labels,
    };

    // Auto-shrink only kicks in when the user isn't asking for a custom DPR.
    // --force-device-scale-factor combined with newContext({ deviceScaleFactor })
    // makes Chromium render a blank surface, since the CDP Emulation override
    // and the global flag fight over DPR control.
    const launchArgs: string[] = [];
    if (deviceScaleFactor === 1) {
      const fitScale = computeFitScale(viewport);
      if (fitScale < 1) {
        launchArgs.push(`--force-device-scale-factor=${fitScale}`);
        // eslint-disable-next-line no-console
        console.log(`[playwright-host] viewport ${viewport.width}x${viewport.height} overflows screen, scaling window to ${fitScale}`);
      }
    }
    this.browser = await chromium.launch({ headless: false, args: launchArgs });
    this.context = await this.browser.newContext({ viewport, deviceScaleFactor });

    await this.context.exposeBinding('liecinieksHandle', async (_source, payload: OverlayPayload) => {
      this.forwardOverlayEvent(payload);
    });

    await this.context.addInitScript({ content: OVERLAY_SCRIPT });

    this.page = await this.context.newPage();

    this.page.on('framenavigated', (frame) => {
      if (frame === this.page?.mainFrame()) {
        this.send(IPC.EVT_PAGE_NAVIGATED, { url: frame.url() });
        // The page resets window.__liecinieksState on every navigation, so
        // we push the last known state back in to keep the active label
        // alive across navigations.
        void this.pushState();
      }
    });

    this.page.on('close', () => {
      this.send(IPC.EVT_PAGE_CLOSED, {});
      this.cleanup();
    });

    this.context.on('close', () => {
      this.cleanup();
    });

    try {
      await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    } catch (err) {
      this.send(IPC.EVT_PAGE_ERROR, { message: (err as Error).message });
    }

    await this.pushState();
  }

  // Update the recorder's sticky label/toggle state and push it into the page.
  async setActiveLabel(
    activeLabel: string | null,
    verifyLocation: boolean,
    negate: boolean,
    labels: string[],
  ): Promise<void> {
    this.currentState = {
      recording: this.currentState.recording,
      activeLabel,
      verifyLocation,
      negate,
      labels,
    };
    await this.pushState();
  }

  // Tear down the browser and clear all cached references.
  async close(): Promise<void> {
    if (this.context) {
      try { await this.context.close(); } catch { /* noop */ }
    }
    if (this.browser) {
      try { await this.browser.close(); } catch { /* noop */ }
    }
    this.cleanup();
  }

  // True while a live Playwright page is attached and not closed.
  isOpen(): boolean {
    return this.page !== null && !this.page.isClosed();
  }

  // Replace window.__liecinieksState on the page and trigger an overlay re-render.
  private async pushState(): Promise<void> {
    if (!this.page || this.page.isClosed()) return;
    const next = this.currentState;
    try {
      await this.page.evaluate((state) => {
        const w = window as unknown as { __liecinieksState: unknown; __liecinieksRender?: () => void };
        w.__liecinieksState = state;
        if (typeof w.__liecinieksRender === 'function') w.__liecinieksRender();
      }, next);
    } catch {
      // Page probably navigated mid-call; the framenavigated handler will
      // push the state again.
    }
  }

  // Drop references to Playwright objects after the browser closes.
  private cleanup(): void {
    this.page = null;
    this.context = null;
    this.browser = null;
  }

  // Dispatch one overlay event to the renderer over IPC, with special handling for label changes.
  private forwardOverlayEvent(payload: OverlayPayload): void {
    if (payload.kind === 'set-active-label') {
      const labels = this.currentState.labels;
      void this.setActiveLabel(payload.label, payload.verifyLocation, payload.negate, labels);
      this.send(IPC.EVT_ACTIVE_LABEL_CHANGED, {
        label: payload.label,
        verifyLocation: payload.verifyLocation,
        negate: payload.negate,
      });
      return;
    }
    this.send(IPC.EVT_PAGE_CLICK, payload);
  }

  // Send an IPC message to the renderer if the window is still alive.
  private send(channel: string, data: unknown): void {
    if (!this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }
}
