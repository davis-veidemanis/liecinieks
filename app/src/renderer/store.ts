import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { ModelLabel, Scenario, Step, ViewportSize, BBox } from '../types';
import { DEFAULT_IOU_THRESHOLD } from '../types';

type AppState = {
  weightsPath: string | null;
  labelsCsvPath: string | null;
  labels: ModelLabel[];
  scenario: Scenario | null;
  pageOpen: boolean;
  pageUrl: string;
  activeLabel: string | null;
  verifyLocation: boolean;
  negate: boolean;
  notice: string | null;

  setModel: (data: { weightsPath: string; labelsCsvPath: string; labels: ModelLabel[] }) => void;
  startScenario: (init: { name: string; viewport: ViewportSize; deviceScaleFactor: number; startUrl: string }) => void;
  loadScenario: (scenario: Scenario) => void;
  setPageOpen: (open: boolean, url?: string) => void;
  setActiveLabel: (label: string | null, verifyLocation: boolean, negate: boolean) => void;
  appendStep: (step: Step) => void;
  removeStep: (id: string) => void;
  moveStep: (id: string, direction: -1 | 1) => void;
  updateStepText: (id: string, text: string) => void;
  setNotice: (msg: string | null) => void;
};

export const useStore = create<AppState>((set, get) => ({
  weightsPath: null,
  labelsCsvPath: null,
  labels: [],
  scenario: null,
  pageOpen: false,
  pageUrl: '',
  activeLabel: null,
  verifyLocation: false,
  negate: false,
  notice: null,

  setModel: (data) =>
    set({
      weightsPath: data.weightsPath,
      labelsCsvPath: data.labelsCsvPath,
      labels: data.labels,
    }),

  startScenario: ({ name, viewport, deviceScaleFactor, startUrl }) => {
    const labelNames = get().labels.map((l) => l.name);
    set({
      scenario: {
        name,
        createdAt: new Date().toISOString(),
        viewport,
        deviceScaleFactor,
        modelLabels: labelNames,
        startUrl,
        steps: [],
      },
      activeLabel: null,
      verifyLocation: false,
      negate: false,
    });
  },

  loadScenario: (scenario) => set({ scenario, activeLabel: null, verifyLocation: false, negate: false }),

  setPageOpen: (open, url) => set({ pageOpen: open, pageUrl: url ?? get().pageUrl }),

  setActiveLabel: (label, verifyLocation, negate) =>
    set({ activeLabel: label, verifyLocation, negate }),

  appendStep: (step) => {
    const sc = get().scenario;
    if (!sc) return;
    set({ scenario: { ...sc, steps: [...sc.steps, step] } });
  },
  removeStep: (id) => {
    const sc = get().scenario;
    if (!sc) return;
    set({ scenario: { ...sc, steps: sc.steps.filter((s) => s.id !== id) } });
  },
  moveStep: (id, direction) => {
    const sc = get().scenario;
    if (!sc) return;
    const idx = sc.steps.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const target = idx + direction;
    if (target < 0 || target >= sc.steps.length) return;
    const next = sc.steps.slice();
    [next[idx], next[target]] = [next[target], next[idx]];
    set({ scenario: { ...sc, steps: next } });
  },
  updateStepText: (id, text) => {
    const sc = get().scenario;
    if (!sc) return;
    const next = sc.steps.map((s) => (s.id === id && s.type === 'type' ? { ...s, text } : s));
    set({ scenario: { ...sc, steps: next } });
  },
  setNotice: (msg) => set({ notice: msg }),
}));

export function buildStepFromOverlayPayload(
  payload:
    | { kind: 'click'; selector: string; fallbackText: string; bbox: BBox; isInput: boolean }
    | { kind: 'type'; selector: string; fallbackText: string; text: string }
    | { kind: 'assertion'; label: string; verifyLocation: boolean; negate: boolean; bbox: BBox },
): Step {
  if (payload.kind === 'click') {
    return {
      id: nanoid(8),
      type: 'navigate',
      selector: payload.selector,
      fallbackText: payload.fallbackText,
    };
  }
  if (payload.kind === 'type') {
    return {
      id: nanoid(8),
      type: 'type',
      selector: payload.selector,
      text: payload.text,
    };
  }
  return {
    id: nanoid(8),
    type: 'assert-visible',
    label: payload.label,
    verifyLocation: payload.verifyLocation,
    expectedBbox: payload.bbox,
    iouThreshold: DEFAULT_IOU_THRESHOLD,
    negate: payload.negate,
  };
}
