# Local setup

UnionOps — stewarded by Ryan Morris. Source-available; see [`LICENSE`](../../LICENSE).

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
npm run build && npm start
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

4. Flip backends per module (`GRIEVANCE_DB_BACKEND=postgres`, etc.).

Live checks (require a running DB + app role credentials on `DATABASE_URL`):

```bash
npm run db:rls-smoke          # cross-union SELECT returns 0 under RLS
GRIEVANCE_DB_BACKEND=postgres npm run db:durability-smoke
```

Compose creates `unionops_app` via `docker/db-init/` + migration `0008_app_role.sql`. Set `POSTGRES_APP_PASSWORD` (or reuse `POSTGRES_PASSWORD` for demos). Migrations run as the owner via `MIGRATE_DATABASE_URL` in `docker/entrypoint.sh`.

## Attachment storage & ClamAV (optional — FEAT-001)

Default stores attachment/document bytes on local disk (`ATTACHMENT_STORAGE=local`, `ATTACHMENT_LOCAL_DIR=.data/attachments`). Encrypt that volume at the host level.

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

Credentials also accept `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`. PutObject uses SSE-S3 AES256 by default; CMEK is not wired yet.

### Virus scanner

```bash
ATTACHMENT_SCANNER_URL=http://127.0.0.1:8080
# Optional: allow uploads when the scanner is down (dev only)
# ATTACHMENT_SCAN_ALLOW_SKIP_ON_ERROR=true
```

Contract: `POST ${ATTACHMENT_SCANNER_URL}/scan` with raw file bytes and `Content-Type: application/octet-stream`. Response: JSON `{ "ok": true, "infected": false }` or plain text `stream: OK` / `… FOUND`. Compose has an optional `clamav` profile (`docker compose -f docker/docker-compose.yml --profile clamav up`) that starts the official ClamAV daemon only — put a REST proxy in front for the HTTP contract above. Default demo compose does not require ClamAV.

## Tests

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run test:smoke   # Playwright; needs browsers installed once
```

## Demo Officer Hub (development only)

Demo accounts (password `demo123`) exist for local CI and workshops. They are documented in the README.

**Public launch toggle:** set `NEXT_PUBLIC_OFFICER_HUB_PUBLIC=true` in `.env.local` (or leave Docker’s soft-launch default) to show the Officer Hub header CTA and hub-forward marketing copy. When unset/false, the public site stays Comms-focused; `/app` remains reachable for demos and CI.

**Demo site banner:** set `NEXT_PUBLIC_DEMO_SITE=true` so authenticated `/app` pages show a persistent Demo notice (sample data only — not live production). Turn it off on real tenant hosts.

**Do not** use demo passwords for real member casework on a public host.

**MFA (opt-in):** unset / `AUTH_MFA_ENABLED=false` (default) — password login unlocks the Hub; second factor is not required. Prefer this for local dev and demo hosts. Set `AUTH_MFA_ENABLED=true` for real casework. When enabled, non-production defaults to `AUTH_MFA_MODE=shared_code_insecure` with `AUTH_DEV_MFA_CODE` (default `000000`). Production with MFA enabled requires `AUTH_MFA_MODE=totp`; `shared_code_insecure` needs `AUTH_ALLOW_SHARED_MFA_IN_PROD=true` (workshop break-glass only). MFA success issues a short-lived server grant; the client cannot set `mfaVerified` via `session.update()` alone.

**TOTP enrollment (`AUTH_MFA_ENABLED=true` + `AUTH_MFA_MODE=totp`):** signed-in users without a secret are redirected to `/app/mfa/setup` before other Hub routes. The page calls `POST /api/mfa/enroll` to generate a fresh base32 secret + `otpauth://` URI, renders it as a QR code (scannable by Google Authenticator, Authy, 1Password, etc.) with a manual-entry fallback, then `POST /api/mfa/enroll/confirm` verifies one live code before persisting the secret. Nothing is persisted until confirmation succeeds, so a half-finished enrollment never locks an account out. Persistence depends on the users backend:
- **Demo roster (default):** confirmed secrets are held in an in-memory, process-scoped override (`src/lib/auth/mfa-enrollment-store.ts`) — separate from the seeded `DEMO_USERS` array — and reset on restart, same as other memory-only stores.
- **`AUTH_USERS_BACKEND=postgres`:** confirmed secrets are written to `users.totp_secret` / `users.mfa_enabled` (`src/lib/auth/mfa-user-secret.ts`), and survive restarts.

Once enrolled, `/app/mfa` verifies exactly as it does for shared-code mode — enter the 6-digit code from the app to receive the short-lived server grant.

## Transactional email (optional)

Officer invites, meeting self-reminders, and opt-in RSVP confirmations use SMTP via `nodemailer` (`src/lib/email/send.ts`). This is **transactional only** — no marketing campaigns (ADR-016).

1. Set `EMAIL_ENABLED=true` plus `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `EMAIL_FROM` in `.env.local` (see [`.env.example`](../../.env.example)).
2. Set `NEXT_PUBLIC_EMAIL_ENABLED=true` so Hub **Invites** shows the Send email control (Next.js inlines `NEXT_PUBLIC_*` at build time).
3. With `EMAIL_ENABLED` unset/false, send helpers return `{ ok: false, reason: "not_configured" }` and APIs respond 503 — copy links still work.

## Project docs

- Vision: [`docs/VISION.md`](../VISION.md)
- Architecture: [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md)
- Compliance: [`docs/COMPLIANCE.md`](../COMPLIANCE.md)
- Deploy: [`DEPLOY.md`](DEPLOY.md)
