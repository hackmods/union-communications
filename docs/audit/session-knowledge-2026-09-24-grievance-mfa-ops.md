# Session knowledge — Grievance MFA gate removal + ops package (2026-09-24)

**Audience:** future agents + Ryan (ops).  
**Trigger:** Production Hub showed “Could not load grievances” while Letter Generator was fine after recent deploys.

## Root cause

Live `/api/health` had `GRIEVANCE_DB_BACKEND=postgres` and `mfaEnabled=false`.  
`requireGrievanceSession()` returned **503** when `NODE_ENV=production` + postgres grievances + MFA off — a hard gate that contradicted product policy (MFA **opt-in**).

Hub UI mapped every non-OK list response to generic `grievance.loadError`, so the failure looked like a random load bug. Letter Generator was unrelated (client-side Comms).

## Fix (do not reverse)

1. **Removed** the `durableProductionCasework && !isMfaEnabled()` 503 from [`src/lib/auth/grievance-session.ts`](../../src/lib/auth/grievance-session.ts). Keep `sessionMfaOk` only (no-ops when MFA is disabled).
2. **Do not** re-couple durable casework to “MFA must be enabled or 503” in a later compliance/hardening refactor.
3. Softened guides: MFA is recommended for higher-assurance hosts, not required for Postgres grievances.

## Ops package shipped with the fix

| Piece | What |
|-------|------|
| Clearer Hub errors | `HybridCaseApiError` + `loadErrorUnauthorized` / `loadErrorForbidden` (no “enable MFA for grievances” copy) |
| Deploy notify | `/api/cron/deploy-notify` — `DEPLOY_NOTIFY_ENABLED` + `DEPLOY_NOTIFY_EMAIL` + `CRON_SECRET` |
| Operator action log | `/app/site-admin/operator-audit` + `GET /api/site-admin/audit` (`site_admin.*` only; private) |
| CI readiness | `npm run health:check:readiness` — MFA/email/cron advisory; never fail deploy for MFA off |
| Host readiness UI | Blocking vs advisory presence; Host card warn count ignores advisory |

## Verify

- After deploy: `GET /api/grievances` as a signed-in officer → **200** with MFA still off.
- `GET /api/health` → `mfaEnabled` may stay `false`; Host readiness `ready` can still be true.
- `HEALTH_URL=https://unionops.org/api/health npm run health:check:readiness`

## Related

- [`COMPLIANCE_HARDENING_LIVE.md`](../guides/COMPLIANCE_HARDENING_LIVE.md) — MFA optional in paste block
- [`host-readiness.ts`](../../src/lib/ops/host-readiness.ts) — `advisory` presence flags
