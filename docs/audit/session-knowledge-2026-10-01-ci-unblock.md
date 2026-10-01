# Session knowledge — 2026-10-01 CI unblock (typecheck → unit → e2e)

## What failed on `main`

Repeated red CI after feature merges was **not** a broken workflow YAML. Jobs failed in this order:

1. **Typecheck / build / docker** — `AuditLogInput` has `metadata`, not `details`; `HealthStatus.hostedPlansEnabled` required but omitted from a `baseHealth` fixture; env stubs needed `as unknown as NodeJS.ProcessEnv`.
2. **Unit** (after typecheck green) — `db-deploy.test.ts` hardcoded journal tail `0092` while SQL/`_journal.json` had reached `0094`; `content-review-catalog` missing `/brand-kit/showcase` already in `SHELL_PATHS`.
3. **E2E shard 1** — Site Admin Brand Styles mounts **two** lookbooks (union panel + host brand); bare `getByTestId('brand-lookbook')` strict-mode failed, then whole-page axe failed on **unlabeled hex** inputs next to colour pickers. Brand Kit preset `toPass` races showed as flaky.

Final green: commit `7f95b679` — https://github.com/hackmods/union-communications/actions/runs/36921676288

## Practices that prevent recurrence

| Change class | Update in the same PR | Guard |
|---|---|---|
| New Drizzle SQL migration | Journal + shape (`db:check`) | `db-deploy.test.ts` derives tail from SQL names (no hardcoded tag) |
| New public shell path | `sitemap` `SHELL_PATHS` **and** `content-review-catalog` | `content-review-catalog.test.ts` |
| New required `HealthStatus` field | Every `baseHealth` / health fixture | `npm run typecheck` |
| `auditLog.log` | `metadata: Record<string, string>` only | typecheck |
| Colour picker + hex | Label both inputs | axe in related smoke |
| Duplicate `data-testid` on one page | Scope e2e locators | Playwright strict mode |
| Brand Kit union/sector select | Hydration `toPass` | flaky smoke |

Agent rule: [`.cursor/rules/ci-contract-hygiene.mdc`](../../.cursor/rules/ci-contract-hygiene.mdc).

## Do not

- Treat “CI failed” as “fix the workflow” when `quality`/`e2e-smoke`/`test-gate` are red — read the job log first.
- Hardcode the latest migration tag in unit expectations again.
- Run whole-page axe on admin forms that introduce unlabeled controls, then silence by deleting axe — fix labels or scope the scan.
