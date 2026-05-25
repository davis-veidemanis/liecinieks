// Electron preload script. Runs in an isolated context with access to Node
// and the ipcRenderer, and exposes a narrow surface to the renderer via
// contextBridge. The renderer cannot touch ipcRenderer directly because of
// contextIsolation; every call has to go through one of the methods below.

import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { IPC } from './ipc-channels';
import type { ModelLabel, Scenario, ViewportSize } from './types';

type ListenerArgs = unknown;

contextBridge.exposeInMainWorld('liecinieks', {
  // Ask the main process to pick weights + a labels CSV and parse the labels.
  loadModel: (): Promise<{ weightsPath: string; labelsCsvPath: string; labels: ModelLabel[] } | null> =>
    ipcRenderer.invoke(IPC.LOAD_MODEL),
  // List all saved scenario files in the scenarios directory.
  listScenarios: (): Promise<{ name: string; createdAt: string; file: string }[]> =>
    ipcRenderer.invoke(IPC.LIST_SCENARIOS),
  // Read a scenario JSON from disk by its filename.
  loadScenario: (file: string): Promise<Scenario> =>
    ipcRenderer.invoke(IPC.LOAD_SCENARIO, file),
  // Persist a scenario to disk and return the path it was saved to.
  saveScenario: (scenario: Scenario): Promise<string> =>
    ipcRenderer.invoke(IPC.SAVE_SCENARIO, scenario),
  // Generate a Playwright spec + runtime + inference helper from this scenario.
  exportPlaywright: (scenario: Scenario): Promise<{ specFile: string; runtimeFile: string; inferenceFile: string } | null> =>
    ipcRenderer.invoke(IPC.EXPORT_PLAYWRIGHT, scenario),
  // Open the target URL in the headed Playwright window for recording.
  openTarget: (url: string, viewport: ViewportSize, deviceScaleFactor: number): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke(IPC.OPEN_TARGET, { url, viewport, deviceScaleFactor }),
  // Close the headed target window.
  closeTarget: (): Promise<{ ok: boolean }> => ipcRenderer.invoke(IPC.CLOSE_TARGET),
  // Tell the main process which label is active so the overlay knows what to record next.
  setRecordingMode: (
    activeLabel: string | null,
    verifyLocation: boolean,
    negate: boolean,
  ): Promise<{ ok: boolean; reason?: string }> =>
    ipcRenderer.invoke(IPC.SET_RECORDING_MODE, { activeLabel, verifyLocation, negate }),
  // Subscribe to one of the allowlisted main-process events; returns an unsubscribe fn.
  on: (channel: string, handler: (args: ListenerArgs) => void): (() => void) => {
    const allowed = [IPC.EVT_PAGE_CLICK, IPC.EVT_PAGE_NAVIGATED, IPC.EVT_PAGE_CLOSED, IPC.EVT_PAGE_ERROR, IPC.EVT_ACTIVE_LABEL_CHANGED];
    if (!allowed.includes(channel as (typeof allowed)[number])) {
      throw new Error('Channel not allowed: ' + channel);
    }
    const wrapped = (_e: IpcRendererEvent, args: ListenerArgs) => handler(args);
    ipcRenderer.on(channel, wrapped);
    return () => ipcRenderer.removeListener(channel, wrapped);
  },
});
