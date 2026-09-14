# Session knowledge — Sentry + CapRover error sinks (2026-09-08)

**Audience:** future agents + Ryan (ops).  
**Companions:** [`docs/modules/OBSERVABILITY.md`](../modules/OBSERVABILITY.md), [`HOSTED_SECURITY.md`](../guides/HOSTED_SECURITY.md), [`DEPLOY.md`](../guides/DEPLOY.md), ADR-006 in [`DECISIONS.md`](../DECISIONS.md), [`.cursor/rules/caprover-docker.mdc`](../../.cursor/rules/caprover-docker.mdc).

---

## What shipped

CapRover-togglable **operator error sinks** (not product analytics):

1. **Sentry** (`@sentry/nextjs`) — errors only; no Session Replay; `tracesSampleRate: 0`
2. **Server JSONL file log** — optional path on the container with rotation

Independent toggles: Sentry only, file only, both, or neither (defaults **off**).

| Commit | Work |
|--------|------|
| `86d7a48` | Initial sinks, tunnel `/monitoring`, CSP-safe, ADR-006 amendment |
| `84d2287` | Health flags, boot warns, critical-path reporting, JSONL rotation, CI/Docker source-map secrets |

---

## Env matrix (locked)

| Variable | Role |
|----------|------|
| `SENTRY_ENABLED` | Server/edge master switch (`true` + DSN required) |
| `NEXT_PUBLIC_SENTRY_DSN` | Client SDK — **bake at image build** (Next inlines `NEXT_PUBLIC_*`) |
| `SENTRY_DSN` | Optional runtime server/edge DSN (CapRover App Configs OK) |
| `SENTRY_AUTH_TOKEN` | CI/Docker **build** source maps only — GitHub secret; never commit |
| `SENTRY_ORG` / `SENTRY_PROJECT` | Defaults `union-ops` / `javascript-nextjs` |
| `ERROR_LOG_FILE_ENABLED` | Server JSONL on |
| `ERROR_LOG_FILE_PATH` | Absolute path (e.g. `/data/logs/unionops-errors.jsonl`) |
| `ERROR_LOG_FILE_MAX_BYTES` | Rotate when larger (default **10 MiB**) |
| `ERROR_LOG_FILE_KEEP` | Rotated siblings `path.1`…`path.N` (default **3**) |

**Client enable rule:** browser SDK on iff `NEXT_PUBLIC_SENTRY_DSN` non-empty (build-time).  
**Server enable rule:** `SENTRY_ENABLED=true` **and** `SENTRY_DSN` or public DSN.  
A leaked build-time public DSN without `SENTRY_ENABLED` does **not** send from Node.

---

## Architecture gotchas (do not regress)

1. **CSP** — `connect-src 'self'` in [`next.config.ts`](../../next.config.ts). Browser events use **`tunnelRoute: "/monitoring"`**. Do not open CSP to `*.ingest.sentry.io` unless tunnel is removed.
2. **`src/proxy.ts`** — matcher must skip `monitoring` or next-intl locale-prefixes the tunnel and breaks client capture.
3. **Config wrap order** — `withSentryConfig(withNextIntl(nextConfig), …)` from `@sentry/nextjs/config`. Source-map `errorHandler` warns; builds must not fail without a token.
4. **File sink is Node-only** — edge/browser cannot write CapRover disk. CapRover needs a **Persistent Directory** on the log path or redeploy wipes the file (same idea as `ATTACHMENT_LOCAL_DIR`).
5. **Wizard** — do not run interactive Sentry wizard blind; it fights CSP, proxy, and next-intl.
6. **PII** — server/edge `beforeSend` strips request cookies/data/headers. Never attach grievance bodies to Sentry or JSONL.
7. **ADR-006** — product analytics still banned. Ops error sinks are an accepted amendment (2026-09-08), not a license for Session Replay or usage metrics.

---

## Critical report paths (inventory)

### Server → `reportServerError` / `reportApiFailure`

| Surface | File |
|---------|------|
| Email Mailgun/SMTP send failures | `src/lib/email/send.ts` |
| Polls create 500 | `src/app/api/polls/route.ts` |
| Travel export 500 | `src/app/api/travel/[id]/export/route.ts` |
| Expenses export 500 | `src/app/api/expenses/[id]/export/route.ts` |
| Elections ballot export 500 | `src/app/api/elections/[id]/ballot/route.ts` |
| Polls results export 500 | `src/app/api/polls/id/[id]/export/route.ts` |
| Grievance meeting create null/500 | `src/app/api/grievances/[id]/meetings/route.ts` |
| Framework `onRequestError` | `src/instrumentation.ts` (file + Sentry) |

Helper: `src/lib/observability/report-server-error.ts`.

### Client → `captureClientRouteError`

| Boundary | File |
|----------|------|
| Root | `src/app/global-error.tsx` |
| Locale | `src/app/[locale]/error.tsx` |
| Hub | `src/app/[locale]/app/error.tsx` |
| Portal | `src/app/[locale]/portal/error.tsx` |
| Document Generator | `src/app/[locale]/tools/document-generator/error.tsx` |

Helper: `src/lib/observability/capture-client-route-error.ts`.

When adding a new App Router `error.tsx` or a Hub API path that returns **500 on unexpected throw**, wire the matching helper. Do not invent a second logging stack.

---

## Operator verify

1. CapRover / `.env`: set desired sinks (see matrix).
2. `GET /api/health` → `observability` object:
   - `sentryEnabled`, `sentryClientEnabled`, `errorLogFileEnabled`
   - `sentryMisconfigured`, `errorLogFileMisconfigured`, `sentryClientServerMismatch`
3. `npm run health:check` prints sentry/fileLog + warns on misconfig.
4. Boot logs: one-shot warns from `warnObservabilityMisconfigOnce()` in `instrumentation` register (Node).
5. Sentry UI: Issue after a deliberate error; Network tab should show **same-origin** `/monitoring`.
6. File: `tail` JSONL after a server error; confirm rotate creates `path.1` when over max bytes.
7. GitHub: optional secrets `SENTRY_AUTH_TOKEN`, `NEXT_PUBLIC_SENTRY_DSN` for CI `npm run build` + Docker image bake.

---

## Agent do / don't

**Do**

- Read [`OBSERVABILITY.md`](../modules/OBSERVABILITY.md) + this file before changing Sentry init, proxy matcher, CSP, or health payload
- Keep sinks env-gated and off by default
- Prefer `reportApiFailure` / `captureClientRouteError` over ad-hoc `console.error` for new Hub failures
- Document new env knobs in `.env.example`, `docker/.env.production.example`, HOSTED_SECURITY, DEPLOY

**Don't**

- Enable Session Replay, feedback widget, or product analytics “while we’re in Sentry”
- Hardcode DSN/auth token in source
- Ship a permanent `/sentry-example-page`
- Assume CapRover runtime `NEXT_PUBLIC_SENTRY_DSN` alone enables the browser SDK without an image rebuild
- Log request bodies / cookies into JSONL or Sentry

---

## Kickoff prompt (if regresses)

```text
Sentry/browser errors missing or CSP blocked after a Next/proxy change.
Read docs/audit/session-knowledge-2026-09-08-sentry-observability.md and
docs/modules/OBSERVABILITY.md. Check tunnel /monitoring, proxy matcher,
and /api/health observability flags before opening CSP.
```
