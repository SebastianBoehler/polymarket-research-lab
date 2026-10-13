import { expect, spyOn, test } from "bun:test";
import { BybitSpotClient } from "../../src/services/bybit-ws";

const ticker = {
  topic: "tickers.BTCUSDT", ts: 1000,
  data: { symbol: "BTCUSDT", lastPrice: "50000", bid1Price: "49999", ask1Price: "50001", price24hPcnt: "-0.02" },
};
const invalid: unknown[] = [
  null, [], {}, { ...ticker, data: null }, { ...ticker, ts: "1000" }, { ...ticker, ts: 1.5 },
  { ...ticker, ts: "bad" }, { ...ticker, ts: Infinity }, { ...ticker, ts: -1 },
  { ...ticker, data: { ...ticker.data, symbol: undefined } },
  { ...ticker, data: { ...ticker.data, symbol: "ETHUSDT" } },
  ...["50000bad", "Infinity", "", 0, -1, true].map((lastPrice) => ({ ...ticker, data: { ...ticker.data, lastPrice } })),
  ...["bid1Price", "ask1Price", "price24hPcnt"].map((field) => ({ ...ticker, data: { ...ticker.data, [field]: "NaN" } })),
];

test.each(invalid.map((input) => ({ input })))("malformed ticker cannot update price or history: %j", ({ input }) => {
  const client = new BybitSpotClient(["BTCUSDT"]);
  const log = spyOn(console, "log").mockImplementation(() => {});
  const warn = spyOn(console, "warn").mockImplementation(() => {});
  try {
    client["handleTickerUpdate"](input);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(client.getLatestPrice("BTCUSDT")).toBeUndefined();
    expect(client.getLatestPrice("ETHUSDT")).toBeUndefined();
    expect(client.getPriceHistory("BTCUSDT")).toEqual([]);
  } finally { log.mockRestore(); warn.mockRestore(); }
});

test("accepts a valid ticker and rejects later corruption", () => {
  const client = new BybitSpotClient(["BTCUSDT"]);
  const log = spyOn(console, "log").mockImplementation(() => {});
  const warn = spyOn(console, "warn").mockImplementation(() => {});
  try {
    client["handleTickerUpdate"](ticker);
    expect(client.getLatestPrice("BTCUSDT")).toEqual({
      symbol: "BTCUSDT", lastPrice: 50000, timestamp: 1000,
      bid1Price: 49999, ask1Price: 50001, price24hPcnt: -0.02,
    });
    client["handleTickerUpdate"]({ ...ticker, ts: "bad" });
    expect(client.getPriceHistory("BTCUSDT")).toHaveLength(1);
    expect(client.getLatestPrice("BTCUSDT")?.timestamp).toBe(1000);
  } finally { log.mockRestore(); warn.mockRestore(); }
});

test("raw frames reject invalid JSON and accept the next valid ticker", () => {
  const client = new BybitSpotClient(["BTCUSDT"]);
  const log = spyOn(console, "log").mockImplementation(() => {});
  const warn = spyOn(console, "warn").mockImplementation(() => {});
  try {
    for (const raw of ["bad", "null", "[]", '{"op":"pong"}', '{"op":"subscribe","success":true}']) {
      expect(() => client["handleMessage"](raw)).not.toThrow();
    }
    expect(client.getPriceHistory("BTCUSDT")).toEqual([]);
    client["handleMessage"](JSON.stringify(ticker));
    expect(client.getLatestPrice("BTCUSDT")?.lastPrice).toBe(50000);
    expect(client.getPriceHistory("BTCUSDT")).toHaveLength(1);
  } finally { log.mockRestore(); warn.mockRestore(); }
});

test("spot snapshots do not invent absent quote fields", () => {
  const client = new BybitSpotClient(["BTCUSDT"]);
  const log = spyOn(console, "log").mockImplementation(() => {});
  try {
    client["handleTickerUpdate"]({ topic: "tickers.BTCUSDT", ts: 1000, data: { symbol: "BTCUSDT", lastPrice: "50000" } });
    expect(client.getLatestPrice("BTCUSDT")?.bid1Price).toBeUndefined();
    expect(client.getLatestPrice("BTCUSDT")?.ask1Price).toBeUndefined();
  } finally { log.mockRestore(); }
});

test("a valid ticker for an unsubscribed symbol cannot create history", () => {
  const client = new BybitSpotClient(["BTCUSDT"]);
  const warn = spyOn(console, "warn").mockImplementation(() => {});
  try {
    client["handleTickerUpdate"]({ topic: "tickers.ETHUSDT", ts: 1000, data: { symbol: "ETHUSDT", lastPrice: "3000" } });
    expect(client.getLatestPrice("ETHUSDT")).toBeUndefined();
    expect(client.getPriceHistory("ETHUSDT")).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(1);
  } finally { warn.mockRestore(); }
});
