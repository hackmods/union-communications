# Hosted security practices

Operator and steward reference for **UnionOps security on a hosted instance** (CapRover, Docker, self-host). Public summary: [`/security`](https://unionops.org/en/security/). Vulnerability reporting: [`SECURITY.md`](../../SECURITY.md).

**Related:** [`COMPLIANCE.md`](../COMPLIANCE.md) · [`DEPLOY.md`](DEPLOY.md) · [`CAPROVER_POSTGRES.md`](CAPROVER_POSTGRES.md) · [`POSTGRES_OPS.md`](POSTGRES_OPS.md) · **Live flip runbook:** [`COMPLIANCE_HARDENING_LIVE.md`](COMPLIANCE_HARDENING_LIVE.md) · Portal audit [`portal-encryption-security-audit-2026-08-24.md`](../audit/portal-encryption-security-audit-2026-08-24.md)

---

## Three surfaces

| Surface | Route | Data location | Security model |
|---------|-------|---------------|------------------|
| **Public Comms** | `/tools/*`, guides | Browser only | No server persistence; no analytics (ADR-006) |
| **Officer Hub** | `/app/*` | Server (memory or Postgres) | Auth.js, RBAC, MFA policy, RLS when Postgres |
| **Local Portal** | `/portal/*` | Server (memory or Postgres adapter) | Auth.js + circle membership and scoped API authorization |

Grievance notes, bumping strategy, and confidential Hub casework **never** appear in Local Portal.

---

## Encryption: claim vs reality

| Data | In transit | At rest (application) | Operator infrastructure |
|------|------------|----------------------|-------------------------|
| Comms exports | N/A (on-device) | N/A | N/A |
| Hub session / JWT | TLS + HttpOnly cookie | Signed token only | — |
| Hub case rows (Postgres) | TLS | **Plaintext in DB** unless operator encrypts disk | LUKS / cloud volume encryption |
| Hub attachments (local FS) | TLS on download | **Not app-encrypted** — host volume | Encrypt `ATTACHMENT_LOCAL_DIR` volume |
| Hub attachments (S3) | TLS | SSE-S3 AES256 on PutObject (default) | CMEK optional |
| Hybrid export download | TLS (`Cache-Control: no-store`) | Plaintext JSON over session; browser encrypts after | Passphrase never sent to server |
| Portal Circles content | TLS | Plaintext in process memory or Postgres, depending on `PORTAL_DB_BACKEND` | Memory mode is lost on restart; use Postgres for durable hosted customer data. Encrypt the database host/volume at infrastructure level. |
| Site feedback | TLS | Postgres or memory per `FEEDBACK_DB_BACKEND` | Prefer Postgres for production |

**Do not claim** “Portal member data is encrypted at rest” unless the deployed database volume or managed database configuration proves it. **Do claim** “Sign-in and API traffic use HTTPS; Comms stay on-device.”

---

## Transit controls (all hosts)

Configured in [`next.config.ts`](../../next.config.ts) (SEC-008) via [`framing-policy.ts`](../../src/lib/security/framing-policy.ts):

- **TLS** — operator terminates HTTPS; set `AUTH_URL` to the public browser host (never the internal CapRover FQDN).
- **CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy** — on every response.
- **Path-scoped framing** — public pages use `X-Frame-Options: SAMEORIGIN` and CSP `frame-ancestors 'self'` so the operator [`/viewport-lab/`](VIEWPORT_LAB.md) can embed them for responsive QA. Officer Hub (`/:locale/app/*`) and Local Portal (`/:locale/portal/*`) stay `DENY` / `frame-ancestors 'none'`. In `next.config.ts`, AUTH routes must be listed **after** the public `/:path*` catch-all (Next.js last-match wins for the same header key).
- **Portal APIs** — `Cache-Control: private, no-store` via [`portalJson`](../../src/lib/portal/portal-json.ts).
- **Sensitive Hub downloads** — `private, no-store` on attachment/document routes.

Auth.js uses **JWT session cookies** ([`auth.config.ts`](../../src/auth.config.ts)). Production HTTPS enables Secure cookies by default.

---

## Officer Hub — access control

- **Server-side enforcement** on every confidential API route (`require*Session()` or `auth()` + role checks). UI hiding is secondary.
- **No cross-union reads** — ever ([`RBAC.md`](../RBAC.md)).
- **MFA** — evaluation and self-hosted installs retain the opt-in `AUTH_MFA_ENABLED` switch. UnionOps-operated customer instances set `UNIONOPS_HOSTED_CUSTOMER_MODE=true` and require production TOTP (`AUTH_MFA_MODE=totp`). The server and Hub UI require enrollment/verification for privileged roles and effective officer/delegated capabilities; basic `local_member` accounts are not forced to enroll unless their account has MFA enabled. Shared-code MFA is not accepted in this profile. Verified enrollment displays ten one-time recovery codes; only hashes are stored for Postgres-backed accounts, and replacing a set requires a fresh TOTP code. Hosted TOTP counters are consumed once in the durable account-scoped replay guard (`0067_mfa_totp_replay_guard.sql`). The Auth.js MFA session handoff stores one hashed, one-use grant per account in migration `0068_mfa_session_grants.sql`. MFA challenges use a per-account 10-attempt/15-minute window in migration `0069_mfa_verification_attempts.sql`; successful attempts count toward this internal control. Enrollment-pending state remains process-memory-backed. The complete route/RLS matrix, deployed grant/attempt-limit verification, and target-host operation remain to be verified before customer launch.
- **Security audit** — the `audit_log` schema records actor, union/local scope, action, resource, timestamp, outcome, and optional server-generated request ID. Migration `0070_audit_outcome_request_correlation.sql` marks preexisting outcomes `unknown` and removes update/delete privileges from `unionops_app`. MFA verification and recovery-code rotation emit correlated outcomes; the broader event matrix and hosted database evidence are still in progress. Durable logging requires `AUDIT_DB_BACKEND=postgres`.
- **High-impact authority changes, member-data publication, and exports** — `/api/site-admin/users/[id]/roles` and `POST /api/site-admin/users/[id]/force-password-reset` require fresh MFA under host policy before changing roles or dispatching a password-reset email. The reset link is sent only to the target account address and never returned in the operator response; if delivery-result evidence fails after dispatch, the operator must check before retrying. The officer/delegation create and revoke routes, and `POST /api/data/imports/[id]/publish` require a fresh MFA challenge before changing authority or publishing accepted member-data rows whenever MFA is enabled. `POST /api/expenses/[id]/export` applies the same challenge to spreadsheet, PDF, and receipt ZIP downloads after tenant authorization; the former GET download path returns 405. `POST /api/travel/[id]/export` challenges after travel authorization and scope checks but before loading advances, claims, or receipt files; XLSX, PDF, and receipt ZIP bytes are withheld if the correlated success audit cannot be confirmed, and its former GET path returns 405. `POST /api/polls/id/[id]/export` checks poll scope before fresh MFA and before reading aggregates or free-text member responses; CSV/XLSX bytes are withheld if its correlated success audit cannot be confirmed, and its former GET path returns 405. `POST /api/meetings/events/[id]/export` checks meeting scope before fresh MFA and before reading attendee names, contact details, or RSVP notes; CSV bytes are withheld if its correlated success audit cannot be confirmed, and its former GET path returns 405. `POST /api/time/export` challenges before loading local report rows for CSV, XLSX, and PDF, records the selected format and row count, and withholds the file if its success audit cannot be confirmed; the former GET download path also returns 405. `POST /api/time/payroll-export` requires a fresh challenge after local profile authorization and before loading approved time rows or sending them to a configured payroll webhook. The UnionOps hosted customer profile fails closed unless production TOTP is configured. Denied, throttled, and successful attempts are outcome-audited with a server request ID; challenge codes, reset tokens, target email addresses, expense contents, receipts, poll answers, attendee details, and time/payroll rows are not audit metadata. Organization, Data Workbench, Expenses, Travel, Polls, meeting RSVP, and Time admin forms identify the pending action and collect the challenge. Expense, Travel, Poll, meeting RSVP, and general Time report files are withheld unless the success audit append is confirmed. Payroll requires a pre-dispatch audit append; if the post-dispatch result audit fails, the response warns that the webhook may already have received the rows and says to check before retrying. Authority and Data publication audit appends still follow their database transaction, so operators must verify durable audit health and investigate resource state before retrying a failed response. Other sensitive actions still need their own step-up decisions and route-coverage review.
- **Postgres RLS** — when `*_DB_BACKEND=postgres`, runtime must use `unionops_app` role. Verify: `npm run db:rls-smoke`.
- **Site Admin account assignment** — `POST /api/site-admin/users/[id]/assign-local` requires fresh MFA under host policy. A correlated authorization audit is required before the membership write; if the result audit fails after the write, the UI blocks blind retry and tells the operator to inspect the account.
- **Site Admin local lifecycle** — `POST /api/site-admin/locals/[id]/archive` and `/restore` require fresh MFA before the target local is read. Each route requires a correlated authorization audit before mutation and records a separate union-scoped result. The operator UI resumes the selected action after challenge and blocks another write if the database result or its audit is uncertain; reload and inspect the local status before retrying. Live Postgres/RLS, TOTP, and durable-audit verification remain required.
- **Tenant provisioning** — `POST /api/site-admin/unions`, `POST /api/site-admin/locals`, the `/api/tenant` `create_union` action, and `POST /api/invites` when `newUnionName` is supplied require fresh MFA whenever host policy enables it. UnionOps-operated customer mode requires durable audit on these paths and durable tenant storage for `/api/tenant` and new-union invites; it also requires production TOTP. Correlated authorization audits must append before writes; provisioning result events omit names, local numbers, invitation details, and MFA codes. The local form, access-request inbox, onboarding wizard, and invite composers resume after challenge and block blind retries when the outcome is uncertain. Existing-union invitations are unchanged. Live Postgres/RLS, TOTP, and durable-audit verification remain required.
- **Union membership policy** — `PATCH /api/site-admin/unions/[id]` requires fresh MFA before union/member-impact reads. A correlated authorization event must append before the union-scoped multiple-local count and policy write; the policy result is audited separately. If the write or result evidence is uncertain, the bilingual Site Admin form blocks another save and directs the operator to reload and verify settings. Live Postgres/RLS, TOTP, and durable-audit verification remain required.
- **Cross-tenant Site Admin audit reads** — `POST /api/site-admin/audit` requires fresh MFA before querying the host-wide operator log. An access-intent event must append before the audit query, and a result event must append before entries are returned. The old GET route returns 405. The operator page resumes through an EN/FR challenge form. Verify owner-DB least privilege, runtime RLS, and durable append behavior on the hosted target.
- **Hub Local Documents Vault** — document downloads use `POST /api/documents/[id]/download` and require fresh MFA under the host policy. The legacy GET URL returns 405. The union/local check and clean-scan requirement run before the challenge; a correlated authorization event must append before the storage read and a delivery event before file bytes are returned. Deletion also requires fresh MFA and correlated intent/result events. Hosted customer mode requires Postgres-backed attachment metadata and audit. The vault UI retries after challenge and requires a reload after uncertain results. This vault is distinct from managed policy documents; verify object storage, Postgres/RLS, TOTP, and audit on the hosted target.
- **Attachment downloads** — grievance, bumping, time-entry, and explicitly shared member Portal downloads check their existing case/time/union/local authorization and scan or share state, then require a correlated durable authorization audit before reading bytes and a delivery audit before returning them. Hosted customer mode requires Postgres-backed attachment metadata and audit; time-entry photos also require Postgres-backed time data. Member-visible file routes do not add a fresh challenge that would force basic members to enroll. Verify object storage, Postgres/RLS, and audit ordering on the hosted target.
- **Attachments** — type/size limits; hosted customer readiness requires explicit local-volume/S3 configuration, approved storage evidence, and strict scanning that fails closed. Readiness checks the scanner URL/mode and a recent operator integration-test attestation, but it does not probe scanner availability or provider storage policies.

Verify effective backends: `GET /api/health` → `backends` map ([`backend.ts`](../../src/lib/db/backend.ts)).

---

## Local Portal — access control

- All `/api/portal/**` routes call [`requirePortalSession()`](../../src/lib/portal/portal-session.ts): signed-in user, `unionId`, module enabled, portal role.
- Circle reads/writes require **circle membership** (`getCircleDetail`).
- Mutations are **circle-scoped** (comment, action complete, pipeline, roll call, soft delete, pin, momentum) — see [`portal-idor.test.ts`](../../src/lib/portal/portal-idor.test.ts).
- **Portal MFA follows the host profile** — UnionOps-operated customer mode requires TOTP for privileged roles/capabilities, active delegations, and Circle administrators at the shared page/API session guard. Basic local members remain exempt unless their account enabled MFA; evaluation and self-hosted policy remains operator-configured. Do not use Circle content for caucus or strategy until tenant isolation, retention, and host controls are verified.
- **Site feedback** from Portal uses `POST /api/feedback` (ADR-018) — separate store, not Circles data.

Full evidence: [`portal-encryption-security-audit-2026-08-24.md`](../audit/portal-encryption-security-audit-2026-08-24.md).

---

## Production operator checklist

Before storing **real** member casework or collaboration:

1. **Secrets** — unique `AUTH_SECRET`; strong Postgres passwords; URL-encode in connection strings.
2. **Disable demo auth** — `AUTH_ALLOW_DEMO_USERS=false`, `NEXT_PUBLIC_DEMO_SITE=false`.
3. **Postgres flip** — set `DATABASE_URL`, `MIGRATE_DATABASE_URL`, and `*_DB_BACKEND=postgres` per [`CAPROVER_POSTGRES.md`](CAPROVER_POSTGRES.md). Run `npm run ops:verify-durable` locally first.
4. **MFA** — for a UnionOps-operated customer instance, set `UNIONOPS_HOSTED_CUSTOMER_MODE=true`, `AUTH_MFA_MODE=totp`, and `AUTH_MFA_ENABLED=true`. Host readiness blocks when production TOTP is unavailable. Self-host operators choose and verify their own MFA policy.
5. **Canadian hosting** — preferred for labour records (PIPEDA/FIPPA posture in [`COMPLIANCE.md`](../COMPLIANCE.md)).
6. **Attachments** — set explicit storage and strict scanning, then record a storage review and scanner integration test dated within the last 90 days.
7. **Backups and alerts** — configure jobs/routes and record an owner plus a restore drill and alert-delivery test dated within the last 90 days. These are operator attestations; the app does not independently verify delivery or restore quality.
8. **Health** — after deploy, verify `postgresFlipComplete: true` and `demoAuthEnabled: false`. Public `GET /api/health/` omits operational evidence; use a bearer `HOST_READINESS_SECRET` request for the private `hostedControlEvidence` booleans. Keep the same secret in GitHub Actions for the post-deploy gate.
9. **Breach playbook** — detect, contain, escalate, assess the applicable legal and contractual duties, and document decisions. Where PIPEDA applies and its threshold is met, report and notify as soon as feasible after determining the breach occurred. Internal response targets are operational goals, not statutory deadlines. See COMPLIANCE § Breach Response.

**Local Portal durable storage** — Postgres adapter and RLS are available behind `PORTAL_DB_BACKEND=postgres`; verify the live backend and RLS/durability smokes before using real member collaboration. Memory mode remains evaluation-only because activity can be lost on restart.

---

## Logging and third parties

### Subprocessor inventory and disclosure

- Keep the provider register at `/app/site-admin/subprocessors` limited to
  services verified in the actual production configuration. Record a reference
  to the configuration/evidence, not API credentials, tokens, or member data.
- A second MFA-verified platform admin must review the record and explicitly
  approve its public fields before publication. Edits clear that approval and
  remove the public projection until it is reviewed again.
- Review the public projection at `/trust/subprocessors` in English and French.
  It is empty until verified provider details are entered and approved. The
  register and this human attestation do not replace DPA/vendor review or legal
  approval; store those decisions in the approved managed-document workflow
  once that foundation is available.
- Registry changes and accesses are written to an append-only database audit
  table under the same platform-admin MFA gate. Confirm migration `0065` and
  the generated DB shape before deploying this code.
- Publishing or withdrawing the public projection also requires a fresh
  action-bound MFA challenge. In `UNIONOPS_HOSTED_CUSTOMER_MODE`, the route
  blocks unless `AUDIT_DB_BACKEND=postgres`; a correlated access event must
  append before the RLS transaction, whose append-only provider event records
  only the public-safe projection. The action result needs a second correlated
  audit append. If its outcome is uncertain, reload the register before
  retrying. This is source behavior until verified on the deployed database.
- Approving or rejecting a provider review also requires a fresh challenge
  before the provider row is read. Approval still requires a different
  platform administrator from the creator/latest editor and an explicit
  disclosure attestation. The client targets `POST /api/site-admin/subprocessors/{id}`;
  review intent, transaction result, and correlated audit must be verified on
  the deployed host. Review uncertainty also requires a register reload.

### Restricted incident records

- UnionOps-operated incidents may be recorded in `/app/site-admin/incidents`;
  this is a platform-operator register, not a tenant feature. It requires
  Postgres-backed accounts/storage and per-user TOTP.
- Every view, create, update, or export requires a fresh TOTP challenge. The
  short-lived action token is single-use and access/action metadata is stored
  append-only. The runtime role cannot delete incident records.
- Do not enter member names, casework facts, secrets, or unnecessary personal
  details. This tool does not decide whether legal, contractual, customer, or
  regulator notifications are required. The Privacy Officer/counsel must
  assess and record the decision.
- The code does not set an approved incident retention period or automatically
  purge expired step-up grant rows. No production incident drill or host RLS
  test has been evidenced yet; keep these as launch blockers. Self-hosted
  operators must maintain and test their own incident procedures and evidence.

- **No third-party analytics or tracking** (ADR-006).
- **No raw IP** in site feedback — hashed for rate limit only (ADR-018).
- Portal API routes do not log PII; Hub audit log stores action metadata for elevated officers.

### Optional operator error sinks (not product analytics)

Independently toggled on CapRover / Docker via env (defaults **off**):

| Variable | Purpose |
|----------|---------|
| `SENTRY_ENABLED` | `true` to enable server/edge Sentry (also needs a DSN) |
| `NEXT_PUBLIC_SENTRY_DSN` | Client DSN — **bake at image build** (Next.js inlines `NEXT_PUBLIC_*`) |
| `SENTRY_DSN` | Optional server/edge DSN override (runtime CapRover OK) |
| `SENTRY_AUTH_TOKEN` | Optional CI/build source maps only — never commit |
| `ERROR_LOG_FILE_ENABLED` | `true` to append server errors as JSONL |
| `ERROR_LOG_FILE_PATH` | Absolute path, e.g. `/data/logs/unionops-errors.jsonl` |
| `ERROR_LOG_FILE_MAX_BYTES` | Rotate active file when larger (default `10485760` = 10 MiB) |
| `ERROR_LOG_FILE_KEEP` | Rotated siblings to keep (`path.1`…`path.N`, default `3`) |

Confirm effective sinks after deploy: `GET /api/health` → `observability` object (`sentryEnabled`, `sentryClientEnabled`, `errorLogFileEnabled`, plus `*Misconfigured` / `sentryClientServerMismatch` flags). `npm run health:check` prints the same summary.

- Browser errors reach Sentry only when `NEXT_PUBLIC_SENTRY_DSN` was present at **build** time; client events use same-origin tunnel `/monitoring` (CSP `connect-src 'self'` stays closed).
- File logging is **Node/server only**. CapRover: attach a **Persistent Directory** (e.g. host `logs` → `/data/logs`) or the file is lost on redeploy — same pattern as `ATTACHMENT_LOCAL_DIR`.
- Do not log grievance bodies, cookies, or auth headers. SDK `beforeSend` strips request cookies/data/headers.
- No Session Replay and no product usage metrics.
- **Source maps (CI):** set GitHub Actions secret `SENTRY_AUTH_TOKEN` (org token with `project:releases` / `org:read`). CI `npm run build` and the Docker production image build upload maps when the secret is present; builds still succeed without it.

---

## Hybrid export (residual risk)

`GET /api/hybrid/slice` returns plaintext JSON over an authenticated TLS session. The officer encrypts with a **browser-only passphrase** afterward. Do not log response bodies. See COMPLIANCE § Hybrid export residual risk.

---

## Reporting vulnerabilities

Email the steward via [Support](https://unionops.org/en/support/) or open a **private** GitHub security advisory. Do not file public issues for auth bypass or data exposure. See [`SECURITY.md`](../../SECURITY.md).
