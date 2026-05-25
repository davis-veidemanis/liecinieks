// Electron main process entry point. Owns the lifecycle of the Liecinieks
// window, the headed Playwright host that drives the target browser, and the
// disk-backed scenario store. All renderer requests come in over IPC and are
// dispatched by registerIpc().

import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { PlaywrightHost } from './main-modules/playwright-host';
import { ScenarioStore } from './main-modules/scenarios';
import { exportPlaywright } from './main-modules/codegen';
import { readLabelsCsv } from './main-modules/labels';
import { IPC } from './ipc-channels';
import type { Scenario, ViewportSize } from './types';

// Quit immediately on Windows when launched by Squirrel during install/uninstall.
if (started) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let host: PlaywrightHost | null = null;
let scenarioStore: ScenarioStore | null = null;
let weightsPath: string | null = null;
let labelsCsvPath: string | null = null;
let currentLabels: string[] = [];

// Create the main Electron window and wire up its lifecycle.
const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    title: 'Liecinieks, Visual UI Testing',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  if (process.env.LIECINIEKS_DEVTOOLS) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    void host?.close();
    host = null;
  });

  scenarioStore = new ScenarioStore(path.join(app.getPath('userData'), 'scenarios'));
};

app.on('ready', () => {
  createWindow();
  registerIpc();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  void host?.close();
});

// Return the live main window or throw if it hasn't been created yet.
function ensureMainWindow(): BrowserWindow {
  if (!mainWindow) throw new Error('Main window not initialised');
  return mainWindow;
}

// Register every IPC handler the renderer can call.
function registerIpc(): void {
  ipcMain.handle(IPC.LOAD_MODEL, async () => {
    const win = ensureMainWindow();
    const result = await dialog.showOpenDialog(win, {
      title: 'Choose YOLO weights file',
      properties: ['openFile'],
      filters: [
        { name: 'YOLO weights (.pt)', extensions: ['pt'] },
        { name: 'All files', extensions: ['*'] },
      ],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const weights = result.filePaths[0];
    const csvResult = await dialog.showOpenDialog(win, {
      title: 'Choose labels CSV file (class_id,class_name)',
      properties: ['openFile'],
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    });
    if (csvResult.canceled || csvResult.filePaths.length === 0) return null;
    const csv = csvResult.filePaths[0];
    const labels = await readLabelsCsv(csv);
    weightsPath = weights;
    labelsCsvPath = csv;
    currentLabels = labels.map((l) => l.name);
    return { weightsPath, labelsCsvPath, labels };
  });

  ipcMain.handle(IPC.LIST_SCENARIOS, async () => {
    if (!scenarioStore) return [];
    return scenarioStore.list();
  });

  ipcMain.handle(IPC.LOAD_SCENARIO, async (_e, file: string) => {
    if (!scenarioStore) return null;
    return scenarioStore.load(file);
  });

  ipcMain.handle(IPC.SAVE_SCENARIO, async (_e, scenario: Scenario) => {
    if (!scenarioStore) return null;
    return scenarioStore.save(scenario);
  });

  ipcMain.handle(IPC.EXPORT_PLAYWRIGHT, async (_e, scenario: Scenario) => {
    const win = ensureMainWindow();
    if (!weightsPath || !labelsCsvPath) {
      throw new Error('Load a model and labels CSV first.');
    }
    const result = await dialog.showOpenDialog(win, {
      title: 'Choose folder to write Playwright test',
      properties: ['openDirectory', 'createDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const outDir = result.filePaths[0];
    return exportPlaywright(scenario, outDir, weightsPath, labelsCsvPath);
  });

  ipcMain.handle(IPC.OPEN_TARGET, async (_e, payload: { url: string; viewport: ViewportSize; deviceScaleFactor: number }) => {
    // Re-opening replaces any previous target browser, so the user can switch
    // viewport or URL without restarting the app.
    if (host) {
      try { await host.close(); } catch { /* noop */ }
      host = null;
    }
    const win = ensureMainWindow();
    host = new PlaywrightHost(win);
    await host.open(payload.url, payload.viewport, payload.deviceScaleFactor, currentLabels);
    return { ok: true };
  });

  ipcMain.handle(IPC.CLOSE_TARGET, async () => {
    if (host) {
      await host.close();
      host = null;
    }
    return { ok: true };
  });

  ipcMain.handle(
    IPC.SET_RECORDING_MODE,
    async (
      _e,
      payload: { activeLabel: string | null; verifyLocation: boolean; negate: boolean },
    ) => {
      if (!host) return { ok: false, reason: 'No browser open' };
      await host.setActiveLabel(payload.activeLabel, payload.verifyLocation, payload.negate, currentLabels);
      return { ok: true };
    },
  );
}
