import { describe, expect, test } from "bun:test";
import { handleMarketMessage } from "../../src/core/market-stream";
import { MarketStreamValidationError } from "../../src/core/market-stream-payload";
import type { MarketState, MarketTracker } from "../../src/core/types";

function setup() {
  const market: MarketState = {
    slug: "test", title: "Test", symbol: "btc", conditionId: "condition",
    tokenYes: "yes", tokenNo: "no", bestAskYes: 0.4, bestAskNo: 0.6,
    totalCostYes: 0, totalSharesYes: 0, totalCostNo: 0, totalSharesNo: 0,
    ladderLevel: 0, lastEntryCombined: 0, entryCount: 0,
    lowestCombined: 1, highestCombined: 1, priceUpdates: 0,
  };
  const tracker: MarketTracker = { market, expiresAt: 0 };
  const tokens = new Map<string, { market: MarketTracker; side: "yes" | "no" }>([
    ["yes", { market: tracker, side: "yes" }],
    ["no", { market: tracker, side: "no" }],
  ]);
  const entries: number[] = [];
  const handle = (message: unknown) => handleMarketMessage(message, tokens, (m) => entries.push(m.bestAskYes + m.bestAskNo));
  return { market, entries, handle };
}

function message(type: string, payload: unknown) {
  return { topic: "clob_market", type, payload };
}

// These regressions catch unchecked arrays, coercion, and partial mutation.
const invalidPrices: unknown[] = [null, true, {}, [], "", " ", "oops", "Infinity", "NaN", Infinity, NaN, "0x1", "1e0", 0, -0.1, 1.01];

describe("market stream validation", () => {
  const malformedChanges: unknown[] = [
    null, {}, { pc: {} }, { pc: "bad" }, { pc: [null] }, { pc: [1] },
    { pc: [{ a: "yes" }] }, { pc: [{ a: 1, ba: "0.5" }] },
    { pc: [{ a: "", ba: "0.5" }] },
    ...invalidPrices.map((ba) => ({ pc: [{ a: "yes", ba }] })),
    ...invalidPrices.map((best_ask) => ({ price_changes: [{ asset_id: "no", best_ask }] })),
    { pc: [{ a: "yes", ba: "0.5" }, null] },
    { price_changes: [{ asset_id: "yes", best_ask: "Infinity" }] },
  ];
  test.each(malformedChanges)("rejects malformed price changes: %j", (payload) => {
    const { market, entries, handle } = setup();
    const before = { ...market };
    expect(() => handle(message("price_change", payload))).toThrow(MarketStreamValidationError);
    expect(market).toEqual(before);
    expect(entries).toEqual([]);
  });

  const malformedBooks: unknown[] = [
    null, {}, { asset_id: 1, asks: [{ price: "0.5" }] },
    { asset_id: "", asks: [{ price: "0.5" }] },
    { asset_id: "yes", asks: {} }, { asset_id: "yes", asks: "bad" },
    { asset_id: "yes", asks: [null] },
    { asset_id: "yes", asks: [{}] },
    ...invalidPrices.map((price) => ({ asset_id: "yes", asks: [{ price }] })),
    { asset_id: "yes", asks: [{ price: "0.5" }, { price: "oops" }] },
  ];
  test.each(malformedBooks)("rejects malformed order books: %j", (payload) => {
    const { market, entries, handle } = setup();
    const before = { ...market };
    expect(() => handle(message("agg_orderbook", payload))).toThrow(MarketStreamValidationError);
    expect(market).toEqual(before);
    expect(entries).toEqual([]);
  });

  test.each([null, [], "bad", {}, { topic: "clob_market" }].map((input) => ({ input })))("rejects malformed envelopes: %j", ({ input }) => {
    const { market, handle } = setup();
    expect(() => handle(input)).toThrow(MarketStreamValidationError);
    expect(market.priceUpdates).toBe(0);
  });

  test("applies compact and expanded price changes to both sides", () => {
    const { market, entries, handle } = setup();
    handle(message("price_change", { pc: [{ a: "yes", ba: "0.3" }] }));
    handle(message("price_change", { price_changes: [{ asset_id: "no", best_ask: 0.5 }] }));
    expect(market.bestAskYes).toBe(0.3);
    expect(market.bestAskNo).toBe(0.5);
    expect(market.priceUpdates).toBe(2);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toBeCloseTo(0.9);
    expect(entries[1]).toBeCloseTo(0.8);
  });

  test("selects the lowest ask from valid books on both sides", () => {
    const { market, entries, handle } = setup();
    handle(message("agg_orderbook", { asset_id: "yes", asks: [{ price: "0.5" }, { price: 0.2 }] }));
    handle(message("agg_orderbook", { asset_id: "no", asks: [{ price: "1" }] }));
    expect(market.bestAskYes).toBe(0.2);
    expect(market.bestAskNo).toBe(1);
    expect(market.priceUpdates).toBe(2);
    expect(entries).toEqual([0.8, 1.2]);
  });

  test("processes a valid message after rejecting a malformed batch", () => {
    const { market, entries, handle } = setup();
    expect(() => handle(message("price_change", { pc: [{ a: "yes", ba: "0.2" }, null] })))
      .toThrow(MarketStreamValidationError);
    handle(message("price_change", { pc: [{ a: "yes", ba: "0.5" }, { a: "no", ba: "0.5" }] }));
    expect(market.bestAskYes).toBe(0.5);
    expect(market.bestAskNo).toBe(0.5);
    expect(market.priceUpdates).toBe(2);
    expect(entries).toHaveLength(2);
  });

  test("ignores empty updates, unknown tokens, and unrelated messages", () => {
    const { market, entries, handle } = setup();
    handle(message("price_change", { pc: [] }));
    handle(message("agg_orderbook", { asset_id: "yes", asks: [] }));
    handle(message("price_change", { pc: [{ a: "unknown", ba: "0.5" }] }));
    handle(message("agg_orderbook", { asset_id: "unknown", asks: [{ price: "0.5" }] }));
    handle({ topic: "other", type: "price_change", payload: null });
    handle(message("other", null));
    expect(market.priceUpdates).toBe(0);
    expect(entries).toEqual([]);
  });
});
