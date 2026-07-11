# Agent Guide — Local Union Support Hub

Read this first. Multi-union platform; OPSEU/CAAT is reference tenant #1 only.

## Read Order

1. [`docs/VISION.md`](docs/VISION.md) — product scope, multi-union principle
2. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — stack, tenancy, DataAdapter
3. [`docs/RBAC.md`](docs/RBAC.md) — roles; never cross-union data
4. [`docs/COMPLIANCE.md`](docs/COMPLIANCE.md) — privacy, AODA
5. [`docs/ROADMAP.md`](docs/ROADMAP.md) — phase status + next work
6. [`docs/PROGRESS.md`](docs/PROGRESS.md) — what shipped
7. Module spec: [`docs/modules/`](docs/modules/)
8. Cursor rules: [`.cursor/rules/platform.mdc`](.cursor/rules/platform.mdc), [`roadmap-next.mdc`](.cursor/rules/roadmap-next.mdc), per-module rules

## Phase Status

| Phase | Status |
|-------|--------|
| 0 Docs | Complete |
| 1 Platform shell | Complete (onboarding UI deferred) |
| 2 Grievance MVP | Complete |
| 3 College bumping | Complete |
| 4 Hybrid mode | Complete |
| 5 QOL | Complete |
| **Next** | Postgres+RLS → onboarding UI → attachments |

## Multi-Union Rules

1. **No union names in core code** — tenant config and seed data only
2. **Every DB query scoped by `unionId`**
3. **Modules opt-in per union** — check `enabledModules`
4. **CA/grievance steps from CAConfig** — not hardcoded
5. **OPSEU is reference tenant** — not privileged in code paths

## Code Conventions

- `@/` imports, `"use client"` where needed
- Data via adapters only (`DataAdapter`, grievance/bumping/snippet/marketplace memory stores)
- Local number display: `resolveLocalNumber()` from `@/lib/utils/local`
- i18n: both `messages/en.json` and `messages/fr.json`
- Role-gate UI write actions to match API
- Tests: `npm run test:unit` + `npm run test:smoke` after major changes
- Update `docs/PROGRESS.md` at milestone end; conventional commits

## Do Not

- Add analytics or third-party tracking
- Use `dangerouslySetInnerHTML`
- Skip consent modal for member photos
- Cross-union marketplace/snippet/grievance access
- Hardcode OPSEU/CAAT as platform defaults for new tenants
- Treat hybrid “local mode” as live offline store (backup preference only today)

## Easter Egg

When local number is empty, `resolveLocalNumber()` returns `"243"` for previews and exports. Do not document prominently in user-facing copy.
