# Observability Engine (operator error store)

Env-gated **ObservabilityEventStore** for UnionOps hosts (CapRover / Docker). **Postgres is the Docker primary** when `DATABASE_URL` is set. Optional file JSONL is fallback / dual-write. Optional **Sentry** remains a secondary fan-out only. Not product analytics (ADR-006).

Session notes: [`session-knowledge-2026-09-08-sentry-observability.md`](../audit/session-knowledge-2026-09-08-sentry-observability.md), [`session-knowledge-2026-09-29-observability-engine.md`](../audit/session-knowledge-2026-09-29-observability-engine.md). Operator matrix: [`HOSTED_SECURITY.md`](../guides/HOSTED_SECURITY.md).

## Code map

| Piece | Path |
|-------|------|
| Event types + fingerprint | `src/lib/observability/types.ts`, `fingerprint.ts` |
| Store adapter | `src/lib/observability/adapter.ts` |
| Postgres store (Docker primary) | `postgres-store.ts` + migrations `0082`–`0084` |
| Issue acks + alert rules | `acks.ts`, `alert-rules.ts`, `alert-store.ts`, `file-alert-store.ts`, `evaluate-alerts.ts` |
| Auto-ack on deploy | `auto-ack-deploy.ts` (hooked from deploy-notify cron) |
| Crisis email | `composeObservabilityCrisisAlert` via Email Engine (`security`, `multipart`\|`plain`) |
| Alert cron | `POST /api/cron/observability-alerts` (`CRON_SECRET`) |
| File backend (JSONL) | `file-store.ts` + sidecar rules/acks/firings |
| Site Admin UI | `/app/site-admin/observability` |

## Docker CapRover (preferred)

```
OBSERVABILITY_BACKEND=postgres
# migrate through 0084_observability_union_routing
```

Confirm `GET /api/health` → `observability.backend: "postgres"`, `storeEnabled: true`.

### File fallback / dual-write

```
ERROR_LOG_FILE_ENABLED=true
ERROR_LOG_FILE_PATH=/data/logs/unionops-errors.jsonl
# Optional: OBSERVABILITY_ALERT_RULES_PATH=/data/logs/observability-alert-rules.json
# CapRover Persistent Directory: host logs → /data/logs
```

Without a persistent volume, file logs **and** file alert sidecars vanish on redeploy.

## Per-union routing

- Events may carry optional `unionId` when known (Hub session / API context). Never invent; cron/system leave null. Fingerprint stays host-global.
- Alert rules may set `unionId` (filter) and/or `recipientsByUnion` (fan-out map). Host-wide rules send per distinct union bucket when the map is set.
- Still platform-admin only — no tenant self-serve.

## Issue acknowledgements

Postgres (`observability_issue_acks`) or file sidecar `observability-issue-acks.json`. UI: Acknowledge / Clear ack, hide acknowledged (default on). Acked fingerprints skipped by alert cron.

**Auto-ack on deploy:** `OBSERVABILITY_AUTO_ACK_ON_DEPLOY=true` — after a successful deploy-notify cron send, fingerprints whose latest event `build` ≠ current `BUILD_COMMIT_SHA` are acknowledged as `system-deploy`. Audit `observability.ack.auto_deploy`.

## Crisis email alerts

```
OBSERVABILITY_ALERTS_ENABLED=true
OBSERVABILITY_ALERT_EMAIL=ops@example.org
EMAIL_ENABLED=true
CRON_SECRET=…
# POST /api/cron/observability-alerts every 5–15 minutes
```

- **Postgres:** tables `observability_alert_rules` / `observability_alert_firings`
- **File:** JSON rules + JSONL firings beside the error log path
- Defaults: `min_level=error`, threshold 5 / 15m window / 60m cooldown, `email_format=multipart` (or `plain`)
- Compose **only** via Email Engine (`composeObservabilityCrisisAlert` → `sendClassifiedEmail` security). No ad-hoc HTML. New Hub/tool mail should use the engine block catalog (`issueList`, `severityCallout`, `codeFence`, `bulletList`, …).

## Product defaults

- Issue grouping via `fingerprint`
- Site Admin: Issues | Events, filters, stacks, CSV / JSONL / incident-pack, acks, alert rules
- Client ingest stamps session `unionId` when authenticated
- No Session Replay / APM / product metrics

## Non-goals

- Session Replay / product metrics / APM traces
- Slack / PagerDuty
- Tenant self-serve alert admin
- Rewriting every existing transactional template in one pass
