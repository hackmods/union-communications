# Session knowledge — 2026-09-27 — Public security claim correction

## Finding

The localized public Security copy and `docs/guides/HOSTED_SECURITY.md` had drifted from current application controls:

- `messages/en.json` and `messages/fr.json` described confidential Hub MFA as optional whenever an operator enabled it. `src/lib/auth/mfa-policy.ts` and `src/lib/ops/host-readiness.ts` show that UnionOps-operated hosted-customer mode requires production TOTP for privileged accounts/capabilities. Basic member surfaces are not blanket-gated. Self-host operators choose and verify their own policy.
- Both locales and the hosted guide described Local Portal as memory-only or said its durable adapter was not shipped. The code has memory and Postgres adapters. `PORTAL_DB_BACKEND` selects the runtime; memory remains the default, while `src/lib/ops/host-readiness.ts` recommends Postgres for a durable host. A code path does not prove a running host uses either backend.

## Changes and evidence

- Updated the EN/FR public Security and Site Admin host-readiness statements to describe privileged hosted-customer TOTP and the memory/Postgres storage choice without asserting live production configuration. Updated the Security page's review month.
- Updated the hosted Security and Compliance guides to remove obsolete memory-only/shipped-state claims and document the self-host responsibility boundary.
- Updated the claim register in `docs/LAUNCH_TRUST_LEGAL_REFACTOR.md` to record correction and retain host verification as open evidence.
- Verified the federal PIPEDA breach-notification wording against the [OPC business guidance](https://www.priv.gc.ca/en/privacy-topics/privacy-for-businesses/privacy-breaches-at-your-business/gd_pb_201810/) and [2025 finding](https://www.priv.gc.ca/en/opc-actions-and-decisions/investigations/investigations-into-businesses/2025/pipeda-2025-001/): when the applicable threshold is met, notification is required “as soon as feasible”; the 72-hour reference in that finding concerns UK GDPR. The repository's Compliance playbook already correctly distinguishes the PIPEDA rule from its internal operating targets.

## Limits and next work

These are source-to-claim corrections only. No production host, active Portal backend, or successful TOTP flow was observed in this review. Host-specific readiness, RLS, and privileged-route evidence remain required. The broader policy text still requires qualified legal/privacy review. Next Packet 2 work is centralized, monitored legal/privacy/security/accessibility contact configuration and approved policy ownership.
