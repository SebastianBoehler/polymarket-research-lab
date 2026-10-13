import type { MarketState, MarketTracker } from "./types";
import { parseMarketPriceUpdates } from "./market-stream-payload";

export function handleMarketMessage(
  message: unknown,
  tokenToMarket: Map<string, { market: MarketTracker; side: "yes" | "no" }>,
  tryEntry: (market: MarketState) => void,
): void {
  const updates = parseMarketPriceUpdates(message);
  for (const { assetId, bestAsk } of updates) {
    const entry = tokenToMarket.get(assetId);
    if (!entry) continue;
    if (entry.side === "yes") entry.market.market.bestAskYes = bestAsk;
    else entry.market.market.bestAskNo = bestAsk;
    entry.market.market.priceUpdates++;
    tryEntry(entry.market.market);
  }
}
