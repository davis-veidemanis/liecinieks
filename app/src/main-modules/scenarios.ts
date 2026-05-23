import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { Scenario } from '../types';

export class ScenarioStore {
  // Bind the store to the directory where scenario JSON files live.
  constructor(private dir: string) {}

  // Create the storage directory if it doesn't already exist.
  async ensureDir(): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
  }

  // List every saved scenario, newest first, skipping any unparseable files.
  async list(): Promise<{ name: string; createdAt: string; file: string }[]> {
    await this.ensureDir();
    const entries = await fs.readdir(this.dir);
    const out: { name: string; createdAt: string; file: string }[] = [];
    for (const entry of entries) {
      if (!entry.endsWith('.json')) continue;
      try {
        const raw = await fs.readFile(path.join(this.dir, entry), 'utf-8');
        const sc = JSON.parse(raw) as Scenario;
        out.push({ name: sc.name, createdAt: sc.createdAt, file: entry });
      } catch {
        // Skip corrupted scenarios so the list view doesn't crash.
      }
    }
    out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return out;
  }

  // Read one scenario JSON file by name and return the parsed object.
  async load(file: string): Promise<Scenario> {
    // Strip any path components so callers can't read arbitrary files
    // by passing a forged filename.
    const safe = path.basename(file);
    const raw = await fs.readFile(path.join(this.dir, safe), 'utf-8');
    const parsed = JSON.parse(raw) as Scenario;
    // Backfill deviceScaleFactor for scenarios saved before this field existed.
    if (typeof parsed.deviceScaleFactor !== 'number') {
      parsed.deviceScaleFactor = 1;
    }
    return parsed;
  }

  // Write the scenario to disk using a sanitized version of its name as the filename.
  async save(scenario: Scenario): Promise<string> {
    await this.ensureDir();
    const file = sanitizeFileName(scenario.name) + '.json';
    await fs.writeFile(path.join(this.dir, file), JSON.stringify(scenario, null, 2), 'utf-8');
    return file;
  }
}

// Strip unsafe characters and collapse whitespace so the name can be used as a filename.
function sanitizeFileName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9_\- ]+/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 80) || 'scenario_' + Date.now();
}
