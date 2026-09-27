# Local setup

UnionOps — stewarded by Ryan Morris. Proprietary; see [`LICENSE`](../../LICENSE). Future source-available track: [`LICENSING.md`](LICENSING.md).

## Requirements

- Node.js **24+** (see `package.json` `engines`)
- npm (lockfile is committed)

## Install

```bash
git clone https://github.com/hackmods/union-communications.git
cd union-communications
npm ci
cp .env.example .env.local
```

Generate a secret for Auth.js:

```bash
openssl rand -base64 32
```

Put the value in `.env.local` as `AUTH_SECRET`. Set `AUTH_URL=http://localhost:3000` for local runs.

## Default brand (self-host / union-agnostic)

First-visit Brand Kit colours and local details come from **host defaults**, not from any one union:

1. Edit [`config/host-brand.json`](../../config/host-brand.json), or copy the OPSEU-oriented example:

   ```bash
   npm run brand:set -- --from=config/host-brand.example.json
   ```

2. Or set colours/local in one command:

   ```bash
   npm run brand:set -- --primary=#CE1126 --secondary=#FFFFFF --local=79 --sub="Hospital Workers"
   ```

3. Or set `NEXT_PUBLIC_BRAND_*` / `NEXT_PUBLIC_DEFAULT_*` in `.env.local` (see [`.env.example`](../../.env.example)). Env wins over the JSON file.

Restart `npm run dev` after changing the JSON file. Browsers that already saved a Brand Kit keep it until reset or import.

Logo Builder (`/tools/logo-builder`) has **Save to Brand Kit** so colours, local number, and logo choice apply across the site chrome and other tools.

## Run

```bash
npm run dev          # http://localhost:3000/en
npm run build && npm start   # standalone server (not `next start`)
```

## Postgres (optional — Phase 6 / SEC-003)

Default Hub modules still use in-memory stores. To use Postgres locally:

1. Start Postgres (`docker compose -f docker/docker-compose.yml up db` or your own instance).
2. Set `DATABASE_URL` (prefer non-owner `unionops_app` so RLS binds) and `MIGRATE_DATABASE_URL` (table owner) in `.env.local` — see [`.env.example`](../../.env.example).
3. Apply migrations and seed the reference tenant:

   ```bash
   npm run db:migrate
   npm run db:seed
   # optional workshop row:
   SEED_DEMO_CASES=true npm run db:seed
   ```

4. Flip backends per module (`GRIEVANCE_DB_BACKEND=postgres`, etc.). UnionOps Data requires `DATA_DB_BACKEND=postgres` before an admin can enable it; configure durable private attachment storage and `ATTACHMENT_SCANNER_URL` before accepting uploads. The UnionOps-operated customer profile additionally requires strict scanning and current operator evidence for storage, backup restore, and alert delivery.

Live checks (require a running DB + app role credentials on `DATABASE_URL`):

```bash
npm run db:rls-smoke          # cross-union SELECT returns 0 under RLS
GRIEVANCE_DB_BACKEND=postgres npm run db:durability-smoke
```

Compose creates `unionops_app` via `docker/db-init/` + migration `0008_app_role.sql`. Set `POSTGRES_APP_PASSWORD` (or reuse `POSTGRES_PASSWORD` for demos). Production images ship migrations under `/app/db-migrate/`; `docker/entrypoint.sh` runs migrate as the owner when `MIGRATE_DATABASE_URL` is set and syncs the app-role password when `POSTGRES_APP_PASSWORD` is set. CapRover hosts without `db-init`: see [`CAPROVER_POSTGRES.md`](CAPROVER_POSTGRES.md).

## Attachment storage & ClamAV

Default stores attachment/document bytes on local disk (`ATTACHMENT_STORAGE=local`, `ATTACHMENT_LOCAL_DIR=.data/attachments`). Encrypt that volume at the host level. Evaluation and self-hosted installs may choose their own policy. The UnionOps-operated customer profile requires an explicit persistent storage path or reviewed S3 configuration, host-level encryption for local storage, a recent storage review, and strict scanning.

### S3-compatible object storage

```bash
ATTACHMENT_STORAGE=s3
ATTACHMENT_S3_BUCKET=unionops-attachments
ATTACHMENT_S3_REGION=us-east-1
ATTACHMENT_S3_ACCESS_KEY_ID=…
ATTACHMENT_S3_SECRET_ACCESS_KEY=…
# MinIO / path-style:
# ATTACHMENT_S3_ENDPOINT=http://127.0.0.1:9000
# ATTACHMENT_S3_FORCE_PATH_STYLE=true
# SSE-S3 (default):
# ATTACHMENT_S3_SSE=AES256
```

Credentials also accept `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`. PutObject uses SSE-S3 AES256 by default; CMEK is not wired yet. Hosted-customer readiness requires an explicit S3 region, SSE-S3 AES256, and `UNIONOPS_ATTACHMENT_STORAGE_APPROVED=true` with `UNIONOPS_ATTACHMENT_STORAGE_REVIEWED_AT` and `UNIONOPS_ATTACHMENT_STORAGE_REVIEWED_BY`. For local volumes, set `ATTACHMENT_LOCAL_DIR` explicitly. The review attests to location, durability, encryption, and lifecycle; the app cannot inspect provider or volume policies.

### Virus scanner

```bash
ATTACHMENT_SCANNER_URL=http://127.0.0.1:8080
# Optional: allow uploads when the scanner is down (dev only)
# ATTACHMENT_SCAN_ALLOW_SKIP_ON_ERROR=true
```

Contract: `POST ${ATTACHMENT_SCANNER_URL}/scan` with raw file bytes and `Content-Type: application/octet-stream`. Response: JSON `{ "ok": true, "infected": false }` or plain text `stream: OK` / `… FOUND`. Compose has an optional `clamav` profile (`docker compose -f docker/docker-compose.yml --profile clamav up`) that starts the official ClamAV daemon only — put a REST proxy in front for the HTTP contract above. Default demo compose does not require ClamAV.

For hosted customers also set `ATTACHMENT_SCAN_MODE=strict`, keep `ATTACHMENT_SCAN_ALLOW_SKIP_ON_ERROR` unset/false, and record a current integration test in `UNIONOPS_ATTACHMENT_SCAN_TESTED_AT` / `UNIONOPS_ATTACHMENT_SCAN_TESTED_BY`. The readiness check accepts operator evidence dated within 90 days; a passing check confirms configuration and attestation fields, not scanner uptime.

## Tests

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run test:smoke   # Playwright; needs browsers installed once
```

## Demo Officer Hub (development only)

Demo accounts (password `demo123`) exist for local CI and workshops. They use the reserved `unionops.test` domain so they cannot collide with a real union or local address. When the demo roster can sign in, Officer login lists every sample account above the form. They are also documented in the README.

**Public launch toggle:** set `NEXT_PUBLIC_OFFICER_HUB_PUBLIC=true` in `.env.local` (or leave Docker’s default) to show the Officer Hub header CTA and hub-forward marketing copy. When unset/false, the public site stays Comms-focused; `/app/login` and `/app/invite/[token]` stay reachable so you can invite local presidents before a national announcement.

**President soft launch (recommended production path before Hub is advertised):**

1. Keep `NEXT_PUBLIC_OFFICER_HUB_PUBLIC=false` and turn the demo roster **off** (`AUTH_ALLOW_DEMO_USERS=false`, `NEXT_PUBLIC_DEMO_SITE=false`, `SEED_DEMO_USERS=false`).
2. Durable auth + tenant rows: `AUTH_USERS_BACKEND=postgres` and `DATABASE_URL` (see [POSTGRES_OPS.md](POSTGRES_OPS.md)). Creating a local then survives restart and can be used on invite foreign keys.
3. Seed `platform_admin` (`npm run db:seed` / `db:seed-admin`). Sign in, open **Invites**, and use **Invite a local president** (local number + email). That creates the local if needed and emails an accept link when SMTP is on.
4. The president accepts, signs in (first time lands on **Union setup**), confirms the local, Brand Kit, and Hall, then invites officers (`local_exec` / `local_steward`) and members (`local_member`). Members land on Local Portal. Later logins go to the dashboard, which still shows **Set up your local** while Hub is unadvertised.
5. Transactional email: `EMAIL_ENABLED=true` + SMTP + `NEXT_PUBLIC_EMAIL_ENABLED=true`. Copy-link still works if SMTP is off.
6. Confidential casework backends (`GRIEVANCE_DB_BACKEND`, and so on) are a separate ops flip. Soft-launch invites work with durable users + tenant tables even while grievance stays in memory — do not use memory grievance for real member casework.

**Demo site banner:** set `NEXT_PUBLIC_DEMO_SITE=true` so authenticated `/app` pages show a persistent Demo notice (sample data only — not live production). Turn it off on real tenant hosts.

**Do not** use demo passwords for real member casework on a public host.

**MFA policy:** Development, evaluation, and self-hosted deployments keep the operator-controlled `AUTH_MFA_ENABLED` switch. When enabled, use `AUTH_MFA_MODE=totp` in production; shared-code mode is for non-production only, except an explicitly configured workshop break-glass host. UnionOps-operated customer deployments must set `UNIONOPS_HOSTED_CUSTOMER_MODE=true`, `NODE_ENV=production`, and `AUTH_MFA_MODE=totp`. That profile requires TOTP for privileged roles and effective delegated capabilities regardless of the general MFA default; basic local members are not forced to enroll unless their account enables MFA. Host readiness blocks the profile unless production TOTP is active. MFA success issues a short-lived server grant; client session updates cannot assert MFA verification.

**TOTP enrollment:** privileged users in hosted customer mode and users under any host's required TOTP policy are routed to `/app/mfa/setup` before protected Hub routes. The page calls `POST /api/mfa/enroll` to generate a fresh base32 secret + `otpauth://` URI, renders it as a QR code with a manual-entry fallback, then `POST /api/mfa/enroll/confirm` verifies one live code before persisting the secret. Persistence depends on the users backend:
- **Demo roster (default):** confirmed secrets are held in an in-memory, process-scoped override (`src/lib/auth/mfa-enrollment-store.ts`) — separate from the seeded `DEMO_USERS` array — and reset on restart, same as other memory-only stores.
- **`AUTH_USERS_BACKEND=postgres`:** confirmed secrets are written to `users.totp_secret` / `users.mfa_enabled` (`src/lib/auth/mfa-user-secret.ts`), and survive restarts. Password-reset tokens also use the durable `password_reset_tokens` table (migration `0024`) instead of the in-memory store.

After successful enrollment, show the one-time recovery codes to the account holder. Only hashes are stored in `mfa_recovery_codes`; replacing codes requires a fresh TOTP challenge and invalidates prior codes. Database durability and RLS still need verification on the target host.

Once enrolled, `/app/mfa` verifies exactly as it does for shared-code mode — enter the 6-digit code from the app to receive the short-lived server grant.

## Transactional email (optional)

Officer invites, meeting self-reminders, and opt-in RSVP confirmations use SMTP via `nodemailer` (`src/lib/email/send.ts`). This is **transactional only** — no marketing campaigns (ADR-016).

1. Set `EMAIL_ENABLED=true` plus `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `EMAIL_FROM` in `.env.local` (see [`.env.example`](../../.env.example)).
2. Set `NEXT_PUBLIC_EMAIL_ENABLED=true` so Hub **Invites** shows the Send email control (Next.js inlines `NEXT_PUBLIC_*` at build time).
3. With `EMAIL_ENABLED` unset/false, send helpers return `{ ok: false, reason: "not_configured" }` and APIs respond 503 — copy links still work.
4. Optional cron officer reminders: set `CRON_SECRET`, then call `GET|POST /api/cron/meeting-reminders?days=7` with `Authorization: Bearer $CRON_SECRET` (or `x-cron-secret`). Sends only to officer roster emails for Hub events starting within N days — never member broadcast lists. Add `?dryRun=1` to preview job count and recipients without sending (no audit log write).
5. Optional post-deploy operator email: set `DEPLOY_NOTIFY_ENABLED=true` and `DEPLOY_NOTIFY_EMAIL=ops@example.ca` (still needs `CRON_SECRET` + transactional email). `GET|POST /api/cron/deploy-notify` sends a host-readiness summary (commit, backends, and configured controls). MFA is advisory on evaluation/self-hosted profiles and blocking when the UnionOps-operated customer profile lacks production TOTP. CI may call this after the health smoke when `CRON_SECRET` is present (non-blocking).
6. Optional beta-access operator ping: set `ACCESS_REQUEST_NOTIFY_EMAIL=ryan@ryanmorris.ca` (or your ops inbox). Public `/join` and `/request-access` always persist; with `DATABASE_URL` they use Postgres unless you explicitly set `ACCESS_REQUEST_DB_BACKEND=memory`. Review submissions under **Site admin → Access requests**.

## Sandbox smoke (Proxmox CT 115)

Package source for overlay deploy: `npm run package:sandbox` → `unionops-src.tar.gz` (see [`DEPLOY.md`](DEPLOY.md) Proxmox section).

Point Playwright at a remote host without starting a local web server:

```bash
npm run test:smoke:sandbox
# or: PLAYWRIGHT_BASE_URL=http://192.168.0.115:3000 npm run test:smoke
```

Install browsers once: `npx playwright install chromium`. Demo login on the sandbox requires `AUTH_ALLOW_DEMO_USERS=true` on the container.

**Health check:** `GET /api/health` returns `{ status, version, commit, backends, postgresConfigured, memoryCaseDataActive, postgresFlipComplete, emailEnabled, cronConfigured, mfaEnabled, demoAuthEnabled, observability }`. `observability` is non-secret sink flags (Sentry / JSONL) — see [`OBSERVABILITY.md`](../modules/OBSERVABILITY.md). Preflight: `npm run health:check` (optional `HEALTH_URL`; `HEALTH_REQUIRE_DURABLE=true` after Postgres flip; used by `test:smoke:sandbox`).

**Content review map:** After deploy, open `/{locale}/build/` (footer: Site build) → Content review map for grouped links to verify pages, tools, guides, and PDF export surfaces. Not indexed.

## Project docs

- Vision: [`docs/VISION.md`](../VISION.md)
- Architecture: [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md)
- Compliance: [`docs/COMPLIANCE.md`](../COMPLIANCE.md)
- Deploy: [`DEPLOY.md`](DEPLOY.md)
- Postgres flip: [`POSTGRES_OPS.md`](POSTGRES_OPS.md)
