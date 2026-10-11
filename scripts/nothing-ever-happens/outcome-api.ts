import { binaryIndices } from "../../src/core/binary-outcomes";
import { requestJson } from "../../src/services/market-data/request";
import type { MarketRow } from "./types";
import type { OutcomeCache } from "./storage";

const RESOLUTIONS = "https://data-api.polymarket.com/v2/resolutions";
const MARKETS = "https://gamma-api.polymarket.com/markets";

export type OutcomeMeta = {
  resolved: boolean;
  outcome: string | null;
  condition_id: string;
  source: "data-api-v2";
  status: string | null;
  payouts: number[] | null;
  outcomes: unknown;
  fetched_at: string;
};

export interface Resolution {
  condition_id: string | null;
  status: string;
  payouts: number[] | null;
}

// Settlement payouts are micro-USDC per share. A closed flag or terminal price
// is not settlement evidence; split payouts do not identify a binary winner.
export function verifiedOutcome(conditionId: string, outcomes: unknown, resolution: Resolution): string | null {
  if (resolution.condition_id !== conditionId) throw new Error("Resolution condition ID mismatch");
  if (resolution.status !== "resolved") return null;
  if (outcomes == null) return null;
  const indices = binaryIndices(outcomes);
  const payouts = resolution.payouts;
  if (!indices || !Array.isArray(payouts) || payouts.length !== 2) return null;
  if (payouts[indices.yes] === 1_000_000 && payouts[indices.no] === 0) return "yes";
  if (payouts[indices.no] === 1_000_000 && payouts[indices.yes] === 0) return "no";
  return null;
}

export async function fetchOutcome(row: MarketRow, cache: OutcomeCache, pauseMs: number): Promise<{
  outcome: string | null; meta: OutcomeMeta;
}> {
  const conditionId = row.id;
  if (!conditionId) throw new Error("Outcome lookup requires a condition ID");
  const cached = cache[conditionId];
  if (cached?.outcome && cached.source === "data-api-v2" && cached.condition_id === conditionId && cached.status === "resolved") {
    const outcome = verifiedOutcome(conditionId, cached.outcomes, cached as unknown as Resolution);
    if (outcome && outcome === cached.outcome) return { outcome, meta: cached as OutcomeMeta };
  }
  const [markets, payload] = await Promise.all([
    requestJson<{ conditionId: string; outcomes: unknown }[]>(`${MARKETS}?condition_ids=${encodeURIComponent(conditionId)}`),
    requestJson<{ data: Resolution[] }>(`${RESOLUTIONS}?condition=${encodeURIComponent(conditionId)}`),
  ]);
  if (!Array.isArray(markets) || !Array.isArray(payload.data)) throw new Error("Invalid outcome API response");
  const matches = markets.filter(m => m.conditionId === conditionId);
  const resolutions = payload.data.filter(r => r.condition_id === conditionId);
  if (matches.length > 1 || resolutions.length > 1) throw new Error(`Ambiguous outcome evidence: ${conditionId}`);
  const market = matches[0];
  const resolution = resolutions[0];
  const outcome = market && resolution ? verifiedOutcome(conditionId, market.outcomes, resolution) : null;
  const meta: OutcomeMeta = {
    condition_id: conditionId, source: "data-api-v2", status: resolution?.status ?? null,
    payouts: resolution?.payouts ?? null, outcomes: market?.outcomes ?? null,
    resolved: resolution?.status === "resolved", outcome, fetched_at: new Date().toISOString(),
  };
  cache[conditionId] = meta;
  if (pauseMs > 0) await new Promise(resolve => setTimeout(resolve, pauseMs));
  return { outcome, meta };
}
