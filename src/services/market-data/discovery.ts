import { binaryIndices, jsonArray } from "../../core/binary-outcomes";
import type { NormalizedMarket } from "./types";
import { requestJson } from "./request";

const GAMMA_API = "https://gamma-api.polymarket.com";

interface GammaMarket {
  conditionId: string;
  question: string;
  slug: string;
  outcomes: unknown;
  clobTokenIds: unknown;
  outcomePrices: unknown;
  volume?: number | string;
  liquidity?: number | string;
  active?: boolean;
  closed?: boolean;
  negRisk?: boolean;
  endDate?: string;
  description?: string;
  resolutionSource?: string;
  feesEnabled?: boolean;
  feeSchedule?: { rate: number; exponent: number; takerOnly: boolean };
}

interface GammaEvent {
  id: string;
  slug: string;
  title: string;
  markets: GammaMarket[];
  tags?: { id: number; slug: string; label: string }[];
  endDate?: string;
}

export function normalizePolymarketEvent(event: GammaEvent, receivedAt: string): NormalizedMarket[] {
  const markets: NormalizedMarket[] = [];
  for (const market of event.markets) {
    if (!market.active || market.closed) continue;
    if (market.outcomes == null) {
      console.warn(`[MarketData] Skipped ${market.conditionId}: missing outcome labels`);
      continue;
    }
    const indices = binaryIndices(market.outcomes);
    if (!indices) continue;
    const tokenIds = jsonArray(market.clobTokenIds);
    if (market.outcomePrices == null) {
      console.warn(`[MarketData] Skipped ${market.conditionId}: missing metadata prices`);
      continue;
    }
    const prices = jsonArray(market.outcomePrices).map(Number);
    if (tokenIds.length !== 2 || prices.length !== 2 ||
        tokenIds.some((id) => typeof id !== "string" || id.length === 0) ||
        prices.some((price) => !Number.isFinite(price) || price < 0 || price > 1)) {
      throw new Error(`Invalid binary market data: ${market.conditionId}`);
    }
    if (!market.conditionId) throw new Error("Gamma market has no condition ID");
    markets.push({
      platform: "polymarket",
      id: market.conditionId,
      title: market.question || event.title,
      category: event.tags?.[0]?.label || "unknown",
      tags: (event.tags || []).map((tag) => tag.label),
      slug: market.slug || event.slug,
      yesPrice: prices[indices.yes],
      noPrice: prices[indices.no],
      spread: null,
      priceSource: "gamma",
      receivedAt,
      volume: Number(market.volume ?? 0),
      liquidity: Number(market.liquidity ?? 0),
      endDate: market.endDate ?? event.endDate ?? null,
      active: true,
      url: `https://polymarket.com/event/${event.slug}`,
      conditionId: market.conditionId,
      tokenYes: tokenIds[indices.yes] as string,
      tokenNo: tokenIds[indices.no] as string,
      negRisk: market.negRisk,
      resolutionSource: market.resolutionSource,
      rules: market.description,
      feesEnabled: market.feesEnabled,
      feeSchedule: market.feeSchedule,
    });
  }
  return markets;
}

export async function fetchPolymarketTags(): Promise<{ id: number; slug: string; label: string }[]> {
  return requestJson(`${GAMMA_API}/tags?limit=200`);
}

async function fetchEvents(url: string): Promise<NormalizedMarket[]> {
  const events = await requestJson<GammaEvent[]>(url);
  const receivedAt = new Date().toISOString();
  if (!Array.isArray(events)) throw new Error("Gamma events response is not an array");
  return events.flatMap((event) => normalizePolymarketEvent(event, receivedAt));
}

export async function fetchPolymarketEventsByTag(tagId: number, limit = 50): Promise<NormalizedMarket[]> {
  return fetchEvents(`${GAMMA_API}/events?tag_id=${tagId}&closed=false&limit=${limit}&order=id&ascending=false`);
}

export async function fetchAllPolymarketMarkets(maxPages = 10): Promise<NormalizedMarket[]> {
  const allMarkets: NormalizedMarket[] = [];
  const seenIds = new Set<string>();
  for (let page = 0; page < maxPages; page++) {
    const url = `${GAMMA_API}/events?order=id&ascending=false&closed=false&limit=50&offset=${page * 50}`;
    const events = await requestJson<GammaEvent[]>(url);
    const receivedAt = new Date().toISOString();
    if (!Array.isArray(events)) throw new Error("Gamma events response is not an array");
    if (events.length === 0) break;
    for (const event of events) {
      for (const market of normalizePolymarketEvent(event, receivedAt)) {
        if (seenIds.has(market.id)) continue;
        seenIds.add(market.id);
        allMarkets.push(market);
      }
    }
  }
  return allMarkets;
}
