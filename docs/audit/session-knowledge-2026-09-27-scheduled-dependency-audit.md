# Session knowledge — 2026-09-27 — scheduled dependency audit

**Scope:** Packet 9 lockfile monitoring and dependency update automation  
**Status:** Workflow and Dependabot configuration added; hosted runs and findings remain unverified

## Decision

- `.github/workflows/scheduled-dependency-audit.yml` runs weekly on Monday at
  09:17 UTC and supports manual dispatch. It installs the committed lockfile,
  runs `npm audit --json`, and evaluates results with the same
  `scripts/check-npm-audit.mjs` policy as the main CI job.
- Critical vulnerabilities always fail. High findings fail unless the exact
  package/advisory pair has an unexpired entry in
  `.github/security/npm-audit-exceptions.json` with approver and justification.
  Low and moderate findings do not fail this gate; they still appear in the
  captured report and need a tracked remediation process.
- The complete npm audit JSON is uploaded as a workflow artifact for 30 days,
  including when the policy step fails. An npm install failure also fails the
  job; the artifact upload tolerates a report that was never created.
- `.github/dependabot.yml` requests weekly updates for npm dependencies and
  GitHub Actions. Dependency update PRs still pass the existing PR CI gates.
- The CI deploy workflow had a malformed readiness-step indentation. It is
  corrected, and readiness now covers both a direct image deployment and a
  target deployment confirmed through `/api/health` when CapRover CLI secrets
  are unavailable.
- `scripts/check-security-workflows.mjs` runs in PR CI and asserts that the
  deployment readiness gate covers both paths, the scheduled workflow uses the
  shared evaluator and retains its report, and Dependabot contains both weekly
  ecosystems. This Node-only contract test complements local YAML parsing; it
  does not replace GitHub's workflow validation.

## Verification and limits

- Local PyYAML parsing covers all workflow YAML and Dependabot YAML. A
  structural assertion confirms the readiness step is in the deploy job after
  the health smoke and includes both deployment paths.
- The four Node dependency-policy test cases pass. The existing full CI audit
  policy is reused without a second, divergent severity implementation.
- `node scripts/check-security-workflows.mjs` passes and is wired into
  `npm run check:security-workflows` in the `test-and-build` CI job.
- These local checks do not execute GitHub Actions, validate repository-side
  Dependabot permissions, produce a scheduled report artifact, or prove update
  PRs arrive. Those need GitHub-hosted evidence.
- This slice only adds scheduled npm advisory checks and routine dependency
  updates. Secret scanning, static security analysis, image vulnerability
  scanning, safe-staging DAST, expanded accessibility journeys, and manual
  accessibility evidence remain open.
- `node_modules` is absent in this checkout, so `npm ci`, project tests,
  typecheck, lint, and the real npm registry audit were not run locally.

## Operational follow-up

After merge, verify a scheduled run completes and inspect its artifact. Review
Dependabot permissions and the first npm/GitHub Actions PRs. Track all
moderate/low findings, and remove or renew high exceptions before their expiry.
Do not treat a green dependency audit as evidence for application, image,
deployment, or accessibility security.
