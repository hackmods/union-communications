# Hosted security practices

Operator and steward reference for **UnionOps security on a hosted instance** (CapRover, Docker, self-host). Public summary: [`/security`](https://unionops.org/en/security/). Vulnerability reporting: [`SECURITY.md`](../../SECURITY.md).

**Related:** [`COMPLIANCE.md`](../COMPLIANCE.md) · [`DEPLOY.md`](DEPLOY.md) · [`CAPROVER_POSTGRES.md`](CAPROVER_POSTGRES.md) · [`POSTGRES_OPS.md`](POSTGRES_OPS.md) · **Live flip runbook:** [`COMPLIANCE_HARDENING_LIVE.md`](COMPLIANCE_HARDENING_LIVE.md) · Portal audit [`portal-encryption-security-audit-2026-08-24.md`](../audit/portal-encryption-security-audit-2026-08-24.md)

---

## Three surfaces

| Surface | Route | Data location | Security model |
|---------|-------|---------------|------------------|
| **Public Comms** | `/tools/*`, guides | Browser only | No server persistence; no analytics (ADR-006) |
| **Officer Hub** | `/app/*` | Server (memory or Postgres) | Auth.js, RBAC, TOTP MFA for privileged capabilities in UnionOps-operated hosted customer mode, RLS when Postgres |
| **Local Portal** | `/portal/*` | Server memory or Postgres adapter | Auth.js + circle membership; **no MFA by design** (ADR-017) |

Grievance notes, bumping strategy, and confidential Hub casework **never** appear in Local Portal.

---

## Encryption: claim vs reality

| Data | In transit | At rest (application) | Operator infrastructure |
|------|------------|----------------------|-------------------------|
| Comms exports | N/A (on-device) | N/A | N/A |
| Hub session / JWT | TLS + HttpOnly cookie | Signed token only | — |
| Hub case rows (Postgres) | TLS | **Plaintext in DB** unless operator encrypts disk | LUKS / cloud volume encryption |
| Hub attachments (local FS) | TLS on download | **Not app-encrypted** — host volume | Encrypt `ATTACHMENT_LOCAL_DIR` volume |
| Hub attachments (S3) | TLS | SSE-S3 AES256 on PutObject (default); optional SSE-KMS via `ATTACHMENT_S3_SSE=aws:kms` + `ATTACHMENT_S3_KMS_KEY_ID` | Signed upload URLs still deferred |
| Hybrid export download | TLS (`Cache-Control: no-store`) | Plaintext JSON over session; browser encrypts after | Passphrase never sent to server |
| Portal Circles content | TLS | Plaintext in process memory or Postgres, depending on `PORTAL_DB_BACKEND` | Memory-backed activity is lost on restart; Postgres-backed records persist subject to operator database and disk protections |
| Site feedback | TLS | Postgres or memory per `FEEDBACK_DB_BACKEND` | Prefer Postgres for production |

**Do not claim** “Portal member data is encrypted at rest.” **Do claim** “Sign-in and API traffic use HTTPS; Comms stay on-device.”

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
- **MFA** — opt-in via `AUTH_MFA_ENABLED`; TOTP preferred when enabled. Casework does **not** require MFA; when MFA is on, grievance/bumping (and other Hub modules) enforce `sessionMfaOk`.
- **Postgres RLS** — when `*_DB_BACKEND=postgres`, runtime must use `unionops_app` role. Verify: `npm run db:rls-smoke`.
- **Attachments** — type/size limits; ClamAV when `ATTACHMENT_SCANNER_URL` is set.

Verify effective backends: `GET /api/health` → `backends` map ([`backend.ts`](../../src/lib/db/backend.ts)).

---

## Local Portal — access control

- All `/api/portal/**` routes call [`requirePortalSession()`](../../src/lib/portal/portal-session.ts): signed-in user, `unionId`, module enabled, portal role.
- Circle reads/writes require **circle membership** (`getCircleDetail`).
- Mutations are **circle-scoped** (comment, action complete, pipeline, roll call, soft delete, pin, momentum) — see [`portal-idor.test.ts`](../../src/lib/portal/portal-idor.test.ts).
- **MFA not required** for Portal (ADR-017) — acceptable for Internal-class collaboration; document risk for caucus/strategy Circles.
- **Site feedback** from Portal uses `POST /api/feedback` (ADR-018) — separate store, not Circles data.

Full evidence: [`portal-encryption-security-audit-2026-08-24.md`](../audit/portal-encryption-security-audit-2026-08-24.md).

---

## Production operator checklist

Before storing **real** member casework or collaboration:

1. **Secrets** — unique `AUTH_SECRET`; strong Postgres passwords; URL-encode in connection strings.
2. **Disable demo auth** — `AUTH_ALLOW_DEMO_USERS=false`, `NEXT_PUBLIC_DEMO_SITE=false`.
3. **Postgres flip** — set `DATABASE_URL`, `MIGRATE_DATABASE_URL`, and `*_DB_BACKEND=postgres` per [`CAPROVER_POSTGRES.md`](CAPROVER_POSTGRES.md). Run `npm run ops:verify-durable` locally first.
4. **MFA** — UnionOps-operated hosted customer deployments require production TOTP for privileged capabilities: `UNIONOPS_HOSTED_CUSTOMER_MODE=true`, `AUTH_MFA_MODE=totp`, `NODE_ENV=production`. Self-host operators remain responsible for selecting and verifying their own access policy. Do not use shared-code MFA for customer casework.
5. **Canadian hosting** — preferred for labour records (PIPEDA/FIPPA posture in [`COMPLIANCE.md`](../COMPLIANCE.md)).
6. **Attachments** — persistent volume for `ATTACHMENT_LOCAL_DIR` or S3 with scanning enabled.
7. **Health** — after deploy: `curl -sL https://<host>/api/health/` → expect `postgresFlipComplete: true`, `demoAuthEnabled: false` when hardened.
8. **Breach playbook** — detect and contain promptly; use 24 hours as the operator's target for an initial assessment, not a statutory deadline. When PIPEDA applies and its threshold is met, report and notify affected individuals as soon as feasible; do not present 72 hours as a PIPEDA deadline. Keep the required breach record for 24 months from determination. See [COMPLIANCE § Breach Response](../COMPLIANCE.md#breach-response-playbook) and the [OPC guidance](https://www.priv.gc.ca/en/privacy-topics/privacy-for-businesses/privacy-breaches-at-your-business/gd_pb_201810/).
9. **Public contacts** — set `UNIONOPS_LEGAL_ENTITY_NAME`, `UNIONOPS_PRIVACY_OFFICER_NAME`, `UNIONOPS_PRIVACY_EMAIL`, `UNIONOPS_PRIVACY_MAILING_ADDRESS`, `UNIONOPS_SECURITY_EMAIL`, and `UNIONOPS_ACCESSIBILITY_EMAIL`. Verify that each address is monitored, then record `UNIONOPS_PUBLIC_CONTACTS_MONITORED_AT` and `UNIONOPS_PUBLIC_CONTACTS_MONITORED_BY`. Hosted customer readiness checks completeness and a review no more than 90 days old; it does not send a test message or independently prove monitoring.

**Local Portal durable storage** — not shipped (`PORTAL-DB-001`). Until Postgres adapter lands, treat Portal as **evaluation-only** for real member collaboration.

---

## Logging and third parties

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
| `OBSERVABILITY_BACKEND` | `postgres` (Docker primary when `DATABASE_URL` set), `file`, or `noop`. Unset auto-picks postgres if `DATABASE_URL` is present |
| `ERROR_LOG_FILE_ENABLED` | Optional file JSONL dual-write / fallback |
| `ERROR_LOG_FILE_PATH` | Absolute path, e.g. `/data/logs/unionops-errors.jsonl` |
| `ERROR_LOG_FILE_MAX_BYTES` | Rotate active file when larger (default `10485760` = 10 MiB) |
| `ERROR_LOG_FILE_KEEP` | Rotated siblings to keep (`path.1`…`path.N`, default `3`) |
| `OBSERVABILITY_BACKEND` | Prefer `postgres` (or unset when `DATABASE_URL` is set) |
| `OBSERVABILITY_ALERTS_ENABLED` | Master switch for crisis email cron (`true` to enable) |
| `OBSERVABILITY_ALERT_EMAIL` | Optional default recipient when creating a rule without explicit emails |
| `OBSERVABILITY_AUTO_ACK_ON_DEPLOY` | After successful deploy-notify, ack fingerprints from prior builds |
| `OBSERVABILITY_ALERT_RULES_PATH` | File-host rules JSON (defaults beside `ERROR_LOG_FILE_PATH`) |

Confirm effective sinks after deploy: `GET /api/health` → `observability` object (`backend`, `storeEnabled`, `fileDualWrite`, Sentry/file flags). `npm run health:check` prints the same summary.

- **Docker preferred:** Postgres via existing `DATABASE_URL` + migrations `0082`–`0084`. Site Admin → Observability for MFA-gated issues/export/acks/alert rules (optional per-union routing). Cron: `POST /api/cron/observability-alerts` with `CRON_SECRET` when `OBSERVABILITY_ALERTS_ENABLED=true`. Deploy-notify may auto-ack when `OBSERVABILITY_AUTO_ACK_ON_DEPLOY=true`.
- Browser errors reach Sentry only when `NEXT_PUBLIC_SENTRY_DSN` was present at **build** time; without Sentry, client boundaries + global handlers POST to `/api/observability/client-errors`.
- File logging is **Node/server only**. CapRover: attach a **Persistent Directory** (e.g. host `logs` → `/data/logs`) or the file is lost on redeploy — same pattern as `ATTACHMENT_LOCAL_DIR`. Prefer Postgres so redeploys keep history.
- Do not log grievance bodies, cookies, or auth headers. SDK `beforeSend` strips request cookies/data/headers; server redaction also strips bearer/JWT/email patterns.
- No Session Replay and no product usage metrics.
- **Source maps (CI):** set GitHub Actions secret `SENTRY_AUTH_TOKEN` (org token with `project:releases` / `org:read`). CI `npm run build` and the Docker production image build upload maps when the secret is present; builds still succeed without it.

---

## Hybrid export (residual risk)

`GET /api/hybrid/slice` returns plaintext JSON over an authenticated TLS session. The officer encrypts with a **browser-only passphrase** afterward. Do not log response bodies. See COMPLIANCE § Hybrid export residual risk.

---

## Reporting vulnerabilities

Email the steward via [Support](https://unionops.org/en/support/) or open a **private** GitHub security advisory. Do not file public issues for auth bypass or data exposure. See [`SECURITY.md`](../../SECURITY.md).
