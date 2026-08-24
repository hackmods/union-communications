# Postgres durability — operator runbook

UnionOps ships Drizzle adapters behind `*_DB_BACKEND` flags (default **memory**). This guide is for hosts who want durable grievance, bumping, time, RSVP, and auth data.

## Prerequisites

- PostgreSQL 16+ (see `docker/docker-compose.yml` for a reference stack)
- Unique `AUTH_SECRET` and `POSTGRES_PASSWORD` (never commit)
- Migrations applied via `MIGRATE_DATABASE_URL` (table owner) on **container boot** (`docker/entrypoint.sh` ships migrations in the production image) or manually via `npm run db:migrate`

## Flip checklist

1. **Provision Postgres** with a named volume. Compose example: `cd docker && docker compose up -d db`.
2. **Set owner + app URLs:**
   - `MIGRATE_DATABASE_URL` — owner role (DDL + migrations)
   - `DATABASE_URL` — `unionops_app` when `POSTGRES_APP_PASSWORD` is set (RLS binds at runtime)
   - **URL-encode passwords** in connection strings (`encodeURIComponent` / `[uri]::EscapeDataString`). A raw `+` or `/` in the password will break migrate/seed.
3. **Run migrations + seed once:** Production Docker images apply migrations on boot when `MIGRATE_DATABASE_URL` is set (and sync `unionops_app` when `POSTGRES_APP_PASSWORD` is set). Run **`npm run db:seed` once** after first migrate — seed is not automatic on boot. CapRover walkthrough: [`CAPROVER_POSTGRES.md`](CAPROVER_POSTGRES.md). Local/manual: `npm run db:migrate` then `npm run db:seed`.

   **One-shot local verify** (db already healthy, `docker/.env` filled):

   ```bash
   npm run ops:verify-durable
   ```

   That runs migrate → seed → `db:durability-smoke` → `db:rls-smoke` without printing secret values.
4. **Flip module flags** (start with one module, verify, then expand):

| Variable | Values | Module |
|----------|--------|--------|
| `GRIEVANCE_DB_BACKEND` | `memory` \| `postgres` | Grievances |
| `BUMPING_DB_BACKEND` | `memory` \| `postgres` | Stability Committee |
| `TIME_DB_BACKEND` | `memory` \| `postgres` | Workforce time |
| `ATTACHMENTS_DB_BACKEND` | `memory` \| `postgres` | Attachment metadata |
| `AUDIT_DB_BACKEND` | `memory` \| `postgres` | Audit log |
| `DISCUSSIONS_DB_BACKEND` | `memory` \| `postgres` | Discussions |
| `TASKS_DB_BACKEND` | `memory` \| `postgres` | Tasks board |
| `INFORMAL_LOG_DB_BACKEND` | `memory` \| `postgres` | Steward quick-log |
| `MINUTES_DB_BACKEND` | `memory` \| `postgres` | Meeting minutes |
| `LEDGER_DB_BACKEND` | `memory` \| `postgres` | Discretionary fund ledger |
| `OFFICERS_DB_BACKEND` | `memory` \| `postgres` | Officer roster |
| `TRAVEL_DB_BACKEND` | `memory` \| `postgres` | Travel authorizations |
| `EXPENSES_DB_BACKEND` | `memory` \| `postgres` | Expense submissions |
| `COMMITTEES_DB_BACKEND` | `memory` \| `postgres` | Internal committees |
| `ELECTIONS_DB_BACKEND` | `memory` \| `postgres` | Nominations / ballots |
| `POLLS_DB_BACKEND` | `memory` \| `postgres` | Pulse polls |
| `MEETINGS_DB_BACKEND` | `memory` \| `postgres` | Local meeting schedule |
| `MEETINGS_RSVP_DB_BACKEND` | `memory` \| `postgres` | Hub events / RSVP |
| `CHECKINS_DB_BACKEND` | `memory` \| `postgres` | Automatic check-ins |
| `AUTH_USERS_BACKEND` | `memory` \| `postgres` | Users + password-reset tokens |
| `FEEDBACK_DB_BACKEND` | `memory` \| `postgres` | Site feedback (ADR-018; no tenant RLS) |

`platform_feedback_submissions` (migration `0033`) is a **platform** table like password-reset tokens: no tenant RLS. `unionops_app` can INSERT/SELECT via default grants; **API RBAC** (`platform_admin`) is the read boundary.

**Tenant rows:** `POST /api/tenant` (`create_local` / `create_collection` / `create_union`) writes `unions` / `locals` / `bargaining_units` when `DATABASE_URL` is set, and the tenant loader hydrates those rows into the in-process overlay on first Hub/Portal request. Soft-launch invites need this so a new local’s `user_invites.local_id` FK survives restart. Overlay remains the fallback when Postgres is off.

**Soft-launch invites** (Hub still unadvertised): `AUTH_USERS_BACKEND=postgres` + `DATABASE_URL` + optional SMTP (`EMAIL_ENABLED` / `NEXT_PUBLIC_EMAIL_ENABLED`). Keep `NEXT_PUBLIC_OFFICER_HUB_PUBLIC=false`. Platform admin invites a president by local number; they set up Hall and invite officers/members. Casework `*_DB_BACKEND=postgres` flips remain optional for that invite path — turn them on before real grievance/time data.

5. **All-at-once Docker flip:** after migrate + seed, use the durable overlay:

```bash
cd docker
cp .env.example .env   # fill AUTH_SECRET, POSTGRES_PASSWORD, POSTGRES_APP_PASSWORD
docker compose -f docker-compose.yml -f docker-compose.durable.yml up -d
```

6. **Verify health:** `GET /api/health` returns `version`, `commit`, `backends` (effective per module), `postgresConfigured`, `memoryCaseDataActive`, and `postgresFlipComplete`. Or run:

```bash
npm run health:check
# Production after flip:
HEALTH_REQUIRE_DURABLE=true npm run health:check
```

7. **Run smoke:** `npm run db:rls-smoke` and `npm run db:durability-smoke` from the repo (durability smoke needs `GRIEVANCE_DB_BACKEND=postgres`).
8. **Bootstrap admins** (no public signup — invite-only Hub):

`npm run db:seed` (when `AUTH_USERS_BACKEND=postgres`) upserts the demo roster (`demo123`, matching the login hint) unless `SEED_DEMO_USERS=false`, and upserts `ryan@ryanmorris.ca` as `platform_admin,union_admin` unless `SEED_PLATFORM_ADMIN=false`. Set `SEED_PLATFORM_ADMIN_PASSWORD` or read a generated password from `SEED_PLATFORM_ADMIN_BOOTSTRAP_FILE`.

Manual override:

```bash
npm run db:seed-admin -- \
  --email president@example.ca \
  --name "Local President" \
  --password 'your-secure-password' \
  --union-id union-opseu \
  --local-id local-243 \
  --roles local_president,union_admin
```

**Demo + durable coexist:** Postgres users win on email collision; seeding demo users resets those emails to `demo123`. For production casework turn off demo auth (`AUTH_ALLOW_DEMO_USERS=false`, `NEXT_PUBLIC_DEMO_SITE=false`, `SEED_DEMO_USERS=false`), then invite stewards at `/app/invites`. When `AUTH_USERS_BACKEND=postgres`, invites persist in `user_invites` and accept creates rows in `users`.

When `EMAIL_ENABLED` + SMTP are configured, login offers **password-reset** and **magic sign-in** email links (`/api/auth/sign-in-email`).

9. **Optional attachment scanner:** enable compose `clamav` profile and set `ATTACHMENT_SCANNER_URL` (see `DEPLOY.md`).

## What stays memory-only

Demo compose defaults keep memory adapters so a fresh `docker compose up` works without seed. Production casework hosts should flip **all** confidential modules together once verified (`postgresFlipComplete: true` on `/api/health`).

## Rollback

Set `*_DB_BACKEND=memory` and restart — **data in Postgres is not read** until flags flip back. Export hybrid backups (`/app/hybrid`) before risky migrations.

## Related

- [`DEPLOY.md`](DEPLOY.md) — production checklist, SMTP, MFA
- [`CAPROVER_POSTGRES.md`](CAPROVER_POSTGRES.md) — CapRover two-app Postgres flip walkthrough
- [`SETUP.md`](SETUP.md) — local dev, sandbox smoke, cron dry-run
- [`docs/RBAC.md`](../RBAC.md) — tenancy and RLS expectations
