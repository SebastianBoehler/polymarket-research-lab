export interface MarketPriceUpdate {
  assetId: string;
  bestAsk: number;
}

export class MarketStreamValidationError extends Error {}

type RecordValue = Record<string, unknown>;

function record(value: unknown, field: string): RecordValue {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new MarketStreamValidationError(`${field} must be an object`);
  }
  return value as RecordValue;
}

function text(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new MarketStreamValidationError(`${field} must be a nonempty string`);
  }
  return value;
}

function array(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new MarketStreamValidationError(`${field} must be an array`);
  }
  return value;
}

function price(value: unknown): number {
  if (typeof value !== "number" &&
      (typeof value !== "string" || !/^\d+(?:\.\d+)?$/.test(value))) {
    throw new MarketStreamValidationError("ask price must be a decimal number");
  }
  const result = Number(value);
  if (!Number.isFinite(result) || result <= 0 || result > 1) {
    throw new MarketStreamValidationError("ask price must be finite and in (0, 1]");
  }
  return result;
}

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
