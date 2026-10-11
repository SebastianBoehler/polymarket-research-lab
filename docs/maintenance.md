# Maintenance and compatibility

## Verified maintenance baseline

The October 2026 refresh pins polymarket-cpp-client to v3.0.0, migrates includes
to its public polymarket/ namespace, and makes CI run the offline C++ suite.
TypeScript dependencies and transitives are refreshed within compatible ranges.
Bun types stay pinned to 1.3.5: the newer 1.4.x declarations reject existing
process signal handlers with the resolved Node types. The redundant @types/bun
package is removed. Direct imports of order-utils, ethers, and ws are declared
explicitly rather than relying on the client's transitive dependencies. The
order-utils package preserves legacy signing experiments; it is not evidence of
current V2 compatibility. A wholesale SDK migration remains separate work.

The refreshed lockfile reduces bun audit findings from 67 to 27 (11 high,
14 moderate, 2 low). Remaining reports involve axios 0.x, ws, and elliptic
through upstream SDK dependencies. This is not a clean security audit.
Resolve these through upstream SDK migrations and targeted compatibility checks;
do not force incompatible transitive versions merely to suppress reports.

## Execution compatibility work

Before claiming current live support:

1. Replace manually serialized legacy C++ orders with SDK V2 order helpers.
2. Resolve exchange contracts and fee metadata through the SDK rather than
   hard-coded historical addresses or universal fee assumptions.
3. Review TypeScript clob-client and real-time-data-client usage against the
   current official SDK and streaming migration guides.
4. Verify each strategy's dry-run, eligibility, error handling, order lifecycle,
   and one-leg exposure handling with focused tests.
5. Validate live behavior only with explicit authorization and bounded scope.

The existing tools are research experiments. Batch FOK orders do not make a
YES/NO pair atomic. Compilation and offline strategy calculations cannot prove
that orders settle, fees are modeled correctly, or a strategy is profitable.

References:

- [SDK CLOB V2 migration](https://github.com/SebastianBoehler/polymarket-cpp-client/blob/main/docs/clob-v2-migration.md)
- [Official SDK migration](https://docs.polymarket.com/)
- [Current fee model](https://docs.polymarket.com/trading/fees)

## Routine maintenance

For each dependency change, update its pin and lockfile together where applicable,
run the documented checks, and inspect upstream API changes. C++ SDK upgrades
must build every lab target, not only discovery_mode.

GitHub Actions updates are proposed by Dependabot. Bun package updates require
an explicit lockfile refresh and compatibility checks. Historical plots and CSVs
remain dated artifacts; regenerate them only with documented data and methodology.

Use small pull requests for confirmed defects. Avoid broad strategy rewrites or
new benchmarks without a concrete question and a reproducible success check.
