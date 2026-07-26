# Postgres durability — operator runbook

UnionOps ships Drizzle adapters behind `*_DB_BACKEND` flags (default **memory**). This guide is for hosts who want durable grievance, bumping, time, RSVP, and auth data.

## Prerequisites

- PostgreSQL 16+ (see `docker/docker-compose.yml` for a reference stack)
- Unique `AUTH_SECRET` and `POSTGRES_PASSWORD` (never commit)
- Migrations applied via `MIGRATE_DATABASE_URL` (table owner) on container boot or `npm run db:migrate`

## Flip checklist

1. **Provision Postgres** with a named volume. Compose example: `cd docker && docker compose up -d db`.
2. **Set owner + app URLs:**
   - `MIGRATE_DATABASE_URL` — owner role (DDL + migrations)
   - `DATABASE_URL` — `unionops_app` when `POSTGRES_APP_PASSWORD` is set (RLS binds at runtime)
3. **Run migrations + seed once:** `npm run db:migrate` then `npm run db:seed` (or rely on `docker/entrypoint.sh` migrate on boot).
4. **Flip module flags** (start with one module, verify, then expand):

| Variable | Values | Module |
|----------|--------|--------|
| `GRIEVANCE_DB_BACKEND` | `memory` \| `postgres` | Grievances |
| `BUMPING_DB_BACKEND` | `memory` \| `postgres` | Stability Committee |
| `TIME_DB_BACKEND` | `memory` \| `postgres` | Workforce time |
| `ATTACHMENTS_DB_BACKEND` | `memory` \| `postgres` | Attachment metadata |
| `AUDIT_DB_BACKEND` | `memory` \| `postgres` | Audit log |
| `AUTH_USERS_BACKEND` | `memory` \| `postgres` | Users + password-reset tokens |
| `MEETINGS_RSVP_DB_BACKEND` | `memory` \| `postgres` | Hub events / RSVP |

5. **Verify health:** `GET /api/health` returns `backends` map and `commit` sha.
6. **Run smoke:** `npm run db:rls-smoke` and `npm run db:durability-smoke` from the repo.
7. **Optional attachment scanner:** enable compose `clamav` profile and set `ATTACHMENT_SCANNER_URL` (see `DEPLOY.md`).

## What stays memory-only

Demo compose defaults keep memory adapters so a fresh `docker compose up` works without seed. Production casework hosts should flip **all** confidential modules together once verified.

## Rollback

Set `*_DB_BACKEND=memory` and restart — **data in Postgres is not read** until flags flip back. Export hybrid backups (`/app/hybrid`) before risky migrations.

## Related

- [`DEPLOY.md`](DEPLOY.md) — production checklist, SMTP, MFA
- [`SETUP.md`](SETUP.md) — local dev, sandbox smoke, cron dry-run
- [`docs/RBAC.md`](../RBAC.md) — tenancy and RLS expectations
