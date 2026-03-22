export type ViewportSize = { width: number; height: number };

export type ModelLabel = { id: number; name: string };

export type BBox = { x: number; y: number; w: number; h: number };

export type StepNavigate = {
  id: string;
  type: 'navigate';
  selector: string;
  fallbackText: string;
};

export type StepType = {
  id: string;
  type: 'type';
  selector: string;
  text: string;
};

export type StepAssert = {
  id: string;
  type: 'assert-visible';
  label: string;
  verifyLocation: boolean;
  expectedBbox: BBox;
  iouThreshold: number;
  negate: boolean;
};

export type Step = StepNavigate | StepType | StepAssert;

export type Scenario = {
  name: string;
  createdAt: string;
  viewport: ViewportSize;
  deviceScaleFactor: number;
  modelLabels: string[];
  startUrl: string;
  steps: Step[];
};

export type ModelConfig = {
  weightsPath: string;
  labelsCsvPath: string;
  labels: ModelLabel[];
};

export type ClickEventPayload = {
  button: 'left' | 'right';
  x: number;
  y: number;
  selector: string;
  fallbackText: string;
  bbox: BBox;
  isInputField: boolean;
};

export const VIEWPORT_PRESETS: { name: string; size: ViewportSize; deviceScaleFactor: number }[] = [
  { name: 'MacBook 1440×900', size: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
  { name: 'Desktop 1920×1080', size: { width: 1920, height: 1080 }, deviceScaleFactor: 1 },
  { name: 'Laptop 1280×800', size: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
  { name: 'Tablet 768×1024', size: { width: 768, height: 1024 }, deviceScaleFactor: 2 },
  { name: 'Mobile 375×667', size: { width: 375, height: 667 }, deviceScaleFactor: 2 },
];

export const DEFAULT_IOU_THRESHOLD = 0.5;
