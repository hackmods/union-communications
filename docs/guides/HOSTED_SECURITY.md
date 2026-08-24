# Hosted security practices

Operator and steward reference for **UnionOps security on a hosted instance** (CapRover, Docker, self-host). Public summary: [`/security`](https://unionops.org/en/security/). Vulnerability reporting: [`SECURITY.md`](../../SECURITY.md).

**Related:** [`COMPLIANCE.md`](../COMPLIANCE.md) · [`DEPLOY.md`](DEPLOY.md) · [`CAPROVER_POSTGRES.md`](CAPROVER_POSTGRES.md) · [`POSTGRES_OPS.md`](POSTGRES_OPS.md) · Portal audit [`portal-encryption-security-audit-2026-08-24.md`](../audit/portal-encryption-security-audit-2026-08-24.md)

---

## Three surfaces

| Surface | Route | Data location | Security model |
|---------|-------|---------------|------------------|
| **Public Comms** | `/tools/*`, guides | Browser only | No server persistence; no analytics (ADR-006) |
| **Officer Hub** | `/app/*` | Server (memory or Postgres) | Auth.js, RBAC, optional MFA, RLS when Postgres |
| **Local Portal** | `/portal/*` | Server memory today (`portalStore`) | Auth.js + circle membership; **no MFA by design** (ADR-017) |

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
| Portal Circles content | TLS | **Plaintext in process memory** — no `PORTAL_DB_BACKEND` | Lost on restart; durable adapter not shipped |
| Site feedback | TLS | Postgres or memory per `FEEDBACK_DB_BACKEND` | Prefer Postgres for production |

**Do not claim** “Portal member data is encrypted at rest.” **Do claim** “Sign-in and API traffic use HTTPS; Comms stay on-device.”

---

## Transit controls (all hosts)

Configured in [`next.config.ts`](../../next.config.ts) (SEC-008):

- **TLS** — operator terminates HTTPS; set `AUTH_URL` to the public browser host (never the internal CapRover FQDN).
- **CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy** — on every response.
- **Portal APIs** — `Cache-Control: private, no-store` via [`portalJson`](../../src/lib/portal/portal-json.ts).
- **Sensitive Hub downloads** — `private, no-store` on attachment/document routes.

Auth.js uses **JWT session cookies** ([`auth.config.ts`](../../src/auth.config.ts)). Production HTTPS enables Secure cookies by default.

---

## Officer Hub — access control

- **Server-side enforcement** on every confidential API route (`require*Session()` or `auth()` + role checks). UI hiding is secondary.
- **No cross-union reads** — ever ([`RBAC.md`](../RBAC.md)).
- **MFA** — opt-in via `AUTH_MFA_ENABLED`; TOTP preferred in production. Grievance/bumping expect MFA when enabled.
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
4. **MFA** — `AUTH_MFA_ENABLED=true`, `AUTH_MFA_MODE=totp` for confidential Hub modules.
5. **Canadian hosting** — preferred for labour records (PIPEDA/FIPPA posture in [`COMPLIANCE.md`](../COMPLIANCE.md)).
6. **Attachments** — persistent volume for `ATTACHMENT_LOCAL_DIR` or S3 with scanning enabled.
7. **Health** — after deploy: `curl -sL https://<host>/api/health/` → expect `postgresFlipComplete: true`, `demoAuthEnabled: false` when hardened.
8. **Breach playbook** — detect, contain, assess within 24h, notify within 72h (PIPEDA). See COMPLIANCE § Breach Response.

**Local Portal durable storage** — not shipped (`PORTAL-DB-001`). Until Postgres adapter lands, treat Portal as **evaluation-only** for real member collaboration.

---

## Logging and third parties

- **No third-party analytics or tracking** (ADR-006).
- **No raw IP** in site feedback — hashed for rate limit only (ADR-018).
- Portal API routes do not log PII; Hub audit log stores action metadata for elevated officers.

---

## Hybrid export (residual risk)

`GET /api/hybrid/slice` returns plaintext JSON over an authenticated TLS session. The officer encrypts with a **browser-only passphrase** afterward. Do not log response bodies. See COMPLIANCE § Hybrid export residual risk.

---

## Reporting vulnerabilities

Email the steward via [Support](https://unionops.org/en/support/) or open a **private** GitHub security advisory. Do not file public issues for auth bypass or data exposure. See [`SECURITY.md`](../../SECURITY.md).
