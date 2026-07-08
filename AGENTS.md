# Agent Guide — Local Union Support Hub

Read this first. Multi-union platform; OPSEU/CAAT is reference tenant #1 only.

## Read Order

1. [`docs/VISION.md`](docs/VISION.md) — product scope, multi-union principle
2. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — stack, tenancy, DataAdapter
3. [`docs/RBAC.md`](docs/RBAC.md) — roles; never cross-union data
4. [`docs/COMPLIANCE.md`](docs/COMPLIANCE.md) — privacy, AODA
5. [`docs/ROADMAP.md`](docs/ROADMAP.md) — what phase we're in
6. Module spec for your task: [`docs/modules/`](docs/modules/)
7. Cursor rules: [`.cursor/rules/platform.mdc`](.cursor/rules/platform.mdc) + per-module rules

## Phase Constraints

| Phase | Allowed | Forbidden |
|-------|---------|-----------|
| 0 | Docs, cursor rules | Auth, DB, grievance API |
| 1 | Platform shell, auth, tenant config | Grievance CRUD without MFA |
| 2+ | Grievance module | Cross-union queries |

## Multi-Union Rules

1. **No union names in core code** — tenant config and seed data only
2. **Every DB query scoped by `unionId`**
3. **Modules opt-in per union** — check `enabledModules`
4. **CA/grievance steps from CAConfig** — not hardcoded
5. **OPSEU is reference tenant** — not privileged in code paths

## Code Conventions

- `@/` imports, `"use client"` where needed
- Data via `DataAdapter` only
- Local number display: use `resolveLocalNumber()` from `@/lib/utils/local`
- i18n: add strings to both `messages/en.json` and `messages/fr.json`
- Tests: `npm run test:unit` + `npm run test:smoke` after major changes
- Update `docs/PROGRESS.md` at milestone end; commit with conventional messages

## Do Not

- Add analytics or third-party tracking
- Use `dangerouslySetInnerHTML`
- Skip consent modal for member photos
- Build grievance features without auth + audit (Phase 2+)
- Hardcode OPSEU/CAAT as platform defaults for new tenants

## Easter Egg

When local number is empty, `resolveLocalNumber()` returns `"243"` for previews and exports. Do not document prominently in user-facing copy.
