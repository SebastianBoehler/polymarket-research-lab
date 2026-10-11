# Repository instructions

This is a research workspace, not a validated trading product.

- Read README.md and docs/maintenance.md before changing execution paths.
- Keep patches focused. Ignore unrelated concurrent edits.
- Aim for files under 300 lines; extract cohesive interfaces and modules when needed.
- Keep research calculations in existing modules and outcome verification in
  scripts/nothing-ever-happens/. Do not duplicate SDK functionality.
- Use public <polymarket/...> headers and polymarket::client for C++ SDK integration.
- Do not add fallback data, simulated production success, or unrequested configuration.
- Keep credentials out of code, logs, reports, fixtures, and commits.
- Keep raw snapshots and generated reports under the ignored data/ directory.
- Distinguish observed data, paper projections, offline checks, and live execution.
- Preserve historical research notes; label dated assumptions rather than silently
  presenting old results as current evidence.

## Verification

TypeScript: bun install --frozen-lockfile, bun run typecheck, bun test, bun run build.
C++: bun run cpp:configure, bun run cpp:build, bun run cpp:test.
Use the narrowest meaningful checks for a patch and report limitations.
Never use live order, approval, merge, redemption, or deployment commands as tests
without explicit authorization. Read-only API checks must remain bounded.

## Commits

Use conventional prefixes such as fix:, docs:, chore:, and feat(module):.
When asked to commit, inspect tracked and untracked changes and group them logically.
See CONTRIBUTING.md for contributor expectations.
