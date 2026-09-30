# Session knowledge — Observability Engine Postgres primary (2026-09-29)

## Decision

On Docker / CapRover, **Postgres is the primary operator error store** when `DATABASE_URL` is set (`OBSERVABILITY_BACKEND=postgres` or unset + URL). File JSONL is fallback or dual-write only, and requires a CapRover Persistent Directory or it dies on redeploy.

## Schema

Migration `0082_observability_events`:

- Table `observability_events` (host operator data — not union casework)
- INSERT policy `WITH CHECK (true)` so `reportServerError` / cron / client ingest work without platform GUC
- SELECT via `customization_root(NULL, true)` — Site Admin query/export wraps `withRlsContext({ platformAdmin, mfaVerified })`
- REVOKE UPDATE/DELETE from `unionops_app`

## v1.1 product surface

- Fingerprints + Issues view, filters, detail stack panel
- Incident-pack ZIP export (`events.jsonl` + `summary.csv` + `report.txt`)
- Global `window.error` / `unhandledrejection` → `/api/observability/client-errors`

## Ops checklist

1. Migrate through `0082`
2. Confirm health `observability.backend === "postgres"`
3. Optional: enable `ERROR_LOG_FILE_*` + volume for dual-write
4. Open `/app/site-admin/observability` as platform_admin + MFA
