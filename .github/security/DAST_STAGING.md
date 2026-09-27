# Staging DAST target approval

The scheduled ZAP baseline workflow scans only the unauthenticated public
surface of a dedicated staging host. It reads `DAST_STAGING_URL` from GitHub
repository variables and requires the exact hostname to appear in
`dast-staging-hosts.json`. The URL must be HTTPS at the origin root. Production
domains, IP literals, localhost, nonstandard ports, credentials, query strings,
fragments, unapproved hosts, and subpaths are rejected.

Before adding a host to the allowlist, verify and record that it:

- is a dedicated staging deployment owned by UnionOps;
- has separate credentials, database, storage, queues, and email sinks from
  production;
- contains synthetic test data only, with no production database or backup
  restore containing member or casework data;
- is isolated from production writes, outbound messages, and external callbacks;
- is reachable from GitHub-hosted runners using HTTPS and is covered by the
  organization's approval to run a passive baseline scan.

Add only its lowercase hostname to `approvedHosts` and configure the matching
origin as `DAST_STAGING_URL`. The workflow reports an explicit skip when the
variable is absent. A skip is not scan evidence. ZAP baseline is configured in
report-only mode initially; reviewers must triage the retained report and
record remediation or a specific exception before setting a blocking policy.
The scan does not test authenticated workflows, active exploitation, the
production host, or self-hosted installations.
