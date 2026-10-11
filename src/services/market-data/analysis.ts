import type { NormalizedMarket, CrossMarketPair, CategoryStats } from "./types";

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function titleSimilarity(a: string, b: string): number {
  const wordsA = new Set(normalizeTitle(a).split(" "));
  const wordsB = new Set(normalizeTitle(b).split(" "));
  const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  if (union.size === 0) return 0;
  return intersection.size / union.size; // Jaccard similarity
}

export function findCrossMarketPairs(polymarketMarkets: NormalizedMarket[], kalshiMarkets: NormalizedMarket[], minSimilarity: number = 0.4): CrossMarketPair[] {
  const pairs: CrossMarketPair[] = [];

  for (const pm of polymarketMarkets) {
    for (const km of kalshiMarkets) {
      const sim = titleSimilarity(pm.title, km.title);
      if (sim < minSimilarity) continue;

      const priceDiff = Math.abs(pm.yesPrice - km.yesPrice);
      // Title matches are review candidates; settlement rules have not been verified.
      const crossCombined = Math.min(pm.yesPrice + km.noPrice, pm.noPrice + km.yesPrice);
      const grossPairedDiscount = 1 - crossCombined;
      const rulesVerified = false as const;

      pairs.push({
        polymarket: pm,
        kalshi: km,
        similarity: sim,
        priceDiff,
        rulesVerified,
        grossPairedDiscount,
      });
    }
  }

  return pairs.sort((a, b) => b.grossPairedDiscount - a.grossPairedDiscount);
}

// ─── Category Analysis ───────────────────────────────────────────────────────

export function computeCategoryStats(markets: NormalizedMarket[]): CategoryStats[] {
  const buckets = new Map<string, NormalizedMarket[]>();

  for (const m of markets) {
    const key = `${m.platform}:${m.category}`;
    const arr = buckets.get(key) || [];
    arr.push(m);
    buckets.set(key, arr);
  }

  const stats: CategoryStats[] = [];
  for (const [key, group] of buckets) {
    const platform = group[0].platform;
    const category = group[0].category;
    const spreads = group.flatMap((m) => m.spread === null ? [] : [m.spread]);
    if (spreads.length === 0) continue;
    const volumes = group.map((m) => m.volume);

    stats.push({
      category,
      platform,
      count: group.length,
      avgSpread: spreads.reduce((a, b) => a + b, 0) / spreads.length,
      avgVolume: volumes.reduce((a, b) => a + b, 0) / volumes.length,
      totalVolume: volumes.reduce((a, b) => a + b, 0),
    });
  }

  return stats.sort((a, b) => b.totalVolume - a.totalVolume);
}
