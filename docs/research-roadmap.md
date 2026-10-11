# Research roadmap

Status: first data-correctness milestone implemented, 11 October 2026.
Strategy examples and replay remain proposed; profitability is not validated.

## Direction

Build a small, reproducible research toolkit with runnable examples. Prioritize
recorded evidence, correct accounting, and honest execution assumptions. Keep
transport and signing in polymarket-cpp-client; keep research questions here.

Three possible directions:

| Direction | Benefit | Trade-off |
| --- | --- | --- |
| Reliable data and replay first (recommended) | Every later example shares defensible inputs and evaluation | Fewer new strategy demos initially |
| Strategy examples first | Quickly expands contributor entry points | Current source and fill assumptions can invalidate results |
| Execution and speed first | Improves application integration and latency measurements | Faster execution does not establish a usable research signal |

## First milestone completed

- market-data.ts can retain Gamma prices when a CLOB book is unavailable and
  reports enrichment without recording whether both legs succeeded.
- Its spread field is abs(1 - YES price - NO price), not an individual token's
  ask minus bid. Complementary bundle cost and bid-ask spread need distinct names.
- collect-market-data.ts stamps an entire scan before asynchronous requests,
  discards book depth, and can overlap scans through setInterval.
- Cross-platform matching labels title-similarity pairs as arbitrage without
  checking deadlines, settlement sources, outcome equivalence, or fees.
- market-maker.ts generates random dry-run fills; those cannot validate a strategy.
- Outcome verification probes several query shapes, can pick an unmatched first
  result, and treats closed status as resolution evidence. Matching identifiers
  and explicit final settlement evidence need stricter handling.
- The C++ complementary bundle projection used stake * (1 - combined_price).
  The accompanying correction uses shares = stake / combined_price, gross
  payout = shares, and gross profit = payout - stake. This remains before fees.

These defects are corrected in the first milestone. The list records the
previous behavior. See [research data](research-data.md) for current outputs
and remaining limits.

## Data to support

| Data | Required fields and purpose |
| --- | --- |
| Point-in-time market metadata | Event, market, condition and token IDs; outcome labels; rules and resolution source; expiry; tick size; fee parameters; position system |
| Order books | Both sides and sizes; token ID; source timestamp and receive timestamp; snapshot/update kind; freshness and connection gaps |
| Public trades | Documented IDs, timestamps, price, size, and side semantics; deduplication and incomplete-coverage status |
| Resolution evidence | Exact market match, final payouts, source, observation time; unresolved and disputed states remain separate |
| External reference prices | Provider, symbol, source time, receive time, quote currency, and relation to the market's settlement rules |
| Weather observations | Rule-specific station, local date/time zone, units, rounding, forecast issue time, observation time, and settlement-source comparison |

Start with a bounded market set and the existing JSONL approach. Preserve raw
records alongside normalized records and a run manifest containing the commit,
schema version, collection interval, selection rule, and failures. Keep CSV as
an export. Evaluate columnar export only after measuring storage/query costs.

Never substitute metadata prices for an unavailable executable quote. A missing
book, dropped stream interval, or unresolved outcome is an explicit data status.
Validate outcome labels instead of assuming token index zero always means YES.

## Shared evaluation

Use one chronological replay runner and small strategy functions. Each example
consumes records available at its decision time and emits a signal with reasons.
The evaluator owns sizing, depth sweeps, fees, position accounting, and reports.

- Replay using receive time for information availability. Source time helps
  diagnose latency but must not reveal data before the collector received it.
- Split evaluation forward in time. Keep related event outcomes together and
  account for overlapping holding periods at split boundaries.
- Use recorded asks and depth for taker entry; bids and depth for exits.
- Reject unfillable sizes. Model each complementary leg independently.
- Passive quote touches are not proven fills. Require observed trade evidence
  and state queue-position uncertainty; report conditional results accordingly.
- Track unresolved positions, held capital, gross/net PnL, fees, drawdown,
  coverage, rejected signals, and stale-data intervals.
- Compare probabilistic forecasts with the contemporaneous market probability
  using calibration and Brier score (mean squared probability error).

Every example should include its hypothesis, required inputs, one command, a
small real or explicitly synthetic test fixture, a report, and known limitations.
Test fixtures validate software; they are not substitutes for research data.

## Example priorities

| Priority | Example | Question | Success check |
| --- | --- | --- | --- |
| 1 | Complementary YES/NO pricing | Does apparent discount remain after depth, per-market fees, and delayed independent fills? | Correct bundle accounting; edge-versus-size report; one-leg exposure scenarios |
| 1 | NO / longshot calibration | Are outcomes mispriced conditional on entry price, category, and time to expiry? | Compare probability calibration and net returns with held-out event groups; retain unresolved denominator |
| 2 | Spread compression / book imbalance | Does tightening or changing depth predict subsequent executable returns? | Chronological evaluation beats a declared baseline after costs, or records a negative result |
| 2 | Passive market making | Is spread capture larger than adverse selection and inventory loss? | Recorded trade-based fill assumptions, future-price markouts, inventory and uncertainty reports |
| 3 | Crypto reference-price response | Does the market react slowly enough to trade after reference moves? | Same-collector timing, exact settlement-source mapping, delayed-fill evaluation |
| 3 | Weather station / range basket | Do station information or exhaustive bucket prices reveal mispricing? | Explicit rules mapping; complete outcome coverage; precision and source differences retained |
| Later | Cross-platform contract comparison | Are two contracts actually equivalent? | Reviewed rules, deadlines and outcome mapping before any paired price signal |

Keep momentum, fade, and compression examples as hypotheses rather than
promoting the least-negative historical result as a proven strategy. The May
research notes record losses from the earlier price-only experiments; their
backtester and raw data are not bundled in this checkout.

## Code updates and optimization

1. Correct the confirmed accounting, source, timestamp, and outcome-matching defects.
2. Extract the touched sections of market-data.ts into types, discovery, books,
   and matching modules, preserving a single implementation of each operation.
3. Record and replay a small real dataset before adding more strategy families.
4. Migrate outdated SDK and streaming integrations in separate compatibility patches.
5. Replace repeated two-request-per-market polling with supported batching or
   shared subscriptions where appropriate. Measure request count and snapshot age.
6. Benchmark capture throughput, dropped records, replay rows/second, peak memory,
   and bytes/record. Optimize measured bottlenecks with identical recorded input.

Do not port all analysis to C++ by default. Use C++ for measured capture/replay
hot paths and TypeScript for orchestration and reports. Avoid duplicated parsers,
a generic plugin framework, or new storage services before there is a need.

## External references and conditions

- [Prices and books](https://docs.polymarket.com/market-data/prices-order-books)
  and [fees](https://docs.polymarket.com/trading/fees) define current inputs.
- [RTDS to PolyBolt migration](https://docs.polymarket.com/migrate/rtds-to-polybolt):
  reference-price channels require CLOB credentials, and source/symbol semantics
  change. This does not mean every RTDS topic or CLOB market stream moves.
- The [official documentation index](https://docs.polymarket.com/llms.txt) lists
  unified SDK, Data API, and protocol migrations; verify affected routes before
  changing an integration.
- [AviationWeather API](https://aviationweather.gov/data/api/) provides station
  observations and forecasts with rate limits. METAR observations alone do not
  prove a market's exact daily extreme or settlement-source reading.
- [OpenMarket](https://arxiv.org/abs/2607.26245) offers synchronized crypto-market
  research and reports a negative out-of-sample forecasting result. Assess its
  license, schema, coverage, and clock assumptions before reusing any dataset.
