import { expect, test, spyOn } from "bun:test";
import { readMarketBook, storeMarketBook, type MarketBook } from "../../src/core/market-book";

const level = { price: "0.5", size: "10" };
const book = { asset_id: "yes", asks: [level], bids: [level] };
const message = (payload: unknown) => ({ topic: "clob_market", type: "agg_orderbook", payload });
const invalid: unknown[] = [null, [], {}, "bad", { ...book, asset_id: 3 }, { ...book, asset_id: " " },
  { ...book, asks: {} }, { ...book, asks: [null] }, { ...book, bids: [null] },
  { ...book, asks: [level, { price: "bad", size: "2" }] },
  ...[-1, 1.1, "Infinity", "0.5x"].map((price) => ({ ...book, bids: [{ price, size: "2" }] })),
  ...[null, true, [], {}, "", " ", "0.5x", "Infinity", Infinity, NaN, 0, -1, 1.1].map((price) => ({ ...book, asks: [{ price, size: "2" }] })),
  ...[null, true, "", "2x", "Infinity", Infinity, -1, 0].flatMap((size) => [
    { ...book, asks: [{ price: "0.5", size }] }, { ...book, bids: [{ price: "0.5", size }] },
  ]),
];

test.each(invalid.map((payload) => ({ payload })))("rejects invalid full book %j before consumers see it", ({ payload }) => {
  const warn = spyOn(console, "warn").mockImplementation(() => {});
  try {
    expect(readMarketBook(message(payload))).toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
  } finally { warn.mockRestore(); }
});

test("normalizes valid numeric prices and sizes without losing either side", () => {
  expect(readMarketBook(message({ asset_id: "yes", asks: [{ price: 1, size: 2 }], bids: [{ price: 0, size: "3" }] })))
    .toEqual({ asset_id: "yes", asks: [{ price: "1", size: "2" }], bids: [{ price: "0", size: "3" }] });
});

test("keeps empty snapshots so consumers can clear stale liquidity", () => {
  expect(readMarketBook(message({ asset_id: "yes", asks: [], bids: [] })))
    .toEqual({ asset_id: "yes", asks: [], bids: [] });
});

test("ignores unrelated topics and message types", () => {
  expect(readMarketBook({ topic: "other", type: "agg_orderbook", payload: null })).toBeUndefined();
  expect(readMarketBook({ topic: "clob_market", type: "price_change", payload: null })).toBeUndefined();
});

test("invalid snapshots preserve cached books; empty snapshots clear them", () => {
  const books = new Map<string, MarketBook>();
  const warn = spyOn(console, "warn").mockImplementation(() => {});
  try {
    storeMarketBook(message(book), books);
    expect(books.get("yes")).toEqual(book);
    storeMarketBook(message({ ...book, asks: [level, null] }), books);
    expect(books.get("yes")).toEqual(book);
    storeMarketBook(message({ asset_id: "yes", asks: [], bids: [] }), books);
    expect(books.get("yes")?.asks).toEqual([]);
    expect(books.get("yes")?.bids).toEqual([]);
    storeMarketBook(message(book), books);
    expect(books.get("yes")).toEqual(book);
  } finally { warn.mockRestore(); }
});
