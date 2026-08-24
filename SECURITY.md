# Security Policy

UnionOps — stewarded by Ryan Morris.

## Supported versions

Security fixes are applied on the current `main` branch and on tagged releases published to GHCR (`ghcr.io/hackmods/union-communications`).

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security problems.

Email a private report to the steward via the contact path on [unionops.org](https://unionops.org/en/support/), or open a **private** security advisory on this GitHub repository if available.

Include:

- Affected version or commit
- Steps to reproduce
- Impact (auth bypass, data exposure, injection, etc.)

We aim to acknowledge reports within 7 days.

## Hosted security practices

Public summary: [unionops.org/security](https://unionops.org/en/security/)

Operator reference (encryption claims, Hub/Portal controls, production checklist):

- [`docs/guides/HOSTED_SECURITY.md`](docs/guides/HOSTED_SECURITY.md)
- [`docs/COMPLIANCE.md`](docs/COMPLIANCE.md)
- Portal evidence: [`docs/audit/portal-encryption-security-audit-2026-08-24.md`](docs/audit/portal-encryption-security-audit-2026-08-24.md)

**Honest default:** Comms stay on-device. Hosted Officer Hub and Local Portal use HTTPS and access control; **application-level encryption at rest is not shipped for Portal Circles** today. Postgres + operator disk encryption cover Hub durability when configured.

## Known evaluation posture

Demo Officer Hub credentials and stub MFA exist for local development and CI. They are **not** a production security model. Operators hosting a real instance must set a strong `AUTH_SECRET`, disable demo auth before storing real member casework, and follow [`docs/guides/DEPLOY.md`](docs/guides/DEPLOY.md) and [`docs/guides/HOSTED_SECURITY.md`](docs/guides/HOSTED_SECURITY.md).

## Scope

In scope: authentication, authorization, tenancy isolation, secret handling, dependency issues in this repository.

Out of scope: social-engineering of union locals, issues only present when operators misconfigure production secrets, and third-party union brand assets.
