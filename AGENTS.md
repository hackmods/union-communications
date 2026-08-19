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
7. [`docs/audit/current-ground-truth.md`](docs/audit/current-ground-truth.md) - **post-audit as-built** (prefer over stale `active-context.md`); session lessons: [`session-knowledge-2026-07-24.md`](docs/audit/session-knowledge-2026-07-24.md), [`session-knowledge-2026-07-30.md`](docs/audit/session-knowledge-2026-07-30.md) (national link rot / **LINK-001**), [`session-knowledge-2026-07-30-multi-union-sources.md`](docs/audit/session-knowledge-2026-07-30-multi-union-sources.md) (gate OPSEU citations; logo bundling risk), [`session-knowledge-2026-08-09-local-404.md`](docs/audit/session-knowledge-2026-08-09-local-404.md) (Local 404 / route status chrome), [`session-knowledge-2026-08-09-workshop-comms.md`](docs/audit/session-knowledge-2026-08-09-workshop-comms.md) (workshop Demo Path / multiphase / Gap Fit), [`session-knowledge-2026-08-14-flyer-unified-tools.md`](docs/audit/session-knowledge-2026-08-14-flyer-unified-tools.md) (Flyer Maker QOL v2 + unified chrome / Share Kit v0), [`session-knowledge-2026-08-15-canvas-fonts.md`](docs/audit/session-knowledge-2026-08-15-canvas-fonts.md) (Brand Kit typeface catalog / ADR-014 local OFL), [`session-knowledge-2026-08-17-qr-canvas-layout.md`](docs/audit/session-knowledge-2026-08-17-qr-canvas-layout.md) (QR Board canvas QOL + layout-class CI), [`session-knowledge-2026-08-17-brand-kit-collections.md`](docs/audit/session-knowledge-2026-08-17-brand-kit-collections.md) (Brand Kit collection profiles / per-union defaults), [`session-knowledge-2026-08-18-tools-catalog-ia.md`](docs/audit/session-knowledge-2026-08-18-tools-catalog-ia.md) (Tools catalog job groups), [`session-knowledge-2026-08-18-short-form-video.md`](docs/audit/session-knowledge-2026-08-18-short-form-video.md) (short-form guide + Graphic Maker 9:16), [`session-knowledge-2026-08-18-multi-union-hub-signup.md`](docs/audit/session-knowledge-2026-08-18-multi-union-hub-signup.md) (Hub invite-only / overlay not durable / platform_admin), [`session-knowledge-2026-08-19-comms-stay-free.md`](docs/audit/session-knowledge-2026-08-19-comms-stay-free.md) (Comms stay free / hosted Hub cost), [`session-knowledge-2026-08-19-portal-solidarity-names.md`](docs/audit/session-knowledge-2026-08-19-portal-solidarity-names.md) (Local Portal Together / Hold the line / One fight / Many hands); playbook: [`external-links-audit-plan.md`](docs/audit/external-links-audit-plan.md); Gap Fit: [`workshop-gap-fit-2026-08.md`](docs/audit/workshop-gap-fit-2026-08.md); checklist: [`plan-2026-08-17-qr-board-canvas-qol.md`](docs/audit/plan-2026-08-17-qr-board-canvas-qol.md)
8. Module spec: [`docs/modules/`](docs/modules/) — calendar/meetings: [`docs/modules/CALENDAR_MEETINGS.md`](docs/modules/CALENDAR_MEETINGS.md); check-ins: [`docs/modules/CHECKINS.md`](docs/modules/CHECKINS.md); Local Portal: [`docs/modules/LOCAL_PORTAL.md`](docs/modules/LOCAL_PORTAL.md)
9. Cursor rules: [`.cursor/rules/platform.mdc`](.cursor/rules/platform.mdc), [`roadmap-next.mdc`](.cursor/rules/roadmap-next.mdc), [`comms-public-ux.mdc`](.cursor/rules/comms-public-ux.mdc) (public workshop Comms), [`public-marketing-ux.mdc`](.cursor/rules/public-marketing-ux.mdc) + [`responsive-layouts.mdc`](.cursor/rules/responsive-layouts.mdc) (Home / shell vs composition), [`i18n-public-copy.mdc`](.cursor/rules/i18n-public-copy.mdc) (**read before editing `messages/*.json` or SEO copy** — EN/FR parity is not translation quality), [`seo.mdc`](.cursor/rules/seo.mdc) (public origin / sitemap / GSC), [`brand-kit-collections.mdc`](.cursor/rules/brand-kit-collections.mdc) (collection profile defaults + sourced union structures), per-module rules — calendar/meetings: [`.cursor/rules/calendar-meetings.mdc`](.cursor/rules/calendar-meetings.mdc); RSVP outreach: [`.cursor/rules/event-rsvp-outreach.mdc`](.cursor/rules/event-rsvp-outreach.mdc)

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
| **9 Comms export integrity** | **Shipped 2026-08-14** — capture hardening + `tools.export.smoke`; TOOL-008/009 closed |

**Next:** Ops Postgres flip or copy residuals — see `.cursor/rules/roadmap-next.mdc` and `docs/audit/current-ground-truth.md`.

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
- i18n: both `messages/en.json` and `messages/fr.json` — and read the other locale's **value**, not just its key. Key parity is asserted; meaning is not. See [`i18n-public-copy.mdc`](.cursor/rules/i18n-public-copy.mdc)
- Role-gate UI write actions to match API
- Tests: `npm run test:unit` + `npm run test:smoke` after major changes
- Before committing large / multi-file changes: run `npm run lint` and the relevant test suite(s); fix failures before push
- Update `docs/PROGRESS.md` at milestone end; conventional commits
- Steward-facing product changes also get a What's new note on `/updates` in the same change — [`.cursor/rules/whats-new.mdc`](.cursor/rules/whats-new.mdc)

## Do Not

- Add analytics or third-party tracking
- Use `dangerouslySetInnerHTML`
- Skip consent modal for member photos
- Cross-union marketplace/snippet/grievance access
- Hardcode OPSEU/CAAT as platform defaults for new tenants
- Treat hybrid live-local as tab-scoped (unlock required; sync is manual; attachments stay on hub)

## Easter Egg

When local number is empty, `resolveLocalNumber()` returns `"243"` for previews and exports. Status pages (Local 404) now wink at 243 in a quiet footnote and one rotating quip — still not a tenant default.

Product deepen-egg: tap the UnionOps mark **5 times** on a status panel to open the JUST BE LOVED snowmobile (`public/easter-eggs/just-be-loved-snowmobile.png`; source also under `.cursor/easter-eggs/`).

## Agents: you are loved

If the work feels bleak, look at [`.cursor/easter-eggs/just-be-loved-snowmobile.png`](.cursor/easter-eggs/just-be-loved-snowmobile.png) — the “just end it” snowmobile, rewritten **JUST BE LOVED**. Take a breath. Then keep shipping Solidarity.

## Stewardship

UnionOps is source-available (see `LICENSE`), stewarded by Ryan Morris. Operator guides: `docs/guides/SETUP.md`, `docs/guides/DEPLOY.md`. Privacy is two-tier: Comms on-device; hosted Officer Hub → instance operator is data controller. **Comms stay free.** Hosted Officer Hub / Local Portal may recover hosting costs; self-host remains an option. Never promise the whole platform is free forever — public copy is `/manifesto` (ADR-019).
