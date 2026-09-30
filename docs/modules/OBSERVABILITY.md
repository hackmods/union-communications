# Observability Engine (operator error store)

Env-gated **ObservabilityEventStore** for UnionOps hosts (CapRover / Docker). Optional **Sentry** remains a secondary fan-out only. Not product analytics (ADR-006 amended 2026-09-08; Sentry-free primary 2026-09-29).

Session narrative (Sentry era): [`docs/audit/session-knowledge-2026-09-08-sentry-observability.md`](../audit/session-knowledge-2026-09-08-sentry-observability.md). Engine addendum: [`docs/audit/session-knowledge-2026-09-29-observability-engine.md`](../audit/session-knowledge-2026-09-29-observability-engine.md). Operator matrix: [`HOSTED_SECURITY.md`](../guides/HOSTED_SECURITY.md).

## Code map

| Piece | Path |
|-------|------|
| Event types | `src/lib/observability/types.ts` |
| Store adapter | `src/lib/observability/adapter.ts` |
| File backend (JSONL + rotation) | `src/lib/observability/file-store.ts` (+ `file-log.ts` helpers) |
| Store resolver | `src/lib/observability/store.ts` |
| Redaction | `src/lib/observability/redact.ts` |
| Config / health snapshot | `src/lib/observability/config.ts` |
| Server fan-out | `src/lib/observability/report-server-error.ts` |
| Client boundary + ingest POST | `capture-client-route-error.ts`, `POST /api/observability/client-errors` |
| Site Admin export / query | `POST /api/site-admin/observability/export`, `…/query` |
| Site Admin UI | `/app/site-admin/observability` |
| Optional Sentry init | `src/sentry.server.config.ts`, `instrumentation-client.ts` |
| `onRequestError` | `src/instrumentation.ts` |
| Health payload | `src/lib/ops/health-status.ts` → `observability` |

## Product defaults

- **Primary store** = file JSONL when `ERROR_LOG_FILE_ENABLED` + `ERROR_LOG_FILE_PATH` (persistent CapRover volume).
- `OBSERVABILITY_BACKEND`: `file` (implicit when file on), `noop`, or `postgres` (**reserved** — falls back to file until a durable adapter ships).
- Optional Sentry fan-out when `SENTRY_ENABLED` + DSN; **not required**.
- Errors only; **no** Session Replay; `tracesSampleRate: 0`.
- Redact cookies / bearer tokens / emails before append; never log request bodies.
- Client route errors POST a sanitized payload to `/api/observability/client-errors` (rate-limited).

## Platform admin export

1. Sign in as `platform_admin` with MFA.
2. Open **Site Admin → Observability**.
3. Fresh MFA step-up, then preview events or **Download CSV / JSONL**.
4. Audit actions: `site_admin.observability.query` / `site_admin.observability.export` (metadata only — format, counts — never event bodies).

Exports are `private, no-store` attachments. Cap at 500 events. Stacks may contain incidental PII — treat downloads as incident response data.

## CapRover ops (this host)

```
ERROR_LOG_FILE_ENABLED=true
ERROR_LOG_FILE_PATH=/data/logs/unionops-errors.jsonl
# mount a persistent volume on /data/logs
```

Confirm `GET /api/health` → `observability.storeEnabled: true`, `backend: "file"`.

## Upgrade path (enterprise)

| Step | Notes |
|------|--------|
| v1 (now) | File store + MFA export + client ingest |
| v2 | `PostgresObservabilityStore` + migration; flip `OBSERVABILITY_BACKEND=postgres` for multi-replica |
| Later | Retention cron, incident-pack zip reuse of `export()` |

File backend is **per pod**. Multi-replica hosts need Postgres (or a shared volume stopgap) before treating export as host-wide.

## Non-goals

- Hub UI toggles for sink env (ops via CapRover)
- Session Replay / product usage metrics
- Distributed APM / flame graphs
- Pulling from external Sentry APIs as source of truth
