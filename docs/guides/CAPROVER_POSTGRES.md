# CapRover + Postgres — durable deploy walkthrough

UnionOps ships Drizzle migrations **inside the production Docker image**. On each deploy, [`docker/entrypoint.sh`](../../docker/entrypoint.sh) runs pending migrations when `MIGRATE_DATABASE_URL` is set, then syncs the `unionops_app` password when `POSTGRES_APP_PASSWORD` is set.

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
| **Deploy method** | **Prefer** pull `ghcr.io/hackmods/union-communications:main` (avoids BuildKit `unknown parent` on small hosts). Git push / webhook rebuilds on-droplet — see [session-knowledge-2026-08-25-caprover-buildkit.md](../audit/session-knowledge-2026-08-25-caprover-buildkit.md). |

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
[entrypoint] running drizzle-kit migrate (owner/migrate URL)
[entrypoint] migrate finished
[entrypoint] syncing unionops_app password
[sync-app-role] unionops_app password synced from POSTGRES_APP_PASSWORD
```

If migrate fails, the container **refuses to start** unless `MIGRATE_CONTINUE_ON_ERROR=true` (debug only).

**Droplet check** (optional — if App Logs are noisy):

```bash
export MIGRATE_DATABASE_URL='postgres://postgres:OWNER_PASSWORD@srv-captain--postgres-unionops:5432/unionops'
bash scripts/caprover-verify-migrate.sh
```

Expect `drizzle_table=1`, `migration_rows>0`, `app_role=1`.

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

AUTH_ALLOW_DEMO_USERS=false
AUTH_MFA_ENABLED=true
AUTH_MFA_MODE=totp
```

**Build args** (rebuild image — not runtime env):

**Option A — pull hardened image from GHCR (recommended):**

```text
ghcr.io/hackmods/union-communications:production
```

CI publishes `:production` on every `main` push with demo UI off. Keep `:main` for workshop hosts.

**Option B — git deploy build args** in CapRover App Configs:

```env
NEXT_PUBLIC_DEMO_SITE=false
NEXT_PUBLIC_OFFICER_HUB_PUBLIC=true
```

Save and **redeploy**.

### Step E — Optional production extras

| Variable | Purpose |
|----------|---------|
| `EMAIL_ENABLED` + `SMTP_*` | Invites, password reset, meeting reminders |
| `CRON_SECRET` | `/api/cron/meeting-reminders` |
| `ATTACHMENT_LOCAL_DIR=/app/data/attachments` | Persist uploaded files (mount a volume) |

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
2. Entrypoint applies **pending migrations** automatically.
3. No repo checkout required for schema upgrades.
4. Run `db:seed` again only when release notes say so (rare — usually migrate-only).

---

## 6. Soft launch variant

Invite local presidents before advertising Officer Hub nationally:

1. Postgres + `AUTH_USERS_BACKEND=postgres` + both database URLs
2. `NEXT_PUBLIC_OFFICER_HUB_PUBLIC=false` at **build** time
3. Flip remaining `*_DB_BACKEND=postgres` before real grievance/time data
4. See [`session-knowledge-2026-08-19-president-soft-launch.md`](../audit/session-knowledge-2026-08-19-president-soft-launch.md)

---

## 7. Rollback

Set all `*_DB_BACKEND=memory` and restart — Postgres data is **not read** until flags flip back. Export hybrid backups from `/app/hybrid` before risky migrations.

---

## 8. Troubleshooting

| Symptom | Fix |
|---------|-----|
| Build fails `unknown parent image ID` on `COPY --from=…` | CapRover droplet BuildKit/disk issue — **prefer GHCR pull deploy** (`ghcr.io/hackmods/union-communications:main`) via CapRover **Method 3: Deploy via ImageName**, or set GitHub secrets `CAPROVER_SERVER`, `CAPROVER_PASSWORD`, `CAPROVER_APP` so CI deploys the pre-built image. On the host: `df -h`, `docker builder prune -af`, ensure no cron runs `docker system prune` during builds. |
| CapRover NGINX **502** | Web app Container HTTP Port = **3000** |
| Redirects to `*.captain…` / wrong cookies | `AUTH_URL=https://unionops.org` (browser-facing HTTPS, no trailing slash) |
| `migrate failed — refusing to start` | Check owner URL, network reachability to `srv-captain--…`, Postgres logs; use `MIGRATE_CONTINUE_ON_ERROR=true` only to debug |
| `migrations folder missing` | Old image — redeploy a build that includes the migrate stage ([`docker/Dockerfile`](../../docker/Dockerfile)) |
| `unionops_app` auth / RLS errors | Runtime `DATABASE_URL` must use `unionops_app`, not `postgres` owner |
| Password connection errors | URL-encode special characters in connection strings |
| Demo login still advertised | Rebuild with `NEXT_PUBLIC_DEMO_SITE=false` **and** set `AUTH_ALLOW_DEMO_USERS=false` |
| Health shows memory backends | Missing `*_DB_BACKEND=postgres` env vars on web app |

---

## Related

- [`POSTGRES_OPS.md`](POSTGRES_OPS.md) — module flag table, RLS smokes, seed-admin
- [`DEPLOY.md`](DEPLOY.md) — GHCR tags, MFA, SMTP, health check
- [`SETUP.md`](SETUP.md) — local dev Postgres
- [`docker/docker-compose.durable.yml`](../../docker/docker-compose.durable.yml) — compose equivalent of the env flip
