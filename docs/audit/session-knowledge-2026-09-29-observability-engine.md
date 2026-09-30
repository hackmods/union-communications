# Session knowledge — Observability Engine (Sentry-free primary) (2026-09-29)

## Context

Launch hosts that do not run Sentry still need durable operator error capture, client boundary reports, and MFA-gated CSV/JSONL export under `platform_admin`. The 2026-09-08 sinks treated JSONL as write-only (SSH `tail`) and client errors as Sentry-only.

## Decision

Introduce an **ObservabilityEventStore** adapter (`append` / `query` / `export`) with a **file JSONL backend** as v1 source of truth. Optional Sentry remains a secondary fan-out only. Client `error.tsx` boundaries POST sanitized events to `/api/observability/client-errors`. Site Admin **Observability** page uses the same MFA step-up + fail-closed audit pattern as operator audit / sensitive exports.

## Env

| Variable | Role |
|----------|------|
| `ERROR_LOG_FILE_ENABLED` + `ERROR_LOG_FILE_PATH` | Primary store (required without Sentry) |
| `OBSERVABILITY_BACKEND` | `file` / `noop` / `postgres` (postgres reserved) |
| `SENTRY_*` | Optional; unused on Sentry-free hosts |

## Security

- Never accept filesystem paths from clients.
- Redact bearer/JWT/email/cookie-shaped strings before append.
- Client ingest: strict Zod, no arbitrary meta, 20/min per IP hash.
- Export/query: `requireSiteAdminSession` + `verifyFreshMfaStepUp`; audit metadata only.

## Follow-ups

- Postgres store for multi-replica hosts.
- Broader `reportApiFailure` coverage beyond cron + critical paths.
