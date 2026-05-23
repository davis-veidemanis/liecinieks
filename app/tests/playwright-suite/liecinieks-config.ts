import * as path from 'node:path';

// Outer repo root, three levels up from this file (playwright-suite/ → tests/ → app/ → liecinieks/).
const REPO = path.resolve(__dirname, '..', '..', '..');

// Weights live at <repo>/yolo-results/runs/YOLOv12s/weights/best.pt (~50 MB).
export const WEIGHTS = path.resolve(REPO, 'yolo-results/runs/YOLOv12s/weights/best.pt');

// The labels CSV is small and lives in the app repo at ../../yolo-data/labels.csv.
export const LABELS = path.resolve(__dirname, '..', '..', 'yolo-data', 'labels.csv');

// Default IoU threshold, used when verifyLocation is true.
// Matches the Liecinieks app's DEFAULT_IOU_THRESHOLD.
export const IOU_THRESHOLD = 0.5;
