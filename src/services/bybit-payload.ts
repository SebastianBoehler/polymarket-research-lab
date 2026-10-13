import { decimalNumber, MarketStreamValidationError, record, text } from "../core/stream-validation";
import type { SpotPriceUpdate } from "./bybit-ws";

function positive(value: unknown, field: string): number {
  const result = decimalNumber(value, field);
  if (result <= 0) throw new MarketStreamValidationError(`${field} must be positive`);
  return result;
}

export function parseBybitTicker(message: unknown): SpotPriceUpdate {
  const envelope = record(message, "ticker message");
  const topic = text(envelope.topic, "topic");
  const data = record(envelope.data, "ticker data");
  const symbol = text(data.symbol, "symbol");
  if (topic !== `tickers.${symbol}`) {
    throw new MarketStreamValidationError("ticker topic and symbol must match");
  }
  if (typeof envelope.ts !== "number") {
    throw new MarketStreamValidationError("timestamp must be a number");
  }
  const timestamp = positive(envelope.ts, "timestamp");
  if (!Number.isSafeInteger(timestamp)) {
    throw new MarketStreamValidationError("timestamp must be a safe integer");
  }
  return {
    symbol,
    timestamp,
    lastPrice: positive(data.lastPrice, "lastPrice"),
    bid1Price: data.bid1Price === undefined ? undefined : positive(data.bid1Price, "bid1Price"),
    ask1Price: data.ask1Price === undefined ? undefined : positive(data.ask1Price, "ask1Price"),
    price24hPcnt: data.price24hPcnt === undefined ? undefined : decimalNumber(data.price24hPcnt, "price24hPcnt"),
  };
}
