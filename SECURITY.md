# Security Policy

UnionOps — stewarded by Ryan Morris.

## Supported versions

Security fixes are applied on the current `main` branch and on tagged releases published to GHCR (`ghcr.io/hackmods/union-communications`).

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security problems.

Email a private report to the steward via the contact path on [unionops.org](https://unionops.org), or open a **private** security advisory on this GitHub repository if available.

Include:

- Affected version or commit
- Steps to reproduce
- Impact (auth bypass, data exposure, injection, etc.)

We aim to acknowledge reports within 7 days.

## Known evaluation posture

Demo Officer Hub credentials and stub MFA exist for local development and CI. They are **not** a production security model. Operators hosting a real instance must set a strong `AUTH_SECRET`, disable or replace demo auth before storing real member casework, and follow [`docs/guides/DEPLOY.md`](docs/guides/DEPLOY.md).

## Scope

In scope: authentication, authorization, tenancy isolation, secret handling, dependency issues in this repository.

Out of scope: social-engineering of union locals, issues only present when operators misconfigure production secrets, and third-party union brand assets.
