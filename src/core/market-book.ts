import { array, decimalNumber, MarketStreamValidationError, price, record, text } from "./stream-validation";

export interface MarketBook {
  asset_id: string;
  asks: { price: string; size: string }[];
  bids: { price: string; size: string }[];
}

function levels(value: unknown, side: "asks" | "bids"): MarketBook["asks"] {
  return array(value, side).map((value) => {
    const level = record(value, "book level");
    const levelPrice = price(level.price, side === "bids");
    const size = decimalNumber(level.size, "size");
    if (size <= 0) throw new MarketStreamValidationError("book size must be positive");
    return { price: String(levelPrice), size: String(size) };
  });
}

/** Returns only fully validated books; malformed snapshots never reach consumers. */
export function readMarketBook(message: unknown): MarketBook | undefined {
  try {
    const envelope = record(message, "message");
    const topic = text(envelope.topic, "topic");
    const type = text(envelope.type, "type");
    if (topic !== "clob_market" || type !== "agg_orderbook") return;
    const payload = record(envelope.payload, "payload");
    return {
      asset_id: text(payload.asset_id, "asset_id"),
      asks: levels(payload.asks, "asks"),
      bids: levels(payload.bids, "bids"),
    };
  } catch (error) {
    if (!(error instanceof MarketStreamValidationError)) throw error;
    console.warn(`Rejected market book: ${error.message}`);
  }
}

export function storeMarketBook(message: unknown, books: Map<string, MarketBook>): MarketBook | undefined {
  const book = readMarketBook(message);
  if (book) books.set(book.asset_id, book);
  return book;
}
