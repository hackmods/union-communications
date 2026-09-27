# Session knowledge — 2026-09-27 — Public legal contact configuration

## Decision

Keep host public identity and role contact details in the host's environment configuration. The application does not choose a legal entity, name a Privacy Officer, or substitute a product steward for a legally accountable contact. Site Admin host readiness checks configuration and a recent operator monitoring review; only a boolean is exposed in health evidence. Public policy routes render the role-specific current contact block.

## Configuration contract

Required contact values:

- `UNIONOPS_LEGAL_ENTITY_NAME`
- `UNIONOPS_PRIVACY_OFFICER_NAME`
- `UNIONOPS_PRIVACY_EMAIL`
- `UNIONOPS_PRIVACY_MAILING_ADDRESS`
- `UNIONOPS_SECURITY_EMAIL`
- `UNIONOPS_ACCESSIBILITY_EMAIL`
- `UNIONOPS_PUBLIC_CONTACTS_MONITORED_AT` (`YYYY-MM-DD`)
- `UNIONOPS_PUBLIC_CONTACTS_MONITORED_BY`

Hosted customer readiness blocks when the values are absent/invalid or the monitoring review is older than 90 days. Self-hosted and demo profiles surface the same control as advisory because their operators own their legal identity and contact practices. The contact check is an operator attestation, not a delivery probe or legal approval. The post-deploy `scripts/verify-host-readiness.mjs` gate now checks this boolean, and its Node test covers both passing and failing evidence.

## Rendering and privacy

Privacy, security, accessibility, Terms, and DPA detail pages show the configured public contact role. React text rendering escapes configured names and address text; email validation rejects whitespace and malformed addresses before generating `mailto:` links. Health/readiness reports only a boolean and required variable names, never configured values.

## Remaining work

No production contact values were supplied or verified here. A responsible person must designate the Privacy Officer, determine the contracting legal entity, verify inbox and postal contact handling, configure production values, and obtain qualified legal/privacy review. No policy becomes approved/effective merely because contacts are configured.
