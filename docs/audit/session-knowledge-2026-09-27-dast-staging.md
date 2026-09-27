# Safe staging DAST — 2026-09-27

## Finding

No DAST staging origin or `DAST_STAGING_URL` setting was found in the
repository, operator guides, or existing CI inputs. `unionops.org` is the
documented live origin; the CI's optional `target_url` is a health-smoke input,
not evidence of a staging environment. Therefore this slice does not scan a
target and does not claim DAST coverage.

## Implementation

- Added `.github/workflows/dast-staging.yml` for weekly and manual OWASP ZAP
  baseline scans.
- Added `.github/security/dast-staging-hosts.json`, initially with an empty
  `approvedHosts` list, and operator safeguards in
  `.github/security/DAST_STAGING.md`.
- Added `scripts/prepare-dast-target.mjs`. It scans only when the repository
  variable `DAST_STAGING_URL` is set, uses HTTPS at the origin root, and the
  exact hostname is allowlisted. It rejects the known production apex/www,
  IP literals, localhost, nonstandard ports, URL credentials, path/query/
  fragment, and any unapproved host. Missing URL produces a step summary saying
  no scan ran and the ZAP job is skipped.
- ZAP baseline runs in report-only mode for findings and has automatic issue
  creation disabled. It tests unauthenticated public routes; it is not an
  authenticated test, active penetration test, production scan, or substitute
  for an independent review.
- `npm run check:dast-target` exercises allow/deny behavior, including IPv6
  loopback rejection; CI and the
  security workflow contract run/check this policy.

## Verification

- `npm run check:dast-target` passes all target-policy cases.
- `npm run check:security-workflows` checks schedule, target gating, no issue
  writes, report-only mode, allowlist shape, and hard production exclusions.
- PyYAML parses DAST, CodeQL, and CI workflows; it verifies the DAST scanner
  job depends on target validation, receives the repository variable, and is
  conditional on the validated output.
- The existing four npm audit policy cases pass; `git diff --check` passes.
- No staging target is configured, so no ZAP scan or artifact exists. The
  scanner cannot run until an isolated stage with synthetic data is provisioned
  and its exact hostname is reviewed and added to the allowlist.

## Next

Provision a dedicated staging host with separate storage/database/queues and
synthetic-only data. Add its hostname to the allowlist, set the matching
`DAST_STAGING_URL` repository variable, run the workflow, inspect the retained
baseline report, and assign remediation or justified exceptions. Keep the scan
nonblocking until the initial alert baseline has been reviewed.
