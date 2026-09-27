# Compliance & Security

## Data Classification

| Level | Examples | Access |
|-------|----------|--------|
| Public | Guides, templates | Anyone |
| Internal | Brand kits, captions | Local members |
| Confidential | Standard grievance casework, internal notes | Assigned case team, grievance officer, local president/vice-president |
| Highly Confidential | Restricted grievances, attachments, bumping PDFs | Explicit case team / grievance officer; MFA for officer casework |

Grievance executives receive non-identifying summaries only. Union/division
administrators receive aggregate metadata and configuration access; platform
administrators receive operational metadata. Platform grievance break-glass
requires MFA, a reason, one exact case, and expires after 30 minutes. A
member-facing grievance projection is allowlisted and never includes internal
notes, events, strategy, settlement terms, other participants, or unshared
attachments.

UnionOps Data imports, raw staging values, member assertions, and employment histories are confidential personal information. The first release keeps them officer-only, scopes every API and database query to the active union/local, requires MFA, and requires PostgreSQL. Uploaded source files use the configured private attachment store and malware scanner; production imports fail closed when scanning is unavailable. Raw-file and staging retention/purge jobs are not yet implemented, so operators must include the configured attachment volume or bucket in their retention controls before using real member data.

## Ontario & Canadian Privacy

- **PIPEDA** — consent, access rights, and applicable breach reporting and
  notification. When PIPEDA's real-risk-of-significant-harm threshold applies,
  report to the OPC and notify affected individuals as soon as feasible after
  determining the breach occurred. Keep a record of every breach for the
  required period. Confirm which privacy law and duties apply to each customer
  and hosting relationship with qualified counsel.
- **FIPPA** — public-sector members; data minimization, pseudonym option
- **Privacy by design** — Comms tools: no analytics, client-side processing, brand kit in browser storage. Hosted instances may enable **operator error sinks** (Sentry and/or server JSONL) via env only — not product analytics; see ADR-006 amendment and [`OBSERVABILITY.md`](modules/OBSERVABILITY.md).
- **Hosted Officer Hub** — the **instance operator** is the data controller for sessions and hub records on that host; prefer Canadian data residency. If UnionOps hosts Officer Hub or Local Portal for a local, hosting has a cost (ADR-019); that does not change who the controller is on that instance.
- **Evaluation builds** — may use in-memory stores and demo accounts; not for real member case files without production hardening
- **Site feedback (ADR-018)** — optional public/Hub notes about the UnionOps website (text + optional name/email). The instance operator is responsible for the collection. Reply-only contact; not a mailing list. Prefer `FEEDBACK_DB_BACKEND=postgres` for real collection. An authorized Site Admin can delete individual submissions; no scheduled purge or approved retention period is implemented. Confirm the applicable period with the Privacy Officer before collecting real submissions.

## Accessibility assurance

WCAG 2.2 AA is the internal engineering target for new work ([W3C standard](https://www.w3.org/TR/WCAG22/)). Semantic HTML,
keyboard support, contrast checks, EN/FR coverage, and selected axe-core CI
checks are in place, but they do not establish site-wide conformance. AODA
requirements depend on the organization and content in scope; covered
organizations' web requirements reference WCAG 2.0 AA with stated exceptions
([Ontario guidance](https://www.ontario.ca/page/how-make-websites-accessible)).
Confirm the applicable obligation and complete a scoped assessment before
making a conformance claim.

## Union Governance

Separation of duties, an auditable history with append-only database controls
verified on the deployed host, approved retention schedules by record class,
member photo consent, and the legal disclaimer in app. Current audit durability
and append-only permissions still require host and database verification. Do
not apply a universal retention period without an approved legal and customer
schedule.

## Security Controls

See also: [`docs/guides/HOSTED_SECURITY.md`](guides/HOSTED_SECURITY.md) (operator checklist + encryption claim vs reality).

| Control | Comms | Officer Hub |
|---------|-------|-------------|
| CSP headers | Yes (`next.config.ts`) | Yes (`next.config.ts`) |
| File upload validation | Type + size limits | + CSV/XLSX content checks, 25 MiB upload / 50,000 row / 200 column limits, formulas rejected, virus scan (ClamAV via `ATTACHMENT_SCANNER_URL`; production fails closed) |
| Attachment encryption at rest | N/A (on-device) | Local disk: encrypt the host/volume. S3: SSE-S3 AES256 on PutObject (`ATTACHMENT_S3_SSE`). CMEK optional/stretch. |
| Auth | None (public comms) | Auth.js; UnionOps-hosted customer mode requires production TOTP for privileged capabilities; other host policy is operator-configured |
| RLS | N/A | Postgres policies in migrations; runtime must use `unionops_app` (not table owner). Contract: `src/lib/db/rls-contract.ts`; live: `npm run db:rls-smoke` |
| Dependency audit | CI `npm audit` | CI `npm audit` |
| `dangerouslySetInnerHTML` | Prohibited | Prohibited |
| Operator duty | N/A (on-device) | Host sets `AUTH_SECRET`; Canadian hosting preferred |

## Hybrid export residual risk

Hybrid backup export (`GET /api/hybrid/slice`) returns **plaintext JSON** over the authenticated TLS session. The browser encrypts with a client-only passphrase afterward — the server never learns the passphrase. Treat this as intentional: protect the TLS path (HTTPS in production via `AUTH_URL`), do not log response bodies, and responses set `Cache-Control: no-store`.

**Live-local path:** when Hybrid data mode is `local` and the officer unlocks the encrypted browser slice for the tab, grievance/bumping list/get/write run against that decrypted in-memory slice and re-encrypt to `localStorage`. Hub sync remains an explicit POST `/api/hybrid/slice` (merge/replace). Attachments and most other Hub APIs stay central. Closing the tab clears the decrypted session; the encrypted blob remains until cleared.

## Breach Response Playbook

1. Detect and contain (revoke tokens, isolate affected tenant).
2. Escalate immediately to the designated privacy/security leads and preserve
   relevant evidence.
3. Assess scope, sensitivity, probability of misuse, and applicable legal,
   contractual, and customer notification duties. Use internal response targets
   as operational goals, not as statements of statutory deadlines.
4. Where PIPEDA applies and its reporting threshold is met, report to the OPC
   and notify affected individuals as soon as feasible after determining that
   the breach occurred. Document the risk assessment and notification decisions.
5. Where PIPEDA applies, retain a record of every security-safeguard breach
   involving personal information for 24 months from the day the organization
   determines the breach occurred ([OPC guidance](https://www.priv.gc.ca/en/privacy-topics/privacy-for-businesses/privacy-breaches-at-your-business/breach_101/breach_records/)). Confirm other legal and contractual periods with counsel. Record containment, remediation, and lessons in the restricted incident record; keep incident details out of ordinary error telemetry.

## Postgres durability (SEC-003)

With `DATABASE_URL` + `GRIEVANCE_DB_BACKEND=postgres` (and peer flags for other modules), case rows survive process restart. Verify with `npm run db:durability-smoke` after `npm run db:migrate` and `npm run db:seed`. Compose demo defaults remain `memory` until an operator flips backends. See [`docs/guides/SETUP.md`](guides/SETUP.md).

Local Portal has an asynchronous adapter with memory and Postgres backends.
Postgres persistence uses the restricted runtime role and RLS; the effective
backend is selected with `PORTAL_DB_BACKEND`. Memory remains the default, so
activity written to a memory-backed instance can disappear on restart. The
combined 53-entry migration chain through `0052` has passed fresh and
`0039`-era upgrade verification on an isolated Postgres database, along with
restricted-role RLS, Portal durability, and process-restart smokes. Preserve
these gates in CI. Operators must still preserve any runtime-only memory
activity and authorize a staged rollout before cutover.

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
| AODA website requirements | Covered organizations and scoped content | Ontario guidance references WCAG 2.0 AA with stated exceptions; UnionOps uses WCAG 2.2 AA as its internal target. Verify applicability and assess before claiming conformance. |
| Union governance | RBAC | Separation of duties, audit trail |
| Records retention | All hosted records | Approved schedule by record class, customer, and applicable law; legal-hold workflow is not yet implemented |
