export interface NormalizedMarket {
  platform: "polymarket" | "kalshi";
  id: string;
  title: string;
  category: string;
  tags: string[];
  slug: string;
  yesPrice: number;
  noPrice: number;
  spread: number | null; // YES ask minus YES bid; null without a quote
  priceSource: "gamma" | "clob" | "kalshi";
  receivedAt: string;
  books?: { yes: import("./books").OrderbookSnapshot; no: import("./books").OrderbookSnapshot };
  resolutionSource?: string;
  rules?: string;
  feesEnabled?: boolean;
  feeSchedule?: { rate: number; exponent: number; takerOnly: boolean };
  volume: number;
  liquidity: number;
  endDate: string | null;
  active: boolean;
  url: string;
  // Polymarket-specific
  conditionId?: string;
  tokenYes?: string;
  tokenNo?: string;
  negRisk?: boolean;
  // Kalshi-specific
  seriesTicker?: string;
  eventTicker?: string;
}

export interface CrossMarketPair {
  polymarket: NormalizedMarket;
  kalshi: NormalizedMarket;
  similarity: number;
  priceDiff: number;
  rulesVerified: false;
  grossPairedDiscount: number;
}

export interface MarketSnapshot {
  timestamp: Date;
  polymarketMarkets: NormalizedMarket[];
  kalshiMarkets: NormalizedMarket[];
  crossMarketPairs: CrossMarketPair[];
  categories: CategoryStats[];
}

export interface CategoryStats {
  category: string;
  platform: string;
  count: number;
  avgSpread: number;
  avgVolume: number;
  totalVolume: number;
}

