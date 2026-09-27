# Compliance hardening — live deployment plan

**Use this in a new operator session** to raise https://unionops.org from evaluation posture to a verified production configuration. Completing this runbook alone does not satisfy the full customer launch gate.

**Goal:** Verify durable Postgres, required hosted privileged MFA, and no demo auth on the target production host. A Portal Postgres/RLS adapter exists, but the Portal stays evaluation-only until its host configuration, access controls, retention, and the full sensitive-customer launch gate are evidenced.

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

Leave `*_DB_BACKEND` unset. Redeploy. Confirm logs: `database deploy gate passed` after a `[db-deploy] verified tail=...` line, then `unionops_app password synced`.

If the image predates the `sync-app-role` ESM fix, omit `POSTGRES_APP_PASSWORD` for the first migrate boot (migrate still runs), redeploy a build that includes that fix, then add `POSTGRES_APP_PASSWORD` and redeploy once more.

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
# Required for UnionOps-operated customer mode; self-host operators set their
# own policy. Do not enable shared-code mode on a hosted customer instance.
UNIONOPS_HOSTED_CUSTOMER_MODE=true
AUTH_MFA_ENABLED=true
AUTH_MFA_MODE=totp
```

### Image (pick one)

**Option A — GHCR production tag (recommended on Digital Ocean):**

CapRover → Deployment → **Method 3: Deploy via ImageName** (or App Configs image field):

```text
ghcr.io/hackmods/union-communications:production
```

CI publishes `:production` on every `main` push with `NEXT_PUBLIC_DEMO_SITE=false` baked in. `:main` stays demo/workshop.

**Option B — Git deploy with build args:**

CapRover → App Configs → **Build arguments**:

```env
NEXT_PUBLIC_DEMO_SITE=false
NEXT_PUBLIC_OFFICER_HUB_PUBLIC=true
```

Then trigger deploy (webhook or manual).

### Storage and other settings

| Variable | Purpose |
|----------|---------|
| `ATTACHMENT_LOCAL_DIR=/app/data/attachments` + persistent encrypted volume | Store upload bytes |
| `ATTACHMENT_SCANNER_URL` + `ATTACHMENT_SCAN_MODE=strict` | Scanner and fail-closed uploads; hosted readiness also requires a recent scan integration test attestation |
| `UNIONOPS_ATTACHMENT_STORAGE_APPROVED=true` + reviewed date/owner | Operator attests storage location, durability, encryption, and lifecycle |
| `UNIONOPS_BACKUP_CONFIGURED=true` + restore test date/owner | Operator attests backup job and recent restore drill |
| `UNIONOPS_ALERTS_CONFIGURED=true` + delivery test date/owner | Operator attests configured and tested alert route |
| `FEEDBACK_REQUIRE_DURABLE=true` | No silent feedback loss |
| `CRON_SECRET`, `EMAIL_ENABLED`, `SMTP_*` | Invites / reminders |

Redeploy web app.

In UnionOps-operated customer mode, Host readiness and the CI post-deploy check require the storage, scanner, backup, and alert attestations to be no more than 90 days old. These fields do not independently prove provider behavior.

**Portal note:** `PORTAL_DB_BACKEND` and a Postgres/RLS adapter are available, but memory remains the default. Check the `/api/health` backend map and confirm `PORTAL_DB_BACKEND=postgres` on the target host; the memory banner should be absent only after that effective configuration is verified. Do not treat the adapter's presence as host durability evidence.

---

## Phase 3 — Verify (gate before “production-ready”)

### 3A. Health

```powershell
curl.exe -sL https://unionops.org/api/health/
```

Or from repo checkout:

```bash
HOST_READINESS_SECRET=<same high-entropy key configured on the app host> \
  HEALTH_URL=https://unionops.org npm run health:check:production
```

| Field | Pass |
|-------|------|
| `postgresConfigured` | `true` |
| `postgresFlipComplete` | `true` |
| `memoryCaseDataActive` | `false` |
| `demoAuthEnabled` | `false` |
| `hostedCustomerMode` | `true` for UnionOps-operated customer hosting |
| `mfaEnabled`, `mfaMode` | `true`, `"totp"` |
| `hostedControlEvidence.*` | All hosted storage/scanner/backup/alert checks pass in the authenticated readiness response |
| `backends.*` | Postgres for required case records; `DATA_DB_BACKEND=memory` remains an intentional exception until Data is released |

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

- [ ] Public before/after `/api/health` JSON and authenticated readiness output saved; keep the bearer key itself out of the evidence file
- [ ] `db:rls-smoke` pass (via `ops:verify-durable` or logs)
- [ ] Demo auth off on prod
- [ ] Canadian hosting noted (operator)
- [ ] Postgres volume encryption noted (LUKS / cloud)
- [ ] Breach playbook owner named
- [ ] If this is UnionOps-operated hosting, deploy migration `0066`, verify the incident register's direct API/RLS gates, and run an incident drill before launch. The register at `/app/site-admin/incidents` requires TOTP; it does not make notification decisions or replace approved retention. Self-hosted operators provide their own incident register and evidence.
- [ ] Portal: confirm durable Postgres/RLS on the target host; data is not application-encrypted at rest, so verify infrastructure encryption before use

Optional: append post-flip health snapshot to [portal-encryption-security-audit-2026-08-24.md](../audit/portal-encryption-security-audit-2026-08-24.md).

---

## Phase 5 — Engineering backlog (later sessions)

**Evaluation-only use is separate from the sensitive-customer launch gate.** This backlog is not launch approval: do not load live sensitive customer data until the full gate in [`LAUNCH_TRUST_LEGAL_REFACTOR.md`](../LAUNCH_TRUST_LEGAL_REFACTOR.md) passes.

| Priority | Ticket | Work |
|----------|--------|------|
| P0 | `PORTAL-DB-001` | Historical — Postgres adapter and RLS now exist; verify durable backend and policies on the target host |
| P1 | `PORTAL-AUDIT-001` | Full Portal write audit trail |
| P1 | — | Member access/correction/deletion workflow for Circles; Postgres/RLS exists, but member export/erase API and lifecycle workflow are not implemented |
| P1 | `PORTAL-BINDER-001` | Object storage + scan for Binder files |
| P2 | — | `no-store` on remaining Hub JSON APIs |
| P2 | — | Zod on Portal POST bodies; `assigneeId` roster validation |

---

## Portal decision

| Hub flip done? | PORTAL-DB-001 done? | Verdict |
|----------------|----------------------|---------|
| No | — | Finish Phases 1–3 first |
| Yes | No | Portal **evaluation only** — memory banner stays |
| Yes | Yes | Necessary for durable Portal collaboration, but not sufficient for sensitive customer launch; meet the full launch gate |

---

## New session kickoff (paste to agent)

```text
Execute docs/guides/COMPLIANCE_HARDENING_LIVE.md for unionops.org:
Phase 0 health baseline → Phase 1 CapRover Postgres → Phase 2 full flip
(demo off, required customer backends to Postgres, hosted privileged MFA on) → Phase 3 verify.
This does not satisfy the full sensitive-customer launch gate by itself.
Do NOT claim Portal content is application-encrypted at rest.
Refs: CAPROVER_POSTGRES.md, HOSTED_SECURITY.md, portal-encryption-security-audit-2026-08-24.md
```

---

## Success criteria

**Officer Hub:** Health shows durable Postgres, demo off, MFA on; grievance survives restart; RLS smoke passes.

**Local Portal:** Postgres adapter and RLS are available, but memory remains the default. Verify the target host's backend and RLS before use; neither the database nor attachments are application-encrypted at rest.

**Compliance:** Health JSON, RLS verification, and `/security` are evidence inputs only. Also require approved legal documents, privacy operations, audit coverage, tested alerts/restore, and the other gates in [`LAUNCH_TRUST_LEGAL_REFACTOR.md`](../LAUNCH_TRUST_LEGAL_REFACTOR.md).
