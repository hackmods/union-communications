# Secret and container image scan gates — 2026-09-27

## Goal

Add CI secret scanning and scan the image that will actually be published or
deployed. A manually selected prebuilt GHCR image must not bypass image
scanning.

## Decisions and implementation

- Added `secret-scan` to `.github/workflows/ci.yml`. It fetches complete Git
  history, scans all refs with Gitleaks v8.30.1, and runs from a pinned
  linux/amd64 GHCR digest.
  Gitleaks output uses `--redact` so the matched secret value is not written to
  logs. The job is a dependency of both image publication and deployment.
- Added Trivy CRITICAL/HIGH gates with a nonzero finding exit code and
  `ignore-unfixed: false`. JSON scan reports are uploaded as 30-day workflow
  artifacts when the scan creates them.
- The locally built demo image must pass Trivy before the GHCR login/push
  sequence. `main` also builds the production-configured image locally, scans
  that configuration, then pushes the scanned tag as `:production`.
- Workflow dispatch pulls and scans the selected GHCR image tag. Deployment
  requires this scan to succeed. The tag is syntax-validated before it is
  written to the GitHub output file; after pull, deployment receives the
  registry digest for that scanned image.
- The push path requires the published `:main` and `:sha-*` tags to resolve to
  the same readable registry digest. That digest is passed to CapRover rather
  than resolving the mutable tag again at deploy time.
- Trivy action is pinned to commit
  `ed142fd0673e97e23eac54620cfb913e5ce36c25`; its scanner binary is explicitly
  set to `v0.74.0`. The Gitleaks CLI image is pinned by digest.
- Extended `scripts/check-security-workflows.mjs` to check the scanner jobs,
  image references and severities, output redaction, gates, and the scan-before-
  publish / scan-before-dispatch-deploy ordering.

## Verification

- `node scripts/check-security-workflows.mjs` passes.
- PyYAML parses `.github/workflows/ci.yml`; inspected job dependencies and the
  push/manual-dispatch deploy condition.
- `git diff --check` passes.
- The Docker Engine is unavailable in this environment, so neither the Gitleaks
  container nor local Trivy execution could run. GitHub Actions has not yet
  produced the first scanner run or reports. Treat scanner findings and hosted
  workflow behavior as unverified until that evidence is reviewed.

## Remaining limits

- CapRover's separate Git/webhook deployment path is external to this workflow
  and still needs to be disabled or independently gated.
- No safe-staging DAST or TypeScript/Next.js static security analysis has been
  added in this slice.
- Dependency exception approver permissions are still governed by review
  discipline; enforcement and image exception policy need explicit follow-up.
- Confirm on the hosted runner that Gitleaks can read the mounted full-history
  repository and that Trivy scans the local image referenced by the resolved
  digest as expected.

## Next

Review the first CI Gitleaks and Trivy logs/artifacts. Fix confirmed secrets or
vulnerabilities, avoid broad baselines, and add only specific documented
exceptions where an approved policy permits one. Exercise a controlled failing
scan to prove image publication and deploy are blocked. Then continue with
safe-staging DAST and static analysis.
