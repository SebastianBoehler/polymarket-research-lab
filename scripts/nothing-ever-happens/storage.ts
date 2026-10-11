import { readFileSync, writeFileSync } from "fs";
import { mkdirSync } from "node:fs";

import type { MarketRow } from "./types";

export type OutcomeCache = Record<
  string,
  {
    resolved: boolean;
    outcome: string | null;
    closed?: boolean | string | number | null;
    condition_id?: string;
    slug?: string;
    fetched_at?: string;
    [key: string]: unknown;
  }
>;

export function loadRows(csvPath: string): MarketRow[] {
  const text = readFileSync(csvPath, "utf8");
  return parseCsv(text);
}

export function readCache(path: string): OutcomeCache {
  try {
    const raw = readFileSync(path, "utf8").trim();
    if (!raw) return {};
    return JSON.parse(raw) as OutcomeCache;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
}

export function saveCache(path: string, cache: OutcomeCache): void {
  mkdirSync(extractDir(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
}

export function numberAt(row: MarketRow, key: string): number {
  const raw = row[key];
  if (!raw) return 0;
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

export function groupRowsByMarket(rows: MarketRow[]): Map<string, MarketRow[]> {
  const grouped = new Map<string, MarketRow[]>();
  for (const row of rows) {
    const marketId = row.id;
    if (!marketId) continue;
    if (!grouped.has(marketId)) grouped.set(marketId, []);
    grouped.get(marketId)?.push(row);
  }

  for (const group of grouped.values()) {
    for (const row of group) {
      if (!Number.isFinite(Date.parse(row.timestamp))) throw new Error(`Invalid observation timestamp: ${row.id}`);
    }
    group.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  }
  return grouped;
}

export function parseCsv(content: string): MarketRow[] {
  const records: string[][] = [];
  let fields: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '"') {
      if (quoted && content[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) {
      fields.push(field); field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && content[i + 1] === "\n") i++;
      fields.push(field);
      if (fields.some(value => value.length)) records.push(fields);
      fields = []; field = "";
    } else field += char;
  }
  if (quoted) throw new Error("Unterminated CSV quoted field");
  if (field.length || fields.length) { fields.push(field); records.push(fields); }
  const header = records.shift();
  if (!header) return [];
  return records.map(values => {
    if (values.length !== header.length) throw new Error("CSV row does not match its header");
    return Object.fromEntries(header.map((key, index) => [key, values[index]])) as MarketRow;
  });
}

function extractDir(path: string): string {
  const idx = path.lastIndexOf("/");
  if (idx < 0) return ".";
  return path.slice(0, idx);
}
