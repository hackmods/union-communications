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

**MFA:** non-production defaults to `AUTH_MFA_MODE=shared_code_insecure` and accepts `AUTH_DEV_MFA_CODE` (default `000000`). Production **requires** `AUTH_MFA_MODE` (`totp` preferred, or `shared_code_insecure` with an explicit `AUTH_MFA_CODE`). MFA success issues a short-lived server grant; the client cannot set `mfaVerified` via `session.update()` alone.

## Project docs

- Vision: [`docs/VISION.md`](../VISION.md)
- Architecture: [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md)
- Compliance: [`docs/COMPLIANCE.md`](../COMPLIANCE.md)
- Deploy: [`DEPLOY.md`](DEPLOY.md)
