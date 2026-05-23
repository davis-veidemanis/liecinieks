import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { Scenario, Step } from '../types';

const RUNTIME_FILE = 'liecinieks-runtime.ts';
const INFERENCE_FILE = 'liecinieks-inference.py';

// Render the scenario as a Playwright spec and write it (plus the runtime/inference shims) to disk.
export async function exportPlaywright(
  scenario: Scenario,
  outputDir: string,
  weightsAbsPath: string,
  labelsAbsPath: string,
): Promise<{ specFile: string; runtimeFile: string; inferenceFile: string }> {
  await fs.mkdir(outputDir, { recursive: true });
  const specFileName = sanitize(scenario.name) + '.spec.ts';
  const specPath = path.join(outputDir, specFileName);

  const spec = renderSpec(scenario, weightsAbsPath, labelsAbsPath);
  await fs.writeFile(specPath, spec, 'utf-8');

  const runtimePath = path.join(outputDir, RUNTIME_FILE);
  await fs.writeFile(runtimePath, runtimeSource(), 'utf-8');

  const inferencePath = path.join(outputDir, INFERENCE_FILE);
  await fs.writeFile(inferencePath, inferenceSource(), 'utf-8');

  return { specFile: specPath, runtimeFile: runtimePath, inferenceFile: inferencePath };
}

// Build the .spec.ts source string for a single scenario.
function renderSpec(scenario: Scenario, weightsAbsPath: string, labelsAbsPath: string): string {
  const safeName = JSON.stringify(scenario.name);
  const stepsCode = scenario.steps.map(stepToCode).join('\n  ');

  return `import { test } from '@playwright/test';
import { yoloAssertVisible } from './liecinieks-runtime';

const WEIGHTS = ${JSON.stringify(weightsAbsPath)};
const LABELS = ${JSON.stringify(labelsAbsPath)};

test.use({
  viewport: { width: ${scenario.viewport.width}, height: ${scenario.viewport.height} },
  deviceScaleFactor: ${scenario.deviceScaleFactor ?? 1},
});

test(${safeName}, async ({ page }, testInfo) => {
  await page.goto(${JSON.stringify(scenario.startUrl)}, { waitUntil: 'domcontentloaded' });
  // Wait for the SPA to finish hydrating before the first recorded step.
  // 'domcontentloaded' fires before Angular/React components mount, so YOLO
  // checks right after goto would see an empty page body. networkidle
  // waits for ~500ms of no network traffic, which is a reliable signal
  // that SPA bootstrap is done.
  await page.waitForLoadState('networkidle').catch(() => undefined);
  ${stepsCode}
});
`;
}

// Emit the Playwright code line(s) for a single recorded step.
function stepToCode(step: Step): string {
  if (step.type === 'navigate') {
    // After each recorded click, wait for the page to settle.
    // 'networkidle' covers both navigations and XHR (e.g. login, add-to-cart),
    // but with a cap — pages that poll constantly never hit full
    // network-idle, so the .catch swallows the timeout and lets the test
    // keep going.
    return `await page.locator(${JSON.stringify(step.selector)}).first().click();
  await page.waitForLoadState('networkidle', { timeout: 4000 }).catch(() => undefined);`;
  }
  if (step.type === 'type') {
    return `await page.locator(${JSON.stringify(step.selector)}).first().fill(${JSON.stringify(step.text)});`;
  }
  // assert-visible
  return `await yoloAssertVisible(page, testInfo, {
    weights: WEIGHTS,
    labels: LABELS,
    label: ${JSON.stringify(step.label)},
    verifyLocation: ${step.verifyLocation},
    expectedBbox: ${JSON.stringify(step.expectedBbox)},
    iouThreshold: ${step.iouThreshold},
    negate: ${step.negate},
  });`;
}

// Turn an arbitrary scenario name into something safe to use as a filename.
function sanitize(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9_\- ]+/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 80) || 'scenario_' + Date.now();
}

// The runtime helper file that the emitted spec imports at test time.
function runtimeSource(): string {
  return `import { Page, TestInfo, expect } from '@playwright/test';
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
  const seq = (testInfo.attachments.filter((a) => a.name.startsWith('liecinieks-screenshot')).length) + 1;
  const screenshot = testInfo.outputPath(\`liecinieks-screenshot-\${seq}.png\`);
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

  // Attach the screenshot and detection JSON to the report so a failing
  // check shows up in the HTML report with diagnostic data.
  await testInfo.attach(\`liecinieks-screenshot-\${seq}\`, { path: screenshot, contentType: 'image/png' });
  const detectionsPath = testInfo.outputPath(\`liecinieks-detections-\${seq}.json\`);
  await fs.promises.writeFile(detectionsPath, JSON.stringify({ opts, detections }, null, 2), 'utf-8');
  await testInfo.attach(\`liecinieks-detections-\${seq}\`, { path: detectionsPath, contentType: 'application/json' });

  expect(passed, buildFailureMessage(opts, detections, matches, matchAtLocation, screenshot)).toBe(true);
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
  const xa1 = a.x;
  const ya1 = a.y;
  const xa2 = a.x + a.w;
  const ya2 = a.y + a.h;
  const xb1 = b.x;
  const yb1 = b.y;
  const xb2 = b.x + b.w;
  const yb2 = b.y + b.h;
  const ix1 = Math.max(xa1, xb1);
  const iy1 = Math.max(ya1, yb1);
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
  lines.push(\`Visual assertion failed for label '\${opts.label}'.\`);
  lines.push(\`negate=\${opts.negate}, verifyLocation=\${opts.verifyLocation}, iouThreshold=\${opts.iouThreshold}.\`);
  lines.push(\`Expected bbox: \${JSON.stringify(opts.expectedBbox)}.\`);
  lines.push(\`Total detections: \${all.length}; same-class detections: \${sameClass.length}; matching location: \${atLocation.length}.\`);
  lines.push(\`Screenshot attached as 'liecinieks-screenshot-N' in the test report. Local path: \${debugPng}\`);
  return lines.join('\\n');
}
`;
}

// The standalone Python script the runtime spawns to run YOLO inference.
function inferenceSource(): string {
  return `#!/usr/bin/env python3
"""Runs Ultralytics YOLO inference on a single image and prints detections as JSON.

Usage:
    python liecinieks-inference.py --weights path/to/weights.pt --image path/to/screenshot.png

Output: JSON array of {className, bbox: {x, y, w, h}, confidence}, written to stdout.
"""
import argparse
import json
import sys


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--weights', required=True)
    parser.add_argument('--image', required=True)
    parser.add_argument('--conf', type=float, default=0.25)
    args = parser.parse_args()

    try:
        from ultralytics import YOLO
    except ImportError:
        print('Error: ultralytics package not installed. Run: pip install ultralytics', file=sys.stderr)
        return 2

    model = YOLO(args.weights)
    results = model.predict(source=args.image, conf=args.conf, verbose=False)
    detections = []
    for result in results:
        names = result.names
        if result.boxes is None:
            continue
        for box in result.boxes:
            cls = int(box.cls.item())
            conf = float(box.conf.item())
            xyxy = box.xyxy[0].tolist()
            x1, y1, x2, y2 = xyxy
            detections.append({
                'className': names.get(cls, str(cls)),
                'bbox': {
                    'x': round(x1),
                    'y': round(y1),
                    'w': round(x2 - x1),
                    'h': round(y2 - y1),
                },
                'confidence': conf,
            })

    json.dump(detections, sys.stdout)
    return 0


if __name__ == '__main__':
    sys.exit(main())
`;
}
