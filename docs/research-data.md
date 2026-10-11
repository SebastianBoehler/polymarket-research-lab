# Research data and verification

The October 2026 milestone corrects data interpretation and paper accounting.
It does not validate live execution or profitable strategies.

## Collection

Run `bun run collect`. Existing `MAX_PAGES`, `INTERVAL_MS`, `INCLUDE_KALSHI`,
and `OUT_DIR` environment variables control collection. Stop with Ctrl+C;
the collector completes the current scan before exiting. Scans do not overlap.

Generated records remain under ignored `data/` by default:

- `market-observations.jsonl`: schemaVersion 1, scan ID, normalized market,
  rules, fee metadata when supplied, source and receipt time. Polymarket records
  retain both complete book snapshots, token IDs, condition IDs, hashes, and
  each book's source timestamp and receipt time.
- `quote-failures.jsonl`: market ID, receipt time, and explicit request or
  validation error. Failed complementary quotes are excluded from market rows.
- `market-snapshots-v2.csv`, `spread-timeseries-v2.csv`, and
  `category-snapshots-v2.csv`: corrected CSV exports. Historical CSV files are
  left intact and are not appended with the new spread meaning.

YES/NO labels (including Up/Down) determine token ordering. Other labeled
contracts are excluded from this binary research view. Discovery skips missing
metadata prices with a warning. Discovery HTTP errors fail the scan. Metadata
prices have source `gamma` and no observed spread; collection requires both
CLOB books before recording a Polymarket executable-price observation.

Prices are asks for both outcomes. Spread is YES ask minus YES bid, rather
than the difference between complementary bundle cost and one dollar.
CSV `spread_pct` is the YES spread divided by the YES midpoint, times 100.
Category `avg_spread_pct` retains the existing convention of average absolute
spread times 100; it is not a midpoint-relative percentage.
Kalshi rows require observed YES/NO asks and YES bid. Kalshi quote sizes and
exchange source timestamps are not captured by this milestone. The Kalshi
limit bounds examined contracts, including rejected multivariate or unquoted
markets; a scan can return fewer rows or none.

Book source timestamps are preserved as supplied by the API. Receipt time
records when the request completed. Two HTTP books are separate observations,
not an atomic snapshot. Freshness gates, depth-based sizing, per-leg fees,
public trade capture, raw response archives, and replay remain future work.

## Outcomes and paper results

Outcome verification uses exact condition IDs, Gamma outcome labels, and
[Data API final resolution payouts](https://docs.polymarket.com/api-reference/markets/get-resolution-state).
A `closed` flag or a price near one is not final settlement evidence.
Legacy cached winner guesses are rechecked. Missing labels, split payouts,
unknown resolutions, and non-final statuses produce no binary winner.
HTTP and malformed-response errors propagate rather than appearing unresolved.

The resolved-history command examines at most `--limit` closed markets.
Its output is a sample by closed time, not a complete resolved-market census.
Outcome rates alone do not establish trading returns or calibration.
CSV entry observations are ordered by receipt timestamp, including across
collector restarts. Quoted multiline fields are retained.

The C++ complementary bundle projection computes shares as
`stake / (YES ask + NO ask)`, gross payout as shares, and profit as payout
minus stake. Fees and independent fill risk are not modeled.
Cross-platform title matches are contract review candidates; their gross
paired discount is not verified arbitrage. Market-maker dry runs preview
quotes without generating random fills, inventory, or simulated profits.

See [the roadmap](research-roadmap.md) for strategy examples and evaluation work.
