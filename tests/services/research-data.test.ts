import { describe, expect, test, spyOn } from "bun:test";
import { normalizePolymarketEvent } from "../../src/services/market-data/discovery";
import { parseOrderbook, enrichMarketQuotes } from "../../src/services/market-data/books";
import { fetchOutcome, verifiedOutcome } from "../../scripts/nothing-ever-happens/outcome-api";
import type { OutcomeCache } from "../../scripts/nothing-ever-happens/storage";

const receivedAt = "2026-10-11T12:00:00Z";
const event = {
  id: "event", slug: "event", title: "Binary event", endDate: "2026-12-31",
  markets: [{ conditionId: "condition", question: "Up?", slug: "up", active: true,
    outcomes: '["Down","Up"]', clobTokenIds: '["no-token","yes-token"]',
    outcomePrices: '["0.3","0.7"]', endDate: "2026-11-01" }],
};
const book = {
  asset_id: "yes-token", market: "condition", timestamp: "1234567890", hash: "hash",
  bids: [{ price: "0.4", size: "10" }, { price: "0.5", size: "20" }],
  asks: [{ price: "0.7", size: "30" }, { price: "0.6", size: "40" }],
};

describe("research data invariants", () => {
  test("maps tokens and prices by labels, retains market expiry, and leaves metadata spread unknown", () => {
    const market = normalizePolymarketEvent(event, receivedAt)[0];
    expect(market.tokenYes).toBe("yes-token");
    expect(market.yesPrice).toBe(0.7);
    expect(market.endDate).toBe("2026-11-01");
    expect(market.spread).toBeNull();
    expect(market.priceSource).toBe("gamma");
  });
  test("sorts real levels and retains book provenance", () => {
    const parsed = parseOrderbook(book, "yes-token", receivedAt);
    expect(parsed.bestBid).toBe(0.5);
    expect(parsed.bestAsk).toBe(0.6);
    expect(parsed.spreadBps).toBeCloseTo(1818.1818);
    expect(parsed.sourceTimestamp).toBe(book.timestamp);
    expect(parsed.receivedAt).toBe(receivedAt);
    expect(parsed.asks[0].size).toBe(40);
  });
  test("rejects empty, crossed, mismatched, and malformed books", () => {
    expect(() => parseOrderbook({ ...book, asks: [] }, "yes-token", receivedAt)).toThrow();
    expect(() => parseOrderbook(book, "other-token", receivedAt)).toThrow();
    expect(() => parseOrderbook({ ...book, bids: [{ price: "0.8", size: "1" }] }, "yes-token", receivedAt)).toThrow();
    expect(() => parseOrderbook({ ...book, asks: [{ price: "bad", size: "1" }] }, "yes-token", receivedAt)).toThrow();
  });
  test("does not retain metadata or a successful single leg when its complement fails", async () => {
    const fetch = spyOn(globalThis, "fetch").mockImplementation((async (input: Parameters<typeof globalThis.fetch>[0]) => {
      return String(input).includes("yes-token") ? Response.json(book) : new Response("Unavailable", { status: 404 });
    }) as typeof globalThis.fetch);
    try {
      const result = await enrichMarketQuotes(normalizePolymarketEvent(event, receivedAt), 1, 0);
      expect(result.markets).toHaveLength(0);
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].marketId).toBe("condition");
    } finally { fetch.mockRestore(); }
  });
  test("requires final payouts and translates reversed outcome order", () => {
    const resolution = { condition_id: "condition", status: "resolved", payouts: [0, 1_000_000] };
    expect(verifiedOutcome("condition", '["No","Yes"]', resolution)).toBe("yes");
    expect(verifiedOutcome("condition", '["Yes","No"]', { ...resolution, status: "proposed" })).toBeNull();
    expect(verifiedOutcome("condition", '["Yes","No"]', { ...resolution, payouts: [500_000, 500_000] })).toBeNull();
    expect(() => verifiedOutcome("other", '["Yes","No"]', resolution)).toThrow();
  });
  test("invalidates legacy cached guesses and ignores unrelated closed markets", async () => {
    const cache: OutcomeCache = { condition: { resolved: true, outcome: "yes" } };
    const fetch = spyOn(globalThis, "fetch").mockImplementation((async (input: Parameters<typeof globalThis.fetch>[0]) =>
      String(input).includes("v2/resolutions") ? Response.json({ data: [] }) :
        Response.json([{ conditionId: "unrelated", closed: true, outcomes: '["Yes","No"]', outcomePrices: '["1","0"]' }])
    ) as typeof globalThis.fetch);
    try {
      const result = await fetchOutcome({ id: "condition", title: "", slug: "", category: "" }, cache, 0);
      expect(result.outcome).toBeNull();
      expect(result.meta.resolved).toBe(false);
      expect(fetch).toHaveBeenCalledTimes(2);
    } finally { fetch.mockRestore(); }
  });
});
