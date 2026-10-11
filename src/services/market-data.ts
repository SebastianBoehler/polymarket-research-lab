export type { NormalizedMarket, CrossMarketPair, MarketSnapshot, CategoryStats } from "./market-data/types";
export { fetchPolymarketTags, fetchPolymarketEventsByTag, fetchAllPolymarketMarkets } from "./market-data/discovery";
export { fetchKalshiMarkets } from "./market-data/kalshi";
export type { OrderbookSnapshot } from "./market-data/books";
export { fetchOrderbook, enrichMarketQuotes, enrichWithClobPrices } from "./market-data/books";
export { findCrossMarketPairs, computeCategoryStats } from "./market-data/analysis";
