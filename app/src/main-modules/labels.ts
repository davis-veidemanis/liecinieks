import * as fs from 'node:fs/promises';
import type { ModelLabel } from '../types';

/**
 * Reads a CSV file with two columns: class_id, class_name.
 * Header row is optional. Rows that don't parse as `int,string` are skipped.
 * Handles quoted values with embedded commas: `0,"foo,bar"` → name "foo,bar".
 */
export async function readLabelsCsv(filePath: string): Promise<ModelLabel[]> {
  const text = await fs.readFile(filePath, 'utf-8');
  const lines = text.split(/\r?\n/);
  const out: ModelLabel[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const cells = parseCsvLine(line);
    if (cells.length < 2) continue;
    const id = Number.parseInt(cells[0].trim(), 10);
    const name = cells[1].trim();
    if (!Number.isFinite(id) || !name) continue;
    out.push({ id, name });
  }
  return out;
}

// Split one CSV row into cells, honoring double-quoted fields with embedded commas.
function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { cur += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { cells.push(cur); cur = ''; }
      else { cur += ch; }
    }
  }
  cells.push(cur);
  return cells;
}
