# Session knowledge — hosted operational readiness controls

**Date:** 2026-09-27  
**Scope:** UnionOps-operated customer profile; attachment storage/scanning, backup restore, and alerts  
**Status:** Configuration gates and evidence shape added; static checks pass; project tests and live-host evidence pending

## Finding

The existing host readiness summary checked database backend flags, migration
verification, demo auth, and hosted TOTP. It could mark a UnionOps-operated
customer profile ready without any explicit attachment storage review, strict
upload scanner, backup/restore proof, or alert delivery evidence. Local object
storage defaults to the app directory, while scanner settings can be permissive
outside strict mode. Backup and alert operation happen outside this process.

The app cannot independently prove that a mounted volume is durable/encrypted,
that a provider bucket has the promised location and lifecycle policy, that a
scanner is reachable, that a restore is valid, or that a notification reached
an accountable responder. Treating environment flags as those proofs would
overstate the evidence.

## Change recorded

- Added boolean-only `hostedControlEvidence` to `/api/health` requests that
  carry the dedicated `HOST_READINESS_SECRET` bearer token. Public health
  responses omit the operational evidence fields; owner names and dates never
  leave deployment configuration.
- For UnionOps-operated customer mode, readiness requires an explicit local
  directory or valid S3 credentials/configuration, explicit S3 region and
  AES256 server-side encryption when using S3, plus an operator approval and
  reviewer/date for the actual storage location, durability, encryption, and
  lifecycle.
- Customer mode also requires a scanner URL, strict scan mode, skip-on-error
  disabled, and an operator-dated scanner integration test.
- Backup and alert checks require their configured flags, named owners, and
  restore/delivery test dates. Attestation is considered current for 90 days;
  this is a provisional internal control interval, not a law or external
  standard.
- `Site Admin → Host readiness` labels operator evidence and states that these
  settings cannot verify external provider behavior. Passing the host page is
  not legal approval or the complete launch gate.
- The post-deploy script sends `HOST_READINESS_SECRET`; the production workflow
  requires both `UNIONOPS_HOSTED_CUSTOMER_MODE=true` and private evidence. The
  secret must be set on the app host and in GitHub Actions.
- The post-deploy CI readiness script applies the extra gates only when
  `UNIONOPS_HOSTED_CUSTOMER_MODE=true`; self-host and evaluation configurations
  keep the checks advisory. Both EN and FR help copy, production env example,
  operator setup/security guides, and `/updates` were updated.
- CI workflow review found the post-deploy readiness step misindented, with
  its shell body outside the step and the step not validly attached to the
  deploy job. Corrected the YAML structure and made the gate run after either
  a direct CI image deployment or a separately confirmed deployment detected
  through `/api/health`. YAML parsing and deploy-step ordering were verified.

## Verification and remaining work

Focused tests cover complete evidence, missing/default local storage, scanner
skip behavior, expired or invalid dates, and S3 encryption configuration.
Health-route tests cover public redaction and operator bearer access. Host
readiness tests cover customer-profile blocking and self-hosted advisory
behavior. Static TypeScript syntax checks for the service and route, Node script
syntax checks, migration journal validation (65 entries), npm-audit policy
checks (4 cases), EN/FR catalog key parity (10,909 each), and `git diff --check`
passed. Vitest, typecheck, and lint could not run because this checkout has no
`node_modules`; their executables (`vitest`, `tsc`, `eslint`) are unavailable.
The workflow syntax check used the available PyYAML parser; it does not replace
GitHub Actions server-side validation.
No production bucket, scanner, backup restore, or alert route was tested;
actual provider assessment, successful delivery, restore results, measured
RTO/RPO, and accountable runbooks remain required. The 90-day interval needs
operating-owner review.

The production provider list is not available in this checkout, so no provider
is pre-populated or published. A separate structured subprocessor registry is
now implemented and documented in
[`session-knowledge-2026-09-27-subprocessor-register.md`](session-knowledge-2026-09-27-subprocessor-register.md).
The user-reported merged Managed Documents foundation remains missing locally;
its legal-document surfaces must not be duplicated.

## Lesson

Keep three evidence layers separate: runtime configuration the app can inspect,
operator attestations with a named owner and review date, and independent
operating evidence such as provider records, successful test notifications,
restore logs, and measured recovery results. A readiness flag can gate missing
inputs; it cannot turn an attestation into an observed fact.
