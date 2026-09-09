# Observability (operator error sinks)

Env-gated **Sentry** and/or **server JSONL** error reporting for UnionOps hosts (CapRover / Docker). Not product analytics (ADR-006 amended 2026-09-08).

Full narrative + critical-path inventory: [`docs/audit/session-knowledge-2026-09-08-sentry-observability.md`](../audit/session-knowledge-2026-09-08-sentry-observability.md). Operator matrix: [`HOSTED_SECURITY.md`](../guides/HOSTED_SECURITY.md).

## Code map

| Piece | Path |
|-------|------|
| Config / health snapshot | `src/lib/observability/config.ts` |
| Boot misconfig warns | `src/lib/observability/boot-warn.ts` |
| JSONL + rotation | `src/lib/observability/file-log.ts` |
| Server fan-out | `src/lib/observability/report-server-error.ts` |
| Client error boundaries | `src/lib/observability/capture-client-route-error.ts` |
| Sentry init | `src/sentry.server.config.ts`, `src/sentry.edge.config.ts`, `src/instrumentation-client.ts` |
| Register + `onRequestError` | `src/instrumentation.ts` |
| Health payload | `src/lib/ops/health-status.ts` → `observability` |
| Next wrap + tunnel | `next.config.ts` (`tunnelRoute: "/monitoring"`) |
| Proxy exclude | `src/proxy.ts` matcher skips `monitoring` |

## Product defaults

- Errors only; **no** Session Replay; `tracesSampleRate: 0`
- Both sinks **off** unless env explicitly enables them
- `beforeSend` strips request cookies / data / headers
- Client DSN is build-time (`NEXT_PUBLIC_SENTRY_DSN`); server can use runtime `SENTRY_DSN` + `SENTRY_ENABLED`

## Non-goals

- Hub UI toggles for sinks
- Writing browser errors to CapRover disk
- Product usage metrics / analytics
- Permanent example/break pages in production
