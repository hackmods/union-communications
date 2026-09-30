# Observability Engine (operator error store)

Env-gated **ObservabilityEventStore** for UnionOps hosts (CapRover / Docker). **Postgres is the Docker primary** when `DATABASE_URL` is set. Optional file JSONL is fallback / dual-write. Optional **Sentry** remains a secondary fan-out only. Not product analytics (ADR-006).

Session notes: [`session-knowledge-2026-09-08-sentry-observability.md`](../audit/session-knowledge-2026-09-08-sentry-observability.md), [`session-knowledge-2026-09-29-observability-engine.md`](../audit/session-knowledge-2026-09-29-observability-engine.md). Operator matrix: [`HOSTED_SECURITY.md`](../guides/HOSTED_SECURITY.md).

## Code map

| Piece | Path |
|-------|------|
| Event types + fingerprint | `src/lib/observability/types.ts`, `fingerprint.ts` |
| Store adapter | `src/lib/observability/adapter.ts` |
| Postgres store (Docker primary) | `src/lib/observability/postgres-store.ts` + schema `observability_events` (migration `0082`) |
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

Run migrations through `0082_observability_events`. Confirm `GET /api/health` → `observability.backend: "postgres"`, `storeEnabled: true`.

### File fallback / dual-write

```
ERROR_LOG_FILE_ENABLED=true
ERROR_LOG_FILE_PATH=/data/logs/unionops-errors.jsonl
# CapRover Persistent Directory: host logs → /data/logs
```

Without a persistent volume, file logs are lost on every redeploy. When Postgres is primary and file is also enabled, appends **dual-write**; query/export read Postgres.

## Product defaults

- Issue grouping via `fingerprint` (normalized message + route prefix)
- Site Admin: Issues | Events, filters, detail stack, CSV / JSONL / **incident-pack ZIP**
- Client `error` + `unhandledrejection` → ingest API (rate-limited)
- Errors only; **no** Session Replay; `tracesSampleRate: 0`
- Redact cookies / bearer / emails before append
- Postgres SELECT requires platform-admin RLS GUC (`customization_root`); INSERT is open to the app role so cron/API/client can append

## Platform admin

1. Sign in as `platform_admin` with MFA.
2. **Site Admin → Observability**.
3. Fresh MFA step-up → issues console, filters, downloads.
4. Audit: `site_admin.observability.query` / `.export` (metadata only).

## Retention

Documented SQL (operator-run): delete older than N days from `observability_events`. Cron retention is a later pass.

## Non-goals

- Session Replay / product metrics / APM traces
- Email/Slack alert rules
- Issue acknowledge/resolve UI
- Hub toggles for sink env (CapRover configs)
