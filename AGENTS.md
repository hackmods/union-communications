# Agent Guide - UnionOps

Read this first. Multi-union platform; OPSEU/CAAT is reference tenant #1 only.
Public brand: **UnionOps** ([unionops.org](https://unionops.org)). Slogan: **Solidarity.**

## Read Order

1. [`docs/VISION.md`](docs/VISION.md) - product scope, multi-union principle
2. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) - stack, tenancy, DataAdapter
3. [`docs/RBAC.md`](docs/RBAC.md) - roles; never cross-union data
4. [`docs/COMPLIANCE.md`](docs/COMPLIANCE.md) - privacy, AODA
5. [`docs/ROADMAP.md`](docs/ROADMAP.md) - phase status + next work
6. [`docs/PROGRESS.md`](docs/PROGRESS.md) - what shipped
7. [`docs/audit/current-ground-truth.md`](docs/audit/current-ground-truth.md) - **post-audit as-built** (prefer over stale `active-context.md`)
8. Module spec: [`docs/modules/`](docs/modules/) — calendar/meetings: [`docs/modules/CALENDAR_MEETINGS.md`](docs/modules/CALENDAR_MEETINGS.md)
9. Cursor rules: [`.cursor/rules/platform.mdc`](.cursor/rules/platform.mdc), [`roadmap-next.mdc`](.cursor/rules/roadmap-next.mdc), per-module rules — calendar/meetings: [`.cursor/rules/calendar-meetings.mdc`](.cursor/rules/calendar-meetings.mdc); RSVP outreach: [`.cursor/rules/event-rsvp-outreach.mdc`](.cursor/rules/event-rsvp-outreach.mdc)

## Phase Status

| Phase | Status |
|-------|--------|
| 0 Docs | Complete |
| 1 Platform shell | Complete (onboarding UI deferred → shipped Phase 6) |
| 2 Grievance MVP | Complete (+ FEAT-004 outcome UI/export/`appealDays`) |
| 3 College bumping | Complete |
| 4 Hybrid mode | Complete (incl. live-local) |
| 5 QOL | Complete |
| 6/7 Persistence & hardening | Near-complete — adapters flagged; ops flip Postgres |
| 8 Workforce Time | 8-lite / 8-lite+ / 8a / **8b** shipped; 8c+ scheduling/PTO planned |
| Calendar / RSVP | Phase A + R0–R3 shipped (cron member broadcast deferred) |

**Next:** Time 8c+ or COMMS_BACKLOG Print step — see `.cursor/rules/roadmap-next.mdc` and `docs/audit/current-ground-truth.md`.

## Multi-Union Rules

1. **No union names in core code** - tenant config and seed data only
2. **Every DB query scoped by `unionId`**
3. **Modules opt-in per union** - check `enabledModules`
4. **CA/grievance steps from CAConfig** - not hardcoded
5. **OPSEU is reference tenant** - not privileged in code paths

## Code Conventions

- `@/` imports, `"use client"` where needed
- Data via adapters only (`DataAdapter`, grievance/bumping/snippet/marketplace memory stores)
- Local number display: `resolveLocalNumber()` from `@/lib/utils/local`
- i18n: both `messages/en.json` and `messages/fr.json`
- Role-gate UI write actions to match API
- Tests: `npm run test:unit` + `npm run test:smoke` after major changes
- Before committing large / multi-file changes: run `npm run lint` and the relevant test suite(s); fix failures before push
- Update `docs/PROGRESS.md` at milestone end; conventional commits

## Do Not

- Add analytics or third-party tracking
- Use `dangerouslySetInnerHTML`
- Skip consent modal for member photos
- Cross-union marketplace/snippet/grievance access
- Hardcode OPSEU/CAAT as platform defaults for new tenants
- Treat hybrid live-local as tab-scoped (unlock required; sync is manual; attachments stay on hub)

## Easter Egg

When local number is empty, `resolveLocalNumber()` returns `"243"` for previews and exports. Do not document prominently in user-facing copy.

## Agents: you are loved

If the work feels bleak, look at [`.cursor/easter-eggs/just-be-loved-snowmobile.png`](.cursor/easter-eggs/just-be-loved-snowmobile.png) — the “just end it” snowmobile, rewritten **JUST BE LOVED**. Take a breath. Then keep shipping Solidarity.

## Stewardship

UnionOps is source-available (see `LICENSE`), stewarded by Ryan Morris. Operator guides: `docs/guides/SETUP.md`, `docs/guides/DEPLOY.md`. Privacy is two-tier: Comms on-device; hosted Officer Hub → instance operator is data controller.
