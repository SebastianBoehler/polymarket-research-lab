import { expect, test, spyOn } from "bun:test";
import { fetchKalshiMarkets } from "../../src/services/market-data/kalshi";

test("Kalshi prices use asks and YES spread, with bounded pagination", async () => {
  const fetch = spyOn(globalThis, "fetch").mockImplementation((async (_input: Parameters<typeof globalThis.fetch>[0]) => Response.json({
    markets: [{ ticker: "KXTEST", title: "Test", status: "open", yes_bid_dollars: "0.40",
      yes_ask_dollars: "0.45", no_ask_dollars: "0.65", no_bid_dollars: "0.55", volume: 1 }], cursor: "more",
  })) as typeof globalThis.fetch);
  try {
    const rows = await fetchKalshiMarkets(1);
    expect(rows[0].yesPrice).toBe(0.45);
    expect(rows[0].noPrice).toBe(0.65);
    expect(rows[0].spread).toBeCloseTo(0.05);
    expect(rows[0].priceSource).toBe("kalshi");
    expect(fetch).toHaveBeenCalledTimes(1);
  } finally { fetch.mockRestore(); }
});

test("Kalshi rejects absent asks instead of substituting last prices or complementary prices", async () => {
  const fetch = spyOn(globalThis, "fetch").mockImplementation((async (_input: Parameters<typeof globalThis.fetch>[0]) => Response.json({
    markets: [{ ticker: "KXTEST", title: "Test", status: "open", yes_bid: 40, last_price: 45 }], cursor: "more",
  })) as typeof globalThis.fetch);
  try {
    expect(await fetchKalshiMarkets(1)).toHaveLength(0);
    expect(fetch).toHaveBeenCalledTimes(1);
  } finally { fetch.mockRestore(); }
});
