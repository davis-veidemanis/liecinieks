import { Page, TestInfo, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

export type BBox = { x: number; y: number; w: number; h: number };

export type Detection = {
  className: string;
  bbox: BBox;
  confidence: number;
};

export type AssertionOptions = {
  weights: string;
  labels: string;
  label: string;
  verifyLocation: boolean;
  expectedBbox: BBox;
  iouThreshold: number;
  negate: boolean;
};

export async function yoloAssertVisible(
  page: Page,
  testInfo: TestInfo,
  opts: AssertionOptions,
): Promise<void> {
  const seq =
    testInfo.attachments.filter((a) => a.name.startsWith('liecinieks-screenshot')).length + 1;
  const screenshot = testInfo.outputPath(`liecinieks-screenshot-${seq}.png`);
  await page.screenshot({ path: screenshot, fullPage: false });

  const detections = runInference(opts.weights, screenshot);
  const matches = detections.filter((d) => d.className === opts.label);
  const matchAtLocation = opts.verifyLocation
    ? matches.filter((d) => iou(d.bbox, opts.expectedBbox) >= opts.iouThreshold)
    : matches;

  const asserted = opts.verifyLocation ? matchAtLocation.length > 0 : matches.length > 0;
  const expectedTrue = !opts.negate;
  const passed = asserted === expectedTrue;

  if (passed) {
    await fs.promises.unlink(screenshot).catch(() => undefined);
    return;
  }

  await testInfo.attach(`liecinieks-screenshot-${seq}`, { path: screenshot, contentType: 'image/png' });
  const detectionsPath = testInfo.outputPath(`liecinieks-detections-${seq}.json`);
  await fs.promises.writeFile(
    detectionsPath,
    JSON.stringify({ opts, detections }, null, 2),
    'utf-8',
  );
  await testInfo.attach(`liecinieks-detections-${seq}`, {
    path: detectionsPath,
    contentType: 'application/json',
  });

  expect(
    passed,
    buildFailureMessage(opts, detections, matches, matchAtLocation, screenshot),
  ).toBe(true);
}

function runInference(weights: string, screenshot: string): Detection[] {
  const scriptPath = path.join(__dirname, 'liecinieks-inference.py');
  const python = process.env.LIECINIEKS_PYTHON || 'python3';
  const result = spawnSync(python, [scriptPath, '--weights', weights, '--image', screenshot], {
    encoding: 'utf-8',
    timeout: 60_000,
  });
  if (result.status !== 0) {
    throw new Error('YOLO inference failed: ' + (result.stderr || 'unknown error'));
  }
  return JSON.parse(result.stdout) as Detection[];
}

function iou(a: BBox, b: BBox): number {
  const xa2 = a.x + a.w;
  const ya2 = a.y + a.h;
  const xb2 = b.x + b.w;
  const yb2 = b.y + b.h;
  const ix1 = Math.max(a.x, b.x);
  const iy1 = Math.max(a.y, b.y);
  const ix2 = Math.min(xa2, xb2);
  const iy2 = Math.min(ya2, yb2);
  const iw = Math.max(0, ix2 - ix1);
  const ih = Math.max(0, iy2 - iy1);
  const inter = iw * ih;
  const union = a.w * a.h + b.w * b.h - inter;
  return union > 0 ? inter / union : 0;
}

function buildFailureMessage(
  opts: AssertionOptions,
  all: Detection[],
  sameClass: Detection[],
  atLocation: Detection[],
  debugPng: string,
): string {
  const lines: string[] = [];
  lines.push(`Visual assertion failed for label '${opts.label}'.`);
  lines.push(
    `negate=${opts.negate}, verifyLocation=${opts.verifyLocation}, iouThreshold=${opts.iouThreshold}.`,
  );
  lines.push(`Expected bbox: ${JSON.stringify(opts.expectedBbox)}.`);
  lines.push(
    `Total detections: ${all.length}; same-class detections: ${sameClass.length}; matching location: ${atLocation.length}.`,
  );
  lines.push(
    `Screenshot attached as 'liecinieks-screenshot-N' in the test report. Local path: ${debugPng}`,
  );
  return lines.join('\n');
}
