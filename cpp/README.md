# C++ research tools

The lab uses [polymarket-cpp-client](https://github.com/SebastianBoehler/polymarket-cpp-client)
**v3.0.0**, with C++20 and CMake 3.22+. Install libcurl, OpenSSL, zlib, and Git.

## Build and test

Run from the repository root:

```bash
cmake -S cpp -B cpp/build -DCMAKE_BUILD_TYPE=Release
cmake --build cpp/build --parallel 4
ctest --test-dir cpp/build --output-on-failure
```

The default build includes all executables and the offline strategy test.
Release builds use native CPU optimizations; build on the machine where the
binaries will run. CMake checks whether link-time optimization is supported.

## Research scanner

`discovery_mode` fetches public markets and books, evaluates example signals,
and emits JSONL with paper projections. It does not place orders.

```bash
./cpp/build/discovery_mode --help
./cpp/build/discovery_mode --max 50 --iterations 1
./cpp/build/discovery_mode --15m --duration-min 30 \
  --interval-ms 30000 --out data/discovery.jsonl
```

Signals include `binary_arbitrage` and `market_making_candidate`. The calculations
check visible prices and depth, not a complete fee or execution model. Treat
reported edge as a research input, not realized profit.

## Execution experiments

`polymarket_arb`, `arb_test`, `batch_order_smoke`, `ladder_accumulation`,
`avg_in_test`, `order_test`, `order_benchmark`, and `position_smoke` contain
credentialed or execution-related code. `clob_client_test` requests live API data.
These are executable names, not offline CTest registrations.

Several experiments construct orders manually or use older exchange addresses.
They require a separate CLOB V2 migration and validation before live use.
An SDK upgrade or a passing compilation does not establish execution correctness.
See the SDK's [migration guide](https://github.com/SebastianBoehler/polymarket-cpp-client/blob/main/docs/clob-v2-migration.md).

Do not infer dry-run behavior from an executable's name. Inspect its argument
and environment handling before running it. Offline CI runs only the registered
`example_strategies_test` through CTest.

## Updating the SDK

```bash
bun run cpp:update-client
POLYMARKET_CLIENT_GIT_TAG=<tag-or-commit> bun run cpp:update-client
```

The helper clears the cached SDK checkout and rebuilds the research scanner and
main executable. Run the full build and CTest suite when changing the pinned ref.
Use namespaced public headers, for example `<polymarket/market_fetcher.hpp>`.

For contribution rules and compatibility boundaries, see
[CONTRIBUTING.md](../CONTRIBUTING.md) and [docs/maintenance.md](../docs/maintenance.md).
