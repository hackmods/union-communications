# CapRover + Postgres — durable deploy walkthrough

UnionOps ships the Drizzle journal and a generated required-shape contract **inside the production Docker image**. On every deploy, [`docker/entrypoint.sh`](../../docker/entrypoint.sh) runs [`docker/db-deploy.mjs`](../../docker/db-deploy.mjs): validate journal → advisory lock → apply pending migrations with the owner URL → prove the exact image tail → verify tables, columns, role safety, RLS, and policies. Only then may the web process start. The runtime password is synced afterward when `POSTGRES_APP_PASSWORD` is set.

This guide covers a **two-app CapRover setup**: Postgres (official image) + UnionOps web (`captain-definition` → port **3000**).

For generic Postgres ops (module flags, RLS, rollback), see [`POSTGRES_OPS.md`](POSTGRES_OPS.md). For base CapRover env vars, see [`DEPLOY.md`](DEPLOY.md).

---

## Architecture

```text
┌──────────────────────── CapRover host ────────────────────────┐
│                                                                 │
│  ┌─────────────────────┐      internal DNS                    │
│  │ postgres-unionops   │◄──── srv-captain--postgres-unionops   │
│  │ (official PG 16)  │      :5432                             │
│  │ + persistent vol  │                                        │
│  └──────────▲──────────┘                                        │
│             │ MIGRATE_DATABASE_URL (owner)                      │
│             │ DATABASE_URL (unionops_app)                       │
│  ┌──────────┴──────────┐                                        │
│  │ unionops (web)      │──── HTTPS ────► https://unionops.org │
│  │ port 3000           │      AUTH_URL must match public host  │
│  └─────────────────────┘                                        │
└─────────────────────────────────────────────────────────────────┘
```

Apps on the same CapRover server reach Postgres at:

```text
srv-captain--<your-postgres-app-name>:5432
```

Do **not** expose Postgres to the public internet.

---

## 1. Postgres app (CapRover)

1. Create a new app (e.g. `postgres-unionops`) using the **official PostgreSQL** image (16+).
2. Set environment variables on the **Postgres app**:

| Variable | Example |
|----------|---------|
| `POSTGRES_PASSWORD` | Strong random password |
| `POSTGRES_DB` | `unionops` |
| `POSTGRES_USER` | `postgres` (default is fine) |

3. Enable a **persistent volume** for `/var/lib/postgresql/data`.
4. Deploy. Confirm the app is **Running**.
5. Leave HTTP routing **off** — no public port needed.

---

## 2. UnionOps web app — CapRover basics

| Setting | Value |
|---------|-------|
| **Container HTTP Port** | `3000` (not 80 — wrong port causes NGINX 502) |
| **Deploy method** | **Method 3: Use Docker Image** with image `ghcr.io/hackmods/union-communications:main` (avoids BuildKit `unknown parent` and on-droplet next-build OOMs on small hosts). **Do not** leave this on **Method 1: Deploy from GitHub** — even with PR #88 hardening on the **CI `deploy:` job**, the CapRover app-level git webhook fires independently on every push to `main` and runs `docker build` on the droplet, OOM-SIGKILLing at `RUN npm run build`. Switch to Method 3 once and the webhook path is gone. See [session-knowledge-2026-08-25-caprover-buildkit.md](../audit/session-knowledge-2026-08-25-caprover-buildkit.md) and [session-knowledge-2026-09-16-caprover-app-config-drift.md](../audit/session-knowledge-2026-09-16-caprover-app-config-drift.md). |

Paste-ready env template: [`docker/.env.production.example`](../../docker/.env.production.example).

---

## 3. First-time bootstrap (order matters)

### Step A — Generate secrets

```bash
openssl rand -base64 32   # AUTH_SECRET
openssl rand -base64 32   # POSTGRES_APP_PASSWORD (unionops_app runtime role)
```

Use a separate strong password for the Postgres **owner** (`POSTGRES_PASSWORD` on the Postgres app).

**Two roles, two env vars:** `MIGRATE_DATABASE_URL` authenticates as the owner (`postgres` / `POSTGRES_PASSWORD`). `POSTGRES_APP_PASSWORD` is for the limited `unionops_app` role (RLS at runtime). You *may* set them to the same string to reduce secret sprawl; still set both variables — never put the owner role in runtime `DATABASE_URL`.

**URL-encode** passwords in connection strings if they contain `+`, `/`, `@`, etc.

### Step B — First deploy (migrate only)

On the **UnionOps web app**, set minimum env vars and redeploy:

```env
AUTH_SECRET=<unique>
AUTH_URL=https://unionops.org

MIGRATE_DATABASE_URL=postgres://postgres:OWNER_PASSWORD@srv-captain--postgres-unionops:5432/unionops
POSTGRES_APP_PASSWORD=<app-role-password>
```

You can leave `*_DB_BACKEND` unset (memory) for this step — the goal is to confirm **migrate + app-role sync** in container logs:

```text
[entrypoint] running database deploy gate (migrate + verify)
[db-deploy] connecting with owner migration role
[db-deploy] journal schema=drizzle; applying pending migrations
[db-deploy] verified tail=0037_b7p_demo_tenant schema=public tables=60 columns=697 policies=43
[entrypoint] database deploy gate passed
[entrypoint] syncing unionops_app password
[sync-app-role] unionops_app password synced from POSTGRES_APP_PASSWORD
```

If migration, exact-tail proof, or required-shape verification fails, the container **refuses to start**. `MIGRATE_CONTINUE_ON_ERROR=true` is a local/debug escape only and is deliberately ignored when `NODE_ENV=production`. Multiple replicas serialize through the advisory lock (`MIGRATE_LOCK_TIMEOUT_MS`, default 120000).

**Droplet check** (optional — if App Logs are noisy):

```bash
export MIGRATE_DATABASE_URL='postgres://postgres:OWNER_PASSWORD@srv-captain--postgres-unionops:5432/unionops'
bash scripts/caprover-verify-migrate.sh
```

Expect one schema-qualified Drizzle table, `migration_rows>0`, the current tail timestamp/hash, `app_role=1`, all four 0027 task columns, and `obsolete_meta_tables=0`.

### Step C — One-shot seed (reference tenant + platform admin)

Seeding is **not** automatic on boot (would upsert demo users). Run once:

**Option 1 — CapRover host** (repo checkout or tarball on the server):

```bash
export MIGRATE_DATABASE_URL='postgres://postgres:OWNER_PASSWORD@srv-captain--postgres-unionops:5432/unionops'
export SEED_DEMO_USERS=false
export SEED_PLATFORM_ADMIN_PASSWORD='your-secure-admin-password'
bash scripts/caprover-bootstrap-seed.sh
```

**Option 2 — Workstation** via SSH tunnel to Postgres:

```bash
ssh -L 5433:srv-captain--postgres-unionops:5432 user@your-caprover-host
```

```bash
export MIGRATE_DATABASE_URL='postgres://postgres:OWNER_PASSWORD@127.0.0.1:5433/unionops'
export AUTH_USERS_BACKEND=postgres
export SEED_DEMO_USERS=false
export SEED_PLATFORM_ADMIN_PASSWORD='your-secure-admin-password'
npm run db:seed
```

Or bootstrap a specific admin: `npm run db:seed-admin -- --email … --password …` (see [`POSTGRES_OPS.md`](POSTGRES_OPS.md)).

### Step D — Full durable flip

Add to UnionOps App Configs (see [`docker/.env.production.example`](../../docker/.env.production.example)):

```env
DATABASE_URL=postgres://unionops_app:APP_PASSWORD@srv-captain--postgres-unionops:5432/unionops

GRIEVANCE_DB_BACKEND=postgres
BUMPING_DB_BACKEND=postgres
AUDIT_DB_BACKEND=postgres
TIME_DB_BACKEND=postgres
ATTACHMENTS_DB_BACKEND=postgres
DISCUSSIONS_DB_BACKEND=postgres
TASKS_DB_BACKEND=postgres
INFORMAL_LOG_DB_BACKEND=postgres
MINUTES_DB_BACKEND=postgres
LEDGER_DB_BACKEND=postgres
OFFICERS_DB_BACKEND=postgres
TRAVEL_DB_BACKEND=postgres
EXPENSES_DB_BACKEND=postgres
COMMITTEES_DB_BACKEND=postgres
ELECTIONS_DB_BACKEND=postgres
POLLS_DB_BACKEND=postgres
FEEDBACK_DB_BACKEND=postgres
MEETINGS_DB_BACKEND=postgres
MEETINGS_RSVP_DB_BACKEND=postgres
CHECKINS_DB_BACKEND=postgres
AUTH_USERS_BACKEND=postgres
OFFICER_LEARNING_DB_BACKEND=postgres

AUTH_ALLOW_DEMO_USERS=false
AUTH_MFA_ENABLED=true
AUTH_MFA_MODE=totp
```

**Unconsumed build-args warning:** CapRover injects *every* App Config as a Docker `--build-arg`. The Dockerfile only declares bake-time ARGs (`NEXT_PUBLIC_*`, Sentry, commit SHA). Runtime secrets and `*_DB_BACKEND` flags correctly appear as “were not consumed” — that is expected. Do **not** add `ARG DATABASE_URL` / `ARG SMTP_PASS` / etc. to silence the warning; unused ARGs still embed into image layer history.

**Build args** (rebuild image — not runtime env):

**Option A — pull hardened image from GHCR (recommended):**

```text
ghcr.io/hackmods/union-communications:production
```

CI publishes `:production` on every `main` push with demo UI off (`NEXT_PUBLIC_EMAIL_ENABLED=true` baked). Keep `:main` for workshop hosts.

**Option B — git deploy build args** in CapRover App Configs:

```env
NEXT_PUBLIC_DEMO_SITE=false
NEXT_PUBLIC_OFFICER_HUB_PUBLIC=true
NEXT_PUBLIC_EMAIL_ENABLED=true
```

Save and **redeploy**.

### Step E — Optional production extras

| Variable | Purpose |
|----------|---------|
| `EMAIL_ENABLED` + `SMTP_*` | Invites, password reset, meeting reminders |
| `CRON_SECRET` | `/api/cron/meeting-reminders` |
| `ATTACHMENT_LOCAL_DIR=/app/data/attachments` | Persist uploaded files (mount a volume) |

**Demo cleanup purge** (after durable flip, when sample `is_demo` rows must leave a **demo** host):

- **Gate:** set CapRover App Config `SITE_ADMIN_DEMO_PURGE_ENABLED=true` to show `/app/site-admin/demo-cleanup` and enable the preview/purge APIs. Leave unset/`false` on live production — the UI card and Users page link stay hidden, and the APIs return 404.
- UI: `/app/site-admin/demo-cleanup` — typed `DELETE demo` + operator password (only when the gate is on)
- CLI: `MIGRATE_DATABASE_URL=… DATABASE_URL=… npm run db:demo-purge` (`--dry-run` for counts only)
- Requires `MIGRATE_DATABASE_URL` (owner) so RLS cannot leave restrict orphans under demo unions
- **After purge:** demo locals use `ON DELETE SET NULL` on `users.local_id` and cascade `local_memberships`. Check `/app/site-admin/membership-integrity` for orphaned primary locals before reassigning.

---

## 4. Verify

```bash
curl -s https://unionops.org/api/health | jq .
```

Expect:

| Field | Value |
|-------|-------|
| `postgresConfigured` | `true` |
| `postgresFlipComplete` | `true` |
| `memoryCaseDataActive` | `false` |
| `demoAuthEnabled` | `false` |
| `backends.*` | all `"postgres"` |

From a machine with the repo:

```bash
HEALTH_URL=https://unionops.org HEALTH_REQUIRE_DURABLE=true npm run health:check
```

Spot-check Auth URL (must stay on your public host, not CapRover internal FQDN):

```bash
curl -sI https://unionops.org/examples/
```

Log in as platform admin, create an invite at `/app/invites`, **restart the web container**, confirm the invite still exists.

---

## 5. Upgrades (routine deploys)

After the first bootstrap:

1. Deploy a new image tag (CI on `main` or a release tag).
2. The boot gate applies pending journal migrations, proves this image's exact tip, and verifies required shape before serving. Data massage belongs in forward, idempotent Drizzle migrations.
3. No repo checkout required for schema or data upgrades.
4. Run `db:seed` again only when release notes say so (rare — usually migrate-only).
5. Confirm tip + missing CapRover toggles in **Site admin → Host readiness** (`/app/site-admin/host`), or via `GET /api/health` (`databaseDeployment.tailTag`, `backends`, `memoryCaseDataActive`).

### Portal + access-request flip (clears Hub “Memory only”)

When most Hub modules are already `postgres` but the Hub still shows a Memory banner, check Host readiness. Live hosts often still have:

```bash
PORTAL_DB_BACKEND=postgres
ACCESS_REQUEST_DB_BACKEND=postgres
```

Set those in CapRover App Configs, restart or Method-3 redeploy, then confirm:

- `/api/health` → `backends.PORTAL_DB_BACKEND` / `ACCESS_REQUEST_DB_BACKEND` = `"postgres"`
- `memoryCaseDataActive` = `false`
- `postgresFlipComplete` = `true` (with audit + auth users already on postgres)

Leave `DATA_DB_BACKEND=memory` until the UnionOps Data workbench flip is deliberate. Do **not** re-seed for this flip.

Local Portal persistence is separately controlled by `PORTAL_DB_BACKEND`. Keep
it on `memory` only while Circles data that exists solely in the running memory
adapter still needs export. If Portal was never relied on for real Circles on
this host, flipping to `postgres` is the usual path to clear the Hub banner.

---

## 6. Soft launch variant

Invite local presidents before advertising Officer Hub nationally:

1. Postgres + `AUTH_USERS_BACKEND=postgres` + both database URLs
2. `NEXT_PUBLIC_OFFICER_HUB_PUBLIC=false` at **build** time
3. Flip remaining `*_DB_BACKEND=postgres` before real grievance/time data
4. See [`session-knowledge-2026-08-19-president-soft-launch.md`](../audit/session-knowledge-2026-08-19-president-soft-launch.md)

Confirm durable posture on Host readiness after flips. The Portal
durability smoke has passed against an isolated database; it does not migrate
runtime memory contents.

---

## 7. Rollback

Set all `*_DB_BACKEND=memory` and restart — Postgres data is **not read** until flags flip back. Export hybrid backups from `/app/hybrid` before risky migrations.

---

## 8. Troubleshooting

| Symptom | Fix |
|---------|-----|
| Build fails `unknown parent image ID` on `COPY --from=…` | CapRover droplet BuildKit/disk issue — **prefer GHCR pull deploy** (`ghcr.io/hackmods/union-communications:main`) via CapRover **Method 3: Deploy via ImageName**, or set GitHub secrets `CAPROVER_SERVER`, `CAPROVER_PASSWORD`, `CAPROVER_APP` so CI deploys the pre-built image. On the host: `df -h`, `docker builder prune -af`, ensure no cron runs `docker system prune` during builds. |
| Build dies `npm error signal SIGKILL` during `next build` | On-droplet build OOM-killed by the memory cgroup (Next 16 Turbopack, not a code error). Do **not** rebuild on-host — pull the GHCR image instead, or add ~2–4 GB swap first. See [`session-knowledge-2026-09-16-build-oom.md`](../audit/session-knowledge-2026-09-16-build-oom.md). |
| CapRover NGINX **502** | Web app Container HTTP Port = **3000** |
| Redirects to `*.captain…` / wrong cookies | `AUTH_URL=https://unionops.org` (browser-facing HTTPS, no trailing slash) |
| `database deploy gate failed — refusing to start` | Read the preceding `[db-deploy] ERROR`; check owner URL/network, the journal-tail proof, and named missing shape. Production has no continue-on-error override. |
| `ambiguous __drizzle_migrations tables` | Remove the accidental duplicate only after identifying the authoritative ledger and backing up the database. The gate never guesses through `search_path`. |
| `data migration N failed` | Data migrations roll back per-file (`data_version` only advances on success); fix the file, release, redeploy — the runner resumes where it stopped |
| `migrations folder missing` | Old image — redeploy a build that includes the migrate stage ([`docker/Dockerfile`](../../docker/Dockerfile)) |
| `unionops_app` auth / RLS errors | Runtime `DATABASE_URL` must use `unionops_app`, not `postgres` owner |
| Password connection errors | URL-encode special characters in connection strings |
| Demo login still advertised | Rebuild with `NEXT_PUBLIC_DEMO_SITE=false` **and** set `AUTH_ALLOW_DEMO_USERS=false` |
| Health shows memory backends / Hub Memory banner | Open **Site admin → Host readiness** or `/api/health` `backends`. Often `PORTAL_DB_BACKEND` or `ACCESS_REQUEST_DB_BACKEND` still `memory` while grievances/time are already `postgres`. Set the missing keys to `postgres` and restart. |

---

## Related

- [`POSTGRES_OPS.md`](POSTGRES_OPS.md) — module flag table, RLS smokes, seed-admin
- [`DEPLOY.md`](DEPLOY.md) — GHCR tags, MFA, SMTP, health check
- [`SETUP.md`](SETUP.md) — local dev Postgres
- [`docker/docker-compose.durable.yml`](../../docker/docker-compose.durable.yml) — compose equivalent of the env flip
