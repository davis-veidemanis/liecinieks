import * as path from 'node:path';

export const WEIGHTS =
  '/Users/davisveidemanis/Desktop/bakalaurs/yolo-results/runs/YOLOv12s/weights/best.pt';

export const LABELS = path.resolve(__dirname, '..', '..', 'yolo-data', 'labels.csv');

export const IOU_THRESHOLD = 0.5;
