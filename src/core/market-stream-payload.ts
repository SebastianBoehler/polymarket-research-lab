import { record, text, array, price } from "./stream-validation";
export interface MarketPriceUpdate {
  assetId: string;
  bestAsk: number;
}

export { MarketStreamValidationError } from "./stream-validation";

/** Validate the whole message before the caller can mutate any market. */
export function parseMarketPriceUpdates(message: unknown): MarketPriceUpdate[] {
  const envelope = record(message, "message");
  const topic = text(envelope.topic, "topic");
  const type = text(envelope.type, "type");
  if (topic !== "clob_market" || (type !== "agg_orderbook" && type !== "price_change")) return [];

  const payload = record(envelope.payload, "payload");
  if (type === "agg_orderbook") {
    const assetId = text(payload.asset_id, "asset_id");
    const asks = array(payload.asks, "asks");
    let bestAsk = Infinity;
    for (const ask of asks) {
      bestAsk = Math.min(bestAsk, price(record(ask, "ask").price));
    }
    return asks.length ? [{ assetId, bestAsk }] : [];
  }

  const changes = array(payload.pc ?? payload.price_changes, "price changes");
  return changes.map((value) => {
    const change = record(value, "price change");
    return {
      assetId: text(change.a ?? change.asset_id, "asset id"),
      bestAsk: price(change.ba ?? change.best_ask),
    };
  });
}
