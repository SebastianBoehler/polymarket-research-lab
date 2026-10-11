# Contributing

Focused bug fixes, reproducible research, and clearer documentation are welcome.
Open an issue before a large strategy or architecture change so we can agree on
its question, evidence, and scope.

## Development

Use Bun 1.3.3 and install the committed lockfile:

```bash
bun install --frozen-lockfile
bun run typecheck
bun test
bun run build
```

For C++ changes, install CMake 3.22+, a C++20 compiler, Git, libcurl, OpenSSL,
and zlib, then run:

```bash
bun run cpp:configure
bun run cpp:build
bun run cpp:test
```

CI checks TypeScript and C++ separately, including CTest on Linux and macOS.
Offline tests do not validate live API compatibility or trading behavior.

## Pull requests

- Explain the concrete problem, changed behavior, and commands you verified.
- Keep diffs surgical and match the existing module boundaries.
- Aim for files below 300 lines. Avoid duplicate logic and unrequested features.
- Use conventional titles and commits: fix:, docs:, chore:, feat(module):.
- Add a focused regression test for a behavior fix when it demonstrates the failure.
- Commit dependency manifest and lockfile changes together.
- Do not commit wallet keys, API credentials, raw account activity, or large datasets.

## Research contributions

State the hypothesis, data source, collection dates, sample selection, and
resolution rules. Separate observed measurements from simulated fills.
Include entry prices, fees, slippage, unresolved outcomes, and out-of-sample
limitations when making profitability claims. Title similarity across platforms
is insufficient to establish equivalent contracts.

Keep raw data and generated reports under data/ (ignored by Git). Share a small,
anonymized fixture only when it is needed to reproduce a bug. Preserve historical
notes and label new conclusions with their evidence and date.

Live orders and on-chain transactions are not routine validation commands.
Execution experiments need their own compatibility review; see
[docs/maintenance.md](docs/maintenance.md).
