import type { NormalizedMarket } from "./types";
import { requestJson } from "./request";

export interface PriceLevel {
  price: number;
  size: number;
}

export interface OrderbookSnapshot {
  tokenId: string;
  conditionId: string;
  sourceTimestamp: string;
  receivedAt: string;
  hash: string;
  bids: PriceLevel[];
  asks: PriceLevel[];
  bestBid: number;
  bestAsk: number;
  midPrice: number;
  spreadBps: number;
  depth1Pct: number;
}

export interface QuoteFailure {
  marketId: string;
  receivedAt: string;
  error: string;
}

interface BookPayload {
  asset_id: string;
  market: string;
  timestamp: string;
  hash: string;
  bids: { price: string; size: string }[];
  asks: { price: string; size: string }[];
}

export function parseOrderbook(data: BookPayload, tokenId: string, receivedAt: string): OrderbookSnapshot {
  if (data.asset_id !== tokenId || !data.market || !data.timestamp || !data.hash) {
    throw new Error(`Book identity or provenance is missing/mismatched: ${tokenId}`);
  }
  function levels(raw: BookPayload["asks"]): PriceLevel[] {
    if (!Array.isArray(raw) || raw.length === 0) throw new Error(`Book has an empty side: ${tokenId}`);
    return raw.map((level) => {
      const price = Number(level.price);
      const size = Number(level.size);
      if (!Number.isFinite(price) || price <= 0 || price >= 1 || !Number.isFinite(size) || size <= 0) {
        throw new Error(`Book has an invalid price/size: ${tokenId}`);
      }
      return { price, size };
    });
  }
  const bids = levels(data.bids).sort((a, b) => b.price - a.price);
  const asks = levels(data.asks).sort((a, b) => a.price - b.price);
  const bestBid = bids[0].price;
  const bestAsk = asks[0].price;
  if (bestBid > bestAsk) throw new Error(`Book is crossed: ${tokenId}`);
  const midPrice = (bestBid + bestAsk) / 2;
  const spreadBps = ((bestAsk - bestBid) / midPrice) * 10000;
  const depth1Pct = [...bids, ...asks]
    .filter((level) => Math.abs(level.price - midPrice) <= midPrice * 0.01)
    .reduce((sum, level) => sum + level.price * level.size, 0);
  return {
    tokenId, conditionId: data.market, sourceTimestamp: data.timestamp,
    receivedAt, hash: data.hash, bids, asks, bestBid, bestAsk, midPrice, spreadBps, depth1Pct,
  };
}

async function requestOrderbook(tokenId: string): Promise<OrderbookSnapshot> {
  const data = await requestJson<BookPayload>(`https://clob.polymarket.com/book?token_id=${encodeURIComponent(tokenId)}`);
  return parseOrderbook(data, tokenId, new Date().toISOString());
}

export async function fetchOrderbook(tokenId: string): Promise<OrderbookSnapshot | null> {
  try {
    return await requestOrderbook(tokenId);
  } catch (error) {
    console.error(`[MarketData] Book ${tokenId}:`, error);
    return null;
  }
}

export async function enrichMarketQuotes(markets: NormalizedMarket[], batchSize = 10, delayMs = 200): Promise<{
  markets: NormalizedMarket[]; failures: QuoteFailure[];
}> {
  if (!Number.isInteger(batchSize) || batchSize <= 0 || !Number.isFinite(delayMs) || delayMs < 0) {
    throw new Error("Quote batch size must be positive; delay must be nonnegative");
  }
  const quoted: NormalizedMarket[] = [];
  const failures: QuoteFailure[] = [];
  for (let i = 0; i < markets.length; i += batchSize) {
    const results = await Promise.all(markets.slice(i, i + batchSize).map(async (market) => {
      if (market.platform !== "polymarket") return market;
      try {
        if (!market.tokenYes || !market.tokenNo) throw new Error("Missing complementary token IDs");
        const [yes, no] = await Promise.all([requestOrderbook(market.tokenYes), requestOrderbook(market.tokenNo)]);
        if (yes.conditionId !== market.id || no.conditionId !== market.id) {
          throw new Error("Book condition does not match the selected market");
        }
        return {
          ...market, yesPrice: yes.bestAsk, noPrice: no.bestAsk,
          spread: yes.bestAsk - yes.bestBid, priceSource: "clob" as const,
          receivedAt: yes.receivedAt > no.receivedAt ? yes.receivedAt : no.receivedAt,
          books: { yes, no },
        };
      } catch (error) {
        failures.push({ marketId: market.id, receivedAt: new Date().toISOString(), error: String(error) });
        return null;
      }
    }));
    for (const result of results) if (result) quoted.push(result);
    if (i + batchSize < markets.length) await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return { markets: quoted, failures };
}

export async function enrichWithClobPrices(markets: NormalizedMarket[], batchSize = 10, delayMs = 200): Promise<NormalizedMarket[]> {
  const result = await enrichMarketQuotes(markets, batchSize, delayMs);
  for (const failure of result.failures) console.error(`[MarketData] Skipped ${failure.marketId}: ${failure.error}`);
  console.log(`   Quoted ${result.markets.length}/${markets.length} markets; ${result.failures.length} unavailable`);
  return result.markets;
}
