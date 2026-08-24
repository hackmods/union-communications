# Compliance hardening — live deployment plan

**Use this in a new agent or operator session** to raise https://unionops.org from evaluation posture to production-ready **Officer Hub** compliance.

**Goal:** Durable Postgres + MFA + no demo auth on prod. **Local Portal stays evaluation-only** until `PORTAL-DB-001` (no `PORTAL_DB_BACKEND` today).

**References:** [CAPROVER_POSTGRES.md](CAPROVER_POSTGRES.md) · [POSTGRES_OPS.md](POSTGRES_OPS.md) · [HOSTED_SECURITY.md](HOSTED_SECURITY.md) · [portal-encryption-security-audit-2026-08-24.md](../audit/portal-encryption-security-audit-2026-08-24.md)

**Already shipped (code):** Portal IDOR fixes, `Cache-Control: private, no-store` on Portal APIs, public `/security`, operator security guide.

---

## Phase 0 — Baseline (5 min)

```powershell
curl.exe -sL https://unionops.org/api/health/
```

Save JSON. **Expected before flip:**

- `postgresConfigured: false`
- `memoryCaseDataActive: true`
- `demoAuthEnabled: true`
- All `backends.*: "memory"`

---

## Phase 1 — Postgres on CapRover

Follow [CAPROVER_POSTGRES.md](CAPROVER_POSTGRES.md) Steps A–D.

### Checklist

- [ ] Postgres app running (e.g. `postgres-unionops`), PG 16+, persistent volume, no public HTTP
- [ ] Internal DNS: `srv-captain--postgres-unionops:5432`
- [ ] Secrets generated (`openssl rand -base64 32` for `AUTH_SECRET`, `POSTGRES_APP_PASSWORD`)
- [ ] Passwords URL-encoded in connection strings if needed

### Migrate-only first deploy

On **UnionOps web app** env:

```env
AUTH_SECRET=<unique>
AUTH_URL=https://unionops.org
MIGRATE_DATABASE_URL=postgres://postgres:OWNER_PASSWORD@srv-captain--postgres-unionops:5432/unionops
POSTGRES_APP_PASSWORD=<app-role-password>
```

Leave `*_DB_BACKEND` unset. Redeploy. Confirm logs: `migrate finished`, `unionops_app password synced`.

### Seed once

```bash
export MIGRATE_DATABASE_URL='postgres://postgres:OWNER_PASSWORD@srv-captain--postgres-unionops:5432/unionops'
export SEED_DEMO_USERS=false
export SEED_PLATFORM_ADMIN_PASSWORD='<secure-admin-password>'
bash scripts/caprover-bootstrap-seed.sh
```

---

## Phase 2 — Full durable flip

Paste from [`docker/.env.production.example`](../../docker/.env.production.example) into CapRover UnionOps web App Configs.

### Required env

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

### Build args (rebuild image)

```env
NEXT_PUBLIC_DEMO_SITE=false
NEXT_PUBLIC_OFFICER_HUB_PUBLIC=true
```

### Recommended extras

| Variable | Purpose |
|----------|---------|
| `ATTACHMENT_LOCAL_DIR=/app/data/attachments` + volume | Persist uploads |
| `ATTACHMENT_SCANNER_URL` | ClamAV / scan endpoint |
| `ATTACHMENT_SCAN_MODE=strict` | Fail closed on scan failure |
| `FEEDBACK_REQUIRE_DURABLE=true` | No silent feedback loss |
| `CRON_SECRET`, `EMAIL_ENABLED`, `SMTP_*` | Invites / reminders |

Redeploy web app.

**Portal note:** There is no `PORTAL_DB_BACKEND`. Circles data remains **memory-only** after Hub flip. Keep Portal memory banner; do not claim Portal posts survive restart.

---

## Phase 3 — Verify (gate before “production-ready”)

### 3A. Health

```powershell
curl.exe -sL https://unionops.org/api/health/
```

| Field | Pass |
|-------|------|
| `postgresConfigured` | `true` |
| `postgresFlipComplete` | `true` |
| `memoryCaseDataActive` | `false` |
| `demoAuthEnabled` | `false` |
| `mfaEnabled` | `true` |
| `backends.*` | `"postgres"` |

### 3B. Automated (repo checkout, DB reachable)

```bash
npm run ops:verify-durable
```

### 3C. Manual

- [ ] Admin login works (not `demo123` / `unionops.test`)
- [ ] Create grievance → restart web container → row persists
- [ ] MFA enroll; confidential module requires TOTP
- [ ] `/en/security/` and `/en/privacy/` match host reality

### 3D. Tests (optional)

```bash
npm run test:unit -- src/lib/portal/portal-idor.test.ts src/lib/auth/api-route-auth.test.ts
npx playwright install
PLAYWRIGHT_BASE_URL=https://unionops.org npx playwright test e2e/portal.smoke.spec.ts --grep "unauthenticated"
```

---

## Phase 4 — Compliance evidence

Check off ([HOSTED_SECURITY.md](HOSTED_SECURITY.md)):

- [ ] Before/after `/api/health` JSON saved
- [ ] `db:rls-smoke` pass (via `ops:verify-durable` or logs)
- [ ] Demo auth off on prod
- [ ] Canadian hosting noted (operator)
- [ ] Postgres volume encryption noted (LUKS / cloud)
- [ ] Breach playbook owner named
- [ ] Portal: honest — **not** encrypted at rest; evaluation until `PORTAL-DB-001`

Optional: append post-flip health snapshot to [portal-encryption-security-audit-2026-08-24.md](../audit/portal-encryption-security-audit-2026-08-24.md).

---

## Phase 5 — Engineering backlog (later sessions)

**Do not block Hub go-live.**

| Priority | Ticket | Work |
|----------|--------|------|
| P0 | `PORTAL-DB-001` | `PORTAL_DB_BACKEND` + Drizzle + RLS adapter |
| P1 | `PORTAL-AUDIT-001` | Full Portal write audit trail |
| P1 | — | Member export/erase for Circles (PIPEDA access rights) |
| P1 | `PORTAL-BINDER-001` | Object storage + scan for Binder files |
| P2 | — | `no-store` on remaining Hub JSON APIs |
| P2 | — | Zod on Portal POST bodies; `assigneeId` roster validation |

---

## Portal decision

| Hub flip done? | PORTAL-DB-001 done? | Verdict |
|----------------|----------------------|---------|
| No | — | Finish Phases 1–3 first |
| Yes | No | Portal **evaluation only** — memory banner stays |
| Yes | Yes | OK for real member collaboration |

---

## New session kickoff (paste to agent)

```text
Execute docs/guides/COMPLIANCE_HARDENING_LIVE.md for unionops.org:
Phase 0 health baseline → Phase 1 CapRover Postgres → Phase 2 full flip
(demo off, MFA on, all *_DB_BACKEND=postgres) → Phase 3 verify.
Do NOT claim Portal encrypted at rest; PORTAL-DB-001 is deferred.
Refs: CAPROVER_POSTGRES.md, HOSTED_SECURITY.md, portal-encryption-security-audit-2026-08-24.md
```

---

## Success criteria

**Officer Hub:** Health shows durable Postgres, demo off, MFA on; grievance survives restart; RLS smoke passes.

**Local Portal:** Still memory-only — public `/security` already states this honestly.

**Compliance:** Operator can show health JSON + RLS verification + audit doc + `/security` page.
