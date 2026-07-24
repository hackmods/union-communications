# Compliance & Security

## Data Classification

| Level | Examples | Access |
|-------|----------|--------|
| Public | Guides, templates | Anyone |
| Internal | Brand kits, captions | Local members |
| Confidential | Grievance notes | Assigned officers |
| Highly Confidential | Attachments, bumping PDFs | Need-to-know + MFA |

## Ontario & Canadian Privacy

- **PIPEDA** — consent, breach notification (72h), access rights
- **FIPPA** — public-sector members; data minimization, pseudonym option
- **Privacy by design** — Comms tools: no analytics, client-side processing, brand kit in browser storage
- **Hosted Officer Hub** — the **instance operator** is the data controller for sessions and hub records on that host; prefer Canadian data residency
- **Evaluation builds** — may use in-memory stores and demo accounts; not for real member case files without production hardening

## AODA / WCAG 2.1 AA

Semantic HTML, keyboard nav, contrast checker, EN/FR i18n, axe-core in CI.

## Union Governance

Separation of duties, immutable audit trail, 7-year retention default, member photo consent, legal disclaimer in app.

## Security Controls

| Control | Comms | Officer Hub |
|---------|-------|-------------|
| CSP headers | Yes (`next.config.ts`) | Yes (`next.config.ts`) |
| File upload validation | Type + size limits | + virus scan (ClamAV via `ATTACHMENT_SCANNER_URL`, or `skipped_dev`) |
| Attachment encryption at rest | N/A (on-device) | Local disk: encrypt the host/volume. S3: SSE-S3 AES256 on PutObject (`ATTACHMENT_S3_SSE`). CMEK optional/stretch. |
| Auth | None (public comms) | Auth.js + MFA (grant-hardened; TOTP preferred in prod) |
| RLS | N/A | Postgres policies in migrations; runtime must use `unionops_app` (not table owner). Contract: `src/lib/db/rls-contract.ts`; live: `npm run db:rls-smoke` |
| Dependency audit | CI `npm audit` | CI `npm audit` |
| `dangerouslySetInnerHTML` | Prohibited | Prohibited |
| Operator duty | N/A (on-device) | Host sets `AUTH_SECRET`; Canadian hosting preferred |

## Hybrid export residual risk

Hybrid backup export (`GET /api/hybrid/slice`) returns **plaintext JSON** over the authenticated TLS session. The browser encrypts with a client-only passphrase afterward — the server never learns the passphrase. Treat this as intentional: protect the TLS path (HTTPS in production via `AUTH_URL`), do not log response bodies, and responses set `Cache-Control: no-store`.

**Live-local path:** when Hybrid data mode is `local` and the officer unlocks the encrypted browser slice for the tab, grievance/bumping list/get/write run against that decrypted in-memory slice and re-encrypt to `localStorage`. Hub sync remains an explicit POST `/api/hybrid/slice` (merge/replace). Attachments and most other Hub APIs stay central. Closing the tab clears the decrypted session; the encrypted blob remains until cleared.

## Breach Response Playbook

1. Detect and contain (revoke tokens, isolate affected tenant)
2. Assess scope within 24 hours
3. Notify platform admin immediately
4. Notify affected union/local within 72 hours (PIPEDA)
5. Document in audit log; post-mortem within 14 days

## Postgres durability (SEC-003)

With `DATABASE_URL` + `GRIEVANCE_DB_BACKEND=postgres` (and peer flags for other modules), case rows survive process restart. Verify with `npm run db:durability-smoke` after `npm run db:migrate` and `npm run db:seed`. Compose demo defaults remain `memory` until an operator flips backends. See [`docs/guides/SETUP.md`](guides/SETUP.md).

## Attachment storage & scanning (FEAT-001)

- **Local (`ATTACHMENT_STORAGE=local`, default):** bytes under `ATTACHMENT_LOCAL_DIR` (`.data/attachments`). Encryption-at-rest depends on the host volume (LUKS, cloud disk encryption, etc.) — the app does not encrypt files itself.
- **S3-compatible (`ATTACHMENT_STORAGE=s3`):** MinIO / Cloudflare R2 / AWS via `@aws-sdk/client-s3`. PutObject sets `ServerSideEncryption=AES256` (SSE-S3) by default. Customer-managed keys (CMEK / SSE-KMS) remain an optional stretch.
- **Virus scan:** when `ATTACHMENT_SCANNER_URL` is set, uploads POST raw bytes to `${ATTACHMENT_SCANNER_URL}/scan` (`Content-Type: application/octet-stream`). Expect JSON `{ ok, infected? }` or ClamAV-style `stream: OK` / `FOUND`. Unset URL → `skipped_dev` (unless `ATTACHMENT_SCAN_MODE=strict`). Network failures fail closed (`pending`) unless `ATTACHMENT_SCAN_ALLOW_SKIP_ON_ERROR=true`.

## Legal Disclaimer (display in app)

> This tool helps track union processes. It does not provide legal advice. Locals should consult their national representative or legal counsel for grievance and arbitration matters.

## Union Body Standards Reference

| Standard | Module | Requirement |
|----------|--------|-------------|
| Ontario LRA | Grievance | Step tracking, timelines, confidentiality |
| Collective agreement | Grievance | Configurable per-union CA templates |
| PIPEDA / FIPPA | All with PII | Classification, retention, breach response |
| AODA WCAG 2.1 AA | All UI | EN/FR, keyboard, contrast, axe-core |
| Union governance | RBAC | Separation of duties, audit trail |
| Records retention | Grievance, bumping | 7-year default, configurable export |
