import type { NormalizedMarket } from "./types";

const KALSHI_API = "https://api.elections.kalshi.com/trade-api/v2";

interface KalshiMarket {
  ticker: string;
  event_ticker: string;
  series_ticker: string;
  title: string;
  subtitle?: string;
  category?: string;
  status: string;
  // Prices in cents (integer)
  yes_price?: number;
  no_price?: number;
  yes_bid?: number;
  no_bid?: number;
  yes_ask?: number;
  no_ask?: number;
  last_price?: number;
  // Dollar string fields (newer API)
  yes_bid_dollars?: string;
  yes_ask_dollars?: string;
  no_bid_dollars?: string;
  no_ask_dollars?: string;
  last_price_dollars?: string;
  volume: number;
  volume_24h?: number;
  open_interest?: number;
  liquidity?: number;
  liquidity_dollars?: string;
  close_time?: string;
  expiration_time?: string;
  expected_expiration_time?: string;
  result?: string;
  market_type?: string;
}

interface KalshiMarketsResponse {
  markets: KalshiMarket[];
  cursor?: string;
}

export async function fetchKalshiMarkets(limit: number = 200, status: string = "open"): Promise<NormalizedMarket[]> {
  const markets: NormalizedMarket[] = [];
  if (!Number.isInteger(limit) || limit <= 0) throw new Error("Kalshi limit must be a positive integer");
  let cursor: string | undefined;
  let examined = 0;

  let totalRateLimits = 0;
  const MAX_RATE_LIMITS = 3;

  try {
    while (examined < limit) {
      if (totalRateLimits >= MAX_RATE_LIMITS) {
        console.warn(`[MarketData] Kalshi rate limited ${totalRateLimits}x total, giving up. Got ${markets.length} markets.`);
        throw new Error("Kalshi rate limit retry budget exhausted");
      }

      let url = `${KALSHI_API}/markets?status=${encodeURIComponent(status)}&limit=${Math.min(100, limit - examined)}`;
      if (cursor) url += `&cursor=${cursor}`;

      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      const receivedAt = new Date().toISOString();

      if (res.status === 429) {
        totalRateLimits++;
        const waitMs = 2000 * totalRateLimits;
        console.warn(`[MarketData] Kalshi rate limited (${totalRateLimits}/${MAX_RATE_LIMITS}), waiting ${waitMs / 1000}s...`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue; // retry same page
      }

      if (!res.ok) {
        throw new Error(`Kalshi API error: ${res.status}`);
      }

      const data: KalshiMarketsResponse = await res.json();
      if (!Array.isArray(data.markets)) throw new Error("Invalid Kalshi markets response");
      if (data.markets.length === 0) break;

      for (const m of data.markets.slice(0, limit - examined)) {
        examined++;
        // Skip multivariate/parlay markets (very noisy)
        if (m.market_type === "multivariate" || m.ticker.includes("KXMVE")) continue;

        const yesPrice = m.yes_ask_dollars != null ? Number(m.yes_ask_dollars) : Number(m.yes_ask) / 100;
        const noPrice = m.no_ask_dollars != null ? Number(m.no_ask_dollars) : Number(m.no_ask) / 100;
        const yesBid = m.yes_bid_dollars != null ? Number(m.yes_bid_dollars) : Number(m.yes_bid) / 100;
        if (![yesPrice, noPrice, yesBid].every(p => Number.isFinite(p) && p >= 0 && p <= 1)
          || yesPrice <= 0 || noPrice <= 0 || yesBid > yesPrice) continue;

        const vol = m.volume || m.volume_24h || 0;
        const liq = Number(m.liquidity_dollars || "0") || (m.liquidity ?? m.open_interest ?? 0);

        markets.push({
          platform: "kalshi",
          id: m.ticker,
          title: m.title,
          category: m.category || extractKalshiCategory(m.series_ticker || ""),
          tags: [m.category || "unknown"],
          slug: m.ticker,
          yesPrice,
          noPrice,
          spread: yesPrice - yesBid,
          priceSource: "kalshi",
          receivedAt,
          volume: vol,
          liquidity: liq,
          endDate: m.close_time || m.expected_expiration_time || m.expiration_time || null,
          active: m.status === "open" || m.status === "active",
          url: `https://kalshi.com/markets/${(m.series_ticker || m.ticker).toLowerCase()}`,
          seriesTicker: m.series_ticker,
          eventTicker: m.event_ticker,
        });
      }

      cursor = data.cursor;
      if (!cursor) break;
    }
  } catch (err) {
    throw err;
  }

  if (markets.length < examined) console.warn(`[MarketData] Kalshi retained ${markets.length}/${examined} examined contracts with valid binary quotes`);
  return markets;
}

function extractKalshiCategory(seriesTicker: string): string {
  const prefix = seriesTicker.slice(0, 2).toUpperCase();
  const categoryMap: Record<string, string> = {
    KX: "economics",
    IN: "politics",
    FE: "fed",
    NF: "sports",
    SU: "sports",
    WE: "weather",
    CR: "crypto",
    AI: "tech",
    EL: "elections",
  };
  return categoryMap[prefix] || "other";
}

