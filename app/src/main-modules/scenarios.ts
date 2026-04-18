import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { Scenario } from '../types';

export class ScenarioStore {
  constructor(private dir: string) {}

  async ensureDir(): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
  }

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
      }
    }
    out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return out;
  }

  async load(file: string): Promise<Scenario> {
    const safe = path.basename(file);
    const raw = await fs.readFile(path.join(this.dir, safe), 'utf-8');
    const parsed = JSON.parse(raw) as Scenario;
    if (typeof parsed.deviceScaleFactor !== 'number') {
      parsed.deviceScaleFactor = 1;
    }
    return parsed;
  }

  async save(scenario: Scenario): Promise<string> {
    await this.ensureDir();
    const file = sanitizeFileName(scenario.name) + '.json';
    await fs.writeFile(path.join(this.dir, file), JSON.stringify(scenario, null, 2), 'utf-8');
    return file;
  }
}

function sanitizeFileName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9_\- ]+/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 80) || 'scenario_' + Date.now();
}
