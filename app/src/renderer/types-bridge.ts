// Typed view of the `window.liecinieks` object that preload.ts exposes via
// contextBridge. Importing from here gives the renderer code autocomplete
// and type-checking for every IPC method without each component having to
// redeclare the shape.

import type { ModelLabel, Scenario, ViewportSize } from '../types';

type Liecinieks = {
  loadModel: () => Promise<{ weightsPath: string; labelsCsvPath: string; labels: ModelLabel[] } | null>;
  listScenarios: () => Promise<{ name: string; createdAt: string; file: string }[]>;
  loadScenario: (file: string) => Promise<Scenario>;
  saveScenario: (scenario: Scenario) => Promise<string>;
  exportPlaywright: (
    scenario: Scenario,
  ) => Promise<{ specFile: string; runtimeFile: string; inferenceFile: string } | null>;
  openTarget: (url: string, viewport: ViewportSize, deviceScaleFactor: number) => Promise<{ ok: boolean }>;
  closeTarget: () => Promise<{ ok: boolean }>;
  setRecordingMode: (
    activeLabel: string | null,
    verifyLocation: boolean,
    negate: boolean,
  ) => Promise<{ ok: boolean; reason?: string }>;
  on: (channel: string, handler: (args: unknown) => void) => () => void;
};

declare global {
  interface Window {
    liecinieks: Liecinieks;
  }
}

export const liecinieks: Liecinieks = window.liecinieks;
