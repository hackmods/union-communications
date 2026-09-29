# CI dependency audit deployment gate — 2026-09-27

## Finding

The critical/high npm audit evaluator ran at the end of the `test-and-build`
job, but the `deploy` job depended only on `docker-image`. Docker publication
and deployment could therefore proceed even if the security audit failed.

## Change

Moved dependency audit execution into a dedicated `security-audit` job. It
checks out the lockfile, runs `npm audit --json`, and passes the report plus
exit status through the existing fail-closed severity/exception evaluator.
`docker-image` now depends on `security-audit`, so neither `main` nor
`production` image publication proceeds on an audit failure. The deploy job
requires `docker-image`, `test-gate`, and `security-audit`, and its
condition explicitly requires successful test-gate and audit results for push
and manual dispatch. The image job remains parallel with the quality and
sharded browser jobs, so it does not wait for E2E before building.

`scripts/check-security-workflows.mjs` now asserts the audit job content, its
dependency edge into image publication, all deploy dependencies (including
`test-gate` / sharded E2E), and required success conditions.

## 2026-09-29 follow-on — test sharding

See [`session-knowledge-2026-09-29-ci-test-sharding.md`](session-knowledge-2026-09-29-ci-test-sharding.md):
`test-and-build` replaced by `quality` ∥ `build-app` → 4× `e2e-smoke` +
`test-gate`; PR docs-only allowlist; deploy never skips the belt on `main`.

## Verification and remaining gap

- `node scripts/check-security-workflows.mjs` passes with assertions for the
  standalone audit job, image dependency, deploy dependencies, and success
  conditions.
- PyYAML parsed the workflow and a semantic check confirmed the `needs` graph
  and deploy condition.
- `node scripts/check-npm-audit.test.mjs` passes all four policy cases.
- `git diff --check` passes.
- GitHub's Actions service has not validated the updated workflow in this
  environment. No controlled failing-audit CI run is available here.
- CapRover may also deploy from an independent Git/webhook configuration that
  is outside this repository workflow. Verify it is disabled or gated before
  asserting every production deployment follows the security check.

## Follow-up

Add secret scanning, container/image scanning, and safe-staging DAST as separate
reviewable gates. Preserve explicit evidence for both CI and any external host
deployment integration.
