// Liecinieks runtime, handles the YOLO inference call and bbox IoU comparison.
// Mirrors the runtime that the Liecinieks app ships through its codegen, so
// hand-written tests in this folder produce the same artifacts (screenshots
// and detection JSON) as the recorded ones.

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

// Screenshot the page, run YOLO inference, and fail the test if the expected label isn't where we want it.
export async function yoloAssertVisible(
  page: Page,
  testInfo: TestInfo,
  opts: AssertionOptions,
): Promise<void> {
  const seq =
    testInfo.attachments.filter((a) => a.name.startsWith('liecinieks-yolo-view')).length + 1;
  const screenshot = testInfo.outputPath(`liecinieks-screenshot-${seq}.png`);
  const annotated = testInfo.outputPath(`liecinieks-yolo-view-${seq}.png`);
  await page.screenshot({ path: screenshot, fullPage: false });

  const detections = runInference(opts.weights, screenshot, annotated);
  const matches = detections.filter((d) => d.className === opts.label);
  const matchAtLocation = opts.verifyLocation
    ? matches.filter((d) => iou(d.bbox, opts.expectedBbox) >= opts.iouThreshold)
    : matches;

  const asserted = opts.verifyLocation ? matchAtLocation.length > 0 : matches.length > 0;
  const expectedTrue = !opts.negate;
  const passed = asserted === expectedTrue;

  // Attach the annotated screenshot to the test report on every assertion
  // (positive or negative), so the report shows exactly what YOLO picked up
  // at each step.
  await testInfo.attach(`liecinieks-yolo-view-${seq}-${opts.label}-${passed ? 'pass' : 'FAIL'}`, {
    path: annotated,
    contentType: 'image/png',
  });

  // Short log per assertion so the live test output shows what was detected.
  logAssertion(opts, detections, matches, passed);

  if (passed) {
    await fs.promises.unlink(screenshot).catch(() => undefined);
    return;
  }

  // On failure, also attach the raw screenshot and the structured detections
  // alongside the annotated view, which helps with debugging.
  await testInfo.attach(`liecinieks-screenshot-${seq}`, {
    path: screenshot,
    contentType: 'image/png',
  });
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

// Print a short pass/fail summary for the current assertion to the test console.
function logAssertion(
  opts: AssertionOptions,
  detections: Detection[],
  matches: Detection[],
  passed: boolean,
): void {
  const verdict = passed ? '✓' : '✗';
  const mode = opts.negate ? 'NOT visible' : 'visible';
  const matchConf = matches.length
    ? ` (${matches.map((m) => m.confidence.toFixed(2)).join(', ')})`
    : '';
  const others = detections
    .filter((d) => d.className !== opts.label)
    .slice(0, 6)
    .map((d) => `${d.className}:${d.confidence.toFixed(2)}`)
    .join(' ');
  // eslint-disable-next-line no-console
  console.log(
    `  ${verdict} assert ${opts.label} ${mode}, ` +
      `model saw ${detections.length} regions (${matches.length}× ${opts.label}${matchConf}) ` +
      `others: ${others}${detections.length > 7 ? ' …' : ''}`,
  );
}

// Spawn the Python inference script and parse the detections it prints to stdout.
function runInference(weights: string, screenshot: string, annotated: string): Detection[] {
  const scriptPath = path.join(__dirname, 'liecinieks-inference.py');
  const python = process.env.LIECINIEKS_PYTHON || 'python3';
  const result = spawnSync(
    python,
    [scriptPath, '--weights', weights, '--image', screenshot, '--annotate', annotated],
    { encoding: 'utf-8', timeout: 60_000 },
  );
  if (result.status !== 0) {
    throw new Error('YOLO inference failed: ' + (result.stderr || 'unknown error'));
  }
  return JSON.parse(result.stdout) as Detection[];
}

// Intersection-over-union for two bboxes; returns 0 when they don't overlap.
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

// Compose a multi-line failure message with detection counts and the path to the debug screenshot.
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
