# Observability Engine (operator error store)

Env-gated **ObservabilityEventStore** for UnionOps hosts (CapRover / Docker). **Postgres is the Docker primary** when `DATABASE_URL` is set. Optional file JSONL is fallback / dual-write. Optional **Sentry** remains a secondary fan-out only. Not product analytics (ADR-006).

Session notes: [`session-knowledge-2026-09-08-sentry-observability.md`](../audit/session-knowledge-2026-09-08-sentry-observability.md), [`session-knowledge-2026-09-29-observability-engine.md`](../audit/session-knowledge-2026-09-29-observability-engine.md). Operator matrix: [`HOSTED_SECURITY.md`](../guides/HOSTED_SECURITY.md).

## Code map

| Piece | Path |
|-------|------|
| Event types + fingerprint | `src/lib/observability/types.ts`, `fingerprint.ts` |
| Store adapter | `src/lib/observability/adapter.ts` |
| Postgres store (Docker primary) | `src/lib/observability/postgres-store.ts` + schema `observability_events` (migration `0082`) |
| Issue acks + alert rules | `acks.ts`, `alert-rules.ts`, `alert-store.ts` + migration `0083` |
| Crisis email | `composeObservabilityCrisisAlert` (Email Engine `security` classification) |
| Alert cron | `POST /api/cron/observability-alerts` (`CRON_SECRET`) |
| File backend (JSONL) | `src/lib/observability/file-store.ts` |
| Dual-write | `src/lib/observability/dual-store.ts` |
| Summarize / export / redact | `summarize.ts`, `export-formats.ts`, `redact.ts` |
| Config / health | `src/lib/observability/config.ts` |
| Site Admin UI | `/app/site-admin/observability` |
| Client ingest + global handlers | `POST /api/observability/client-errors`, `installGlobalClientErrorHandlers` |

## Docker CapRover (preferred)

```
# Uses existing DATABASE_URL — no ERROR_LOG_FILE_* required
OBSERVABILITY_BACKEND=postgres
# or leave OBSERVABILITY_BACKEND unset when DATABASE_URL is present
```

Run migrations through `0083_observability_alerts_acks`. Confirm `GET /api/health` → `observability.backend: "postgres"`, `storeEnabled: true`.

### File fallback / dual-write

```
ERROR_LOG_FILE_ENABLED=true
ERROR_LOG_FILE_PATH=/data/logs/unionops-errors.jsonl
# CapRover Persistent Directory: host logs → /data/logs
```

Without a persistent volume, file logs are lost on every redeploy. When Postgres is primary and file is also enabled, appends **dual-write**; query/export read Postgres.

## Issue acknowledgements

Postgres-only (`observability_issue_acks`). Site Admin Issues table: **Acknowledge** / **Clear ack**, optional note, **Hide acknowledged** (default on). Acked fingerprints are skipped by the alert cron. File-only hosts show a callout; acks API returns `acks_require_postgres`.

Audit: `site_admin.observability.ack` (MFA step-up).

## Crisis email alerts

Postgres-only rules (`observability_alert_rules`) + firings (`observability_alert_firings`).

```
OBSERVABILITY_ALERTS_ENABLED=true
OBSERVABILITY_ALERT_EMAIL=ops@example.org   # optional default recipient
EMAIL_ENABLED=true
CRON_SECRET=…
# Schedule: POST /api/cron/observability-alerts every 5–15 minutes
```

Defaults for a new rule: `min_level=error`, `threshold_count=5`, `window_minutes=15`, `cooldown_minutes=60`. Mail is composed with **`composeObservabilityCrisisAlert`** → `sendClassifiedEmail({ classification: "security" })` (same lane as password reset — table layout, security disclaimer, CTA to Site Admin Observability). Stacks are never included.

File/noop backends skip evaluation; UI explains Postgres is required.

## Product defaults

- Issue grouping via `fingerprint` (normalized message + route prefix)
- Site Admin: Issues | Events, filters, detail stack, CSV / JSONL / **incident-pack ZIP**, acks, alert rules
- Client `error` + `unhandledrejection` → ingest API (rate-limited)
- Errors only; **no** Session Replay; `tracesSampleRate: 0`
- Redact cookies / bearer / emails before append
- Postgres SELECT requires platform-admin RLS GUC (`customization_root`); INSERT is open to the app role so cron/API/client can append
- Cron alert evaluator uses `app.current_retention_job` for rules/acks/events SELECT

## Platform admin

1. Sign in as `platform_admin` with MFA.
2. **Site Admin → Observability**.
3. Fresh MFA step-up → issues console, filters, downloads, acknowledge, alert rules.
4. Audit: `site_admin.observability.query` / `.export` / `.ack` / `.alert_rules` (metadata only); cron `observability.alert.fired` (counts only).

## Retention

Documented SQL (operator-run): delete older than N days from `observability_events`. Cron retention is a later pass.

## Non-goals

- Session Replay / product metrics / APM traces
- Slack / PagerDuty
- Per-union alert routing
- Auto-ack on deploy
- File-backend alert evaluation
- Hub toggles for sink env (CapRover configs)
