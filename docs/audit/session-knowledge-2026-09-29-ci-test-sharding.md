# CI test sharding + parallel quality — 2026-09-29

## Finding

`test-and-build` was a single serial job (~20–21 min). Measured green PR
`36630308731`: unit ~4 min, Next build ~1.3 min, Playwright install ~20 s,
**E2E `@smoke` ~14 min** at `workers: 1` (~402 cases). `docker-image` already
finished before E2E; deploy waited on the test job name.

## Change

Replaced `test-and-build` with:

| Job | Role |
|-----|------|
| `detect-changes` | PR-only docs allowlist (`docs/**`, `*.md`, `.cursor/**`, `LICENSE*`); `main` / `workflow_dispatch` always `run_full=true` |
| `quality` | lint, contracts, typecheck, unit (no Playwright) |
| `build-app` | `npm run build` once; upload `.next/standalone` + `.next/static` + `public` |
| `e2e-smoke` | matrix shards `1..4`, `--shard=N/4`, Playwright cache, `workers` still 1 |
| `test-gate` | requires quality + e2e when `run_full`; succeeds on intentional docs-only skip |

`deploy.needs` now waits on `test-gate` (not `test-and-build`).
`scripts/check-security-workflows.mjs` asserts the new job names, shard flag,
and `run_full` gates.

## Non-goals (this pass)

- Do not raise CI Playwright `workers`
- Do not skip tests on `main` / before CapRover deploy
- No affected-test graphs; no `@smoke` cuts

## Verification

- `node scripts/check-security-workflows.mjs` passes locally after the rewrite.
- First green PR after merge should show wall clock ~6–8 min for the test gate
  (max of quality vs build + one shard). Re-check Actions timings and update
  this note if shards are unbalanced or artifact download dominates.

## Follow-up

If wall clock stays high, inspect slowest shard HTML report and consider a
fifth shard only after flake rate is known. Deploy health polling remains a
separate ~5–10 min cost after the test gate.
