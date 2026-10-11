# polymarket-research-lab

[![Build](https://github.com/SebastianBoehler/polymarket-research-lab/actions/workflows/build.yml/badge.svg)](https://github.com/SebastianBoehler/polymarket-research-lab/actions/workflows/build.yml)
[![C++ Build](https://github.com/SebastianBoehler/polymarket-research-lab/actions/workflows/cpp-build.yml/badge.svg)](https://github.com/SebastianBoehler/polymarket-research-lab/actions/workflows/cpp-build.yml)
[![License](https://img.shields.io/github/license/SebastianBoehler/polymarket-research-lab)](LICENSE)

A C++20 and TypeScript workspace for prediction-market research: collect market
snapshots, investigate pricing signals, and test strategy hypotheses.

## Related projects

| Project | Role |
| --- | --- |
| **[polymarket-research-lab](https://github.com/SebastianBoehler/polymarket-research-lab)** | Research scripts, datasets, paper projections, and experimental strategies |
| **[polymarket-cpp-client](https://github.com/SebastianBoehler/polymarket-cpp-client)** | Reusable C++ SDK for REST, WebSockets, signing, and positions; used by this lab |
| [limitless-cpp-client](https://github.com/SebastianBoehler/limitless-cpp-client) | C++ client for Limitless Exchange |
| [opinion-cpp-client](https://github.com/SebastianBoehler/opinion-cpp-client) | C++ client for Opinion.trade |

Use the SDK for application integration. Use this lab to investigate a research
question and preserve the assumptions behind a result.

## Status and scope

- TypeScript tools cover market discovery, CSV collection, outcome analysis,
  and experimental strategies.
- C++ `discovery_mode` emits JSONL signals and paper projections without placing orders.
- Other C++ executables and TypeScript strategies contain execution paths.
  Their live trading compatibility is **not validated** by the offline tests.
  Several manually construct order payloads and retain older contract addresses.
  Upgrading the SDK alone does not migrate those execution paths.
- Paper results do not include a complete execution, fee, settlement, or inventory model.
  Historical CSVs and plots are research artifacts, not current performance claims.

## Quick start: TypeScript

Requires [Bun](https://bun.sh/) 1.3.3 (the CI version).

```bash
git clone https://github.com/SebastianBoehler/polymarket-research-lab.git
cd polymarket-research-lab
bun install --frozen-lockfile
bun run typecheck
bun test
bun run build

# Public market analysis; requests live APIs, but does not place orders
bun run analyze

# Collect market snapshots into ./data until Ctrl+C
bun run collect
```

`bun run plots` currently runs the same summary script as `bun run analyze`;
it does not regenerate the historical PNG plots.

## Quick start: C++ research

Requires CMake 3.22+, a C++20 compiler, Git, libcurl, OpenSSL, and zlib.
Linux and macOS are checked in CI. On Ubuntu:

```bash
sudo apt-get install cmake build-essential git libcurl4-openssl-dev libssl-dev zlib1g-dev
```

From the repository root:

```bash
bun run cpp:configure
bun run cpp:build
bun run cpp:test

# One public market scan; writes JSONL to stdout
bun run discovery:cpp

# Crypto 15-minute markets, with a bounded collection period
./cpp/build/discovery_mode --15m --duration-min 30 \
  --interval-ms 30000 --out data/discovery.jsonl
```

CMake pins `polymarket-cpp-client` to **v3.0.0**. The lab uses the SDK's public
`<polymarket/...>` headers and `polymarket::client` target.
To rebuild the dependency, or explicitly test another ref:

```bash
bun run cpp:update-client
POLYMARKET_CLIENT_GIT_TAG=<tag-or-commit> bun run cpp:update-client
```

See [cpp/README.md](cpp/README.md) for executable scope and build details.

## Test a hypothesis

The “nothing ever happens” scripts measure historical binary Yes/No outcomes.
Choose your own snapshot CSV; raw datasets are not bundled with the repository.

```bash
bun run strategy:nothing-ever-happens -- \
  --csv data/market-snapshots.csv --side no --category Sports

# Alternatively, query the Gamma closed-market feed
bun run strategy:nothing-ever-happens:resolved -- \
  --lookback-hours 336 --limit 2000
```

The CSV verifier writes `data/nothing-ever-happens-report.md` and caches outcomes
in `data/market-outcome-cache.json`. A high NO win rate alone does not demonstrate
profitability: entry prices, sampling, unresolved outcomes, fees, and liquidity matter.

## Interpreting pricing signals

For equal shares of complementary YES and NO tokens in the same binary condition,
combined purchase cost below $1 is a **gross pricing signal**. Realized profit
also depends on both legs filling, fees, slippage, and settlement.

For example, 100 YES at $0.48 and 100 NO at $0.50 cost $98 before fees.
A $100 combined payout would leave $2 gross. A quoted book does not guarantee
those fills. Batch FOK orders apply all-or-nothing to each order individually;
the pair is not atomic, and one leg can fill while the other fails.

Fees vary by market. Check the market's current parameters and
[Polymarket's fee documentation](https://docs.polymarket.com/trading/fees).
Do not use a universal “0% fees” or “2% of profits” assumption.
Cross-platform title similarity also does not establish matching resolution rules.

## Project layout

| Path | Contents |
| --- | --- |
| `cpp/` | Research scanner, strategy calculations, execution experiments, CTest suite |
| `src/core/`, `src/services/` | Shared types, market data, wallet monitoring, positions |
| `src/scripts/`, `src/stats/` | Collection and analysis entry points |
| `src/strategies/` | Experimental execution strategies |
| `scripts/nothing-ever-happens/` | Historical outcome verification |
| `tests/` | Offline Bun tests |
| `data/` | Local data and reports, ignored by Git |
| `plots/`, `stats-summary*.csv` | Historical tracked research artifacts |

## Research notes

- [Market discovery findings](docs/market-discovery-findings.md)
- [Dead-outcome strategy](docs/dead-outcome-strategy.md)
- [Weather strategy discovery](docs/weather-strategy-discovery.md)
- [Maintenance and compatibility](docs/maintenance.md)

These notes preserve earlier investigations. Their dates and assumptions matter;
they are not evidence that a strategy currently works.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, checks, and research expectations.
Report reproducible bugs or propose a focused investigation through
[Issues](https://github.com/SebastianBoehler/polymarket-research-lab/issues).
Coding agents should start with [AGENTS.md](AGENTS.md).
For sensitive reports, follow [SECURITY.md](SECURITY.md).

## License and disclaimer

[MIT](LICENSE). This independent project is not affiliated with Polymarket.
Experimental execution can lose funds. Respect platform terms and geographic
restrictions; a proxy or VPN does not establish trading eligibility.
