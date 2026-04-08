import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { screen, type BrowserWindow } from 'electron';
import { OVERLAY_SCRIPT } from './overlay';
import { IPC } from '../ipc-channels';
import type { ViewportSize } from '../types';

function computeFitScale(viewport: ViewportSize): number {
  const display = screen.getPrimaryDisplay();
  const { width: screenW, height: screenH } = display.workAreaSize;
  const usableW = Math.max(320, screenW - 40);
  const usableH = Math.max(320, screenH - 130);
  const scale = Math.min(usableW / viewport.width, usableH / viewport.height, 1);
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

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
  }

  async open(url: string, viewport: ViewportSize, deviceScaleFactor: number, labels: string[]): Promise<void> {
    await this.close();
    this.currentState = {
      recording: true,
      activeLabel: null,
      verifyLocation: false,
      negate: false,
      labels,
    };

    const launchArgs: string[] = [];
    if (deviceScaleFactor === 1) {
      const fitScale = computeFitScale(viewport);
      if (fitScale < 1) {
        launchArgs.push(`--force-device-scale-factor=${fitScale}`);
        console.log(`[playwright-host] viewport ${viewport.width}x${viewport.height} overflows screen — scaling window to ${fitScale}`);
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

  async close(): Promise<void> {
    if (this.context) {
      try { await this.context.close(); } catch {  }
    }
    if (this.browser) {
      try { await this.browser.close(); } catch {  }
    }
    this.cleanup();
  }

  isOpen(): boolean {
    return this.page !== null && !this.page.isClosed();
  }

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
    }
  }

  private cleanup(): void {
    this.page = null;
    this.context = null;
    this.browser = null;
  }

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

  private send(channel: string, data: unknown): void {
    if (!this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }
}
