# Current ground truth (agents) — as of 2026-08-09

**Purpose:** Replace stale claims in the 2026-07-22 audit snapshot (`active-context.md`, older roadmap-next bullets). Prefer this file + `docs/PROGRESS.md` + module specs when sequencing work.

**Session narrative + lessons (Hub → Proxmox → password-reset → Time 8c–8e → cron → GM invite):** [`session-knowledge-2026-07-24.md`](session-knowledge-2026-07-24.md)  
**Comms external links / national site URL rot (LINK-001):** [`session-knowledge-2026-07-30.md`](session-knowledge-2026-07-30.md)  
**Multi-union sources + logo bundling (LINK-002):** [`session-knowledge-2026-07-30-multi-union-sources.md`](session-knowledge-2026-07-30-multi-union-sources.md)  
**Local 404 / route status chrome:** [`session-knowledge-2026-08-09-local-404.md`](session-knowledge-2026-08-09-local-404.md)  
**Workshop Comms multiphase + Gap Fit (talk ~2026-08-12):** [`session-knowledge-2026-08-09-workshop-comms.md`](session-knowledge-2026-08-09-workshop-comms.md), [`workshop-gap-fit-2026-08.md`](workshop-gap-fit-2026-08.md)
**Flyer Maker QOL v2 + unified tools chrome / Share Kit v0 (2026-08-14):** [`session-knowledge-2026-08-14-flyer-unified-tools.md`](session-knowledge-2026-08-14-flyer-unified-tools.md)

## Do not re-open as if missing

| Topic | Reality | Why it mattered |
|-------|---------|-----------------|
| Audit sprint Phases 1–4 | Closed | Security, Postgres adapters (flagged), FEAT/ORG/TOOL/UX tickets shipped |
| Postgres adapters | Exist behind `*_DB_BACKEND` (default **memory**) | Ops flip per host; durable invites + `db:seed-admin` when `AUTH_USERS_BACKEND=postgres` |
| Calendar R0 / R0.5 / R1 / R2 / R3 | Shipped (cron **member** auto-send deferred) | R2 = Hub copy draft; R3 = SMTP self-remind |
| Cron officer reminders | Shipped 2026-07-25 | `/api/cron/meeting-reminders` + `CRON_SECRET`; roster emails only |
| Time 8a–8b | Shipped | Postgres flag; sites/geofence; bulk approve; XLSX/PDF |
| Time 8c.1–8c.3 | Shipped 2026-07-24/25 | PTO requests; shifts; accrual balances |
| Time 8d-lite / 8e | Shipped 2026-07-25 | Weekly OT CSV flag; pay-period snap; GPS consent |
| Time 8-full | Shipped 2026-07-26 | Workers directory, OT policies, shift recurrence, auto-accrual, groups, payroll hooks |
| Time 8f | Shipped 2026-07-26 | Hybrid slice v1.1 time entries; punch photo attachments |
| Graphic Maker notice invite | Shipped 2026-07-25 | `InviteEmailPanel` on notice layout (R0.5 stretch) |
| Pristine Office Templates | Shipped 2026-07-15 | Plan file todos may look pending — trust PROGRESS |
| Password-reset | Shipped | Memory default; durable Postgres when `AUTH_USERS_BACKEND=postgres` |
| FEAT-003 / FEAT-004 | Shipped | Related tasks panel; outcome UI/export/`appealDays` |
| Check-ins (Basecamp Automatic Check-ins) | Shipped 2026-07-26 | HubModule `checkins`; dashboard unanswered widget; no email nudges |
| Local 404 / route status | Shipped 2026-08-09 | `RouteStatusPanel`; Portal + root/`global-error`; poll/RSVP/meeting `notFound()`; quips + eggs |
| Workshop Demo Path + multiphase UX | Shipped 2026-08-08/09 | `WorkshopDemoPath`; `/guide/workshop`; Day-of run sheet; exportSuccess / RelatedTools / BrandSetup; Gap Fit backlog |

## Three email/reminder surfaces (do not conflate)

| Surface | Where | Send model |
|---------|-------|------------|
| Public RSVP **invite** | Document Generator, Board Notice, Graphic Maker notice | Copy / `mailto:` — `event-email.ts` |
| Hub **officer reminder draft** (R2) | `/app/meetings` Events board | Copy / `mailto:` — `membership-meeting-reminder.ts` |
| Hub **SMTP** (R3 + cron) | `remind-email` + `/api/cron/meeting-reminders` | Opt-in `EMAIL_ENABLED`; officer session or **roster** emails only |

Never member broadcast lists. Never put public invite copy on grievance email-draft APIs.

## Time Phase 8 slicing (locked)

- **8b:** sites/geofence, bulk approve, XLSX/PDF
- **8c.1:** leave requests — **8c.2:** shifts (no recurrence) — **8c.3:** manual accrual + approve debit
- **8d-lite:** weekly OT flag on CSV + 14-day pay-period snap — **not** full OT engine
- **8e:** `gpsConsentAt` + punch GPS gated on consent
- **8-full:** workers directory, OT policy engine, shift recurrence, auto-accrual, named groups, payroll export hooks
- **8f:** hybrid slice v1.1 includes time entries; optional punch photo attachments (hub storage only)

## Hub / auth / ops gotchas

| Topic | Reality |
|-------|---------|
| MFA-off Hub | `useSessionMfaOk()` / `MfaPolicyProvider` — not raw `mfaVerified` |
| Demo on prod image | `AUTH_ALLOW_DEMO_USERS=true` |
| Sandbox | CT 115 @ `192.168.0.115:3000`; **Postgres durable** compose stack @ `289bfb3` (`postgresFlipComplete: true`); `docker-db-1` + `docker-web-1`; demo users via `AUTH_ALLOW_DEMO_USERS` |
| Cron | `CRON_SECRET` required; Bearer or `x-cron-secret`; `?dryRun=1` previews without send/audit |
| React derived state | Do not sync `setState` in `useEffect` for consent flags — derive from roster |
| Production typecheck | `npx tsc --noEmit` / Docker build — unit tests miss route type errors (`#12`, `#13`) |

## Sensible next candidates

1. Ops: Postgres backend flips + real scanner on durability hosts — see [`docs/guides/POSTGRES_OPS.md`](../guides/POSTGRES_OPS.md) (`docker-compose.durable.yml`, `HEALTH_REQUIRE_DURABLE`, expanded `/api/health`)
2. ~~COMMS email/broadcast guide (fifth-channel)~~ — **shipped 2026-07-26** (`/guide/email-broadcast`); train #2 wired home, footer, First week, tools index
3. ~~Time **8f** hybrid slice / punch photos~~ — **shipped 2026-07-26** (slice v1.1 + migration `0029_time_8f`)
4. ~~Optional: canvas tool axe color-contrast on brand-orange previews (6 smoke failures noted 2026-07-25)~~ — **shipped 2026-07-25** (`mutedInkOnBackground`)
5. ~~Ops: redeploy sandbox after train merges~~ — **done 2026-07-26** (`9446186`, health ok, 137/137 smoke)
6. ~~API route auth unit gap (cron / forgot-password)~~ — **shipped 2026-07-26** (train #3)
7. Ops: `npm run health:check` before sandbox smoke — **shipped 2026-07-26** (train #4)
8. Guide discoverability polish (print/email sources, FR smoke, Brand Kit link) — **shipped 2026-07-26** (train #5)
9. ~~Basecamp automatic check-ins + Hub unanswered widget~~ — **shipped 2026-07-26** (`checkins` HubModule)
10. ~~Comms stretch: printable seniority worksheet + right-to-refuse pocket card~~ — **shipped 2026-07-26** (Document Generator + QR Link Card presets)
11. ~~Discussions / Tasks stretch (reactions, @mentions, poll-on-focus)~~ — **shipped 2026-07-26** (no websockets; migration `0027_hub_social`)

## Comms external links (2026-07-30)

| Topic | Reality |
|-------|---------|
| Root cause | **Upstream** — reference tenant national union website reorganized; deep CMS URLs (e.g. `/12263`) retired — **not UnionOps regressions** |
| Registry | `src/lib/constants/comms-sources.ts` + `SourcesBlock` |
| Ticket | **`LINK-001` closed 2026-07-30** — registry + `/assets` + ZIP footers; optional lychee CI + `hub03` seed check remain |
| Multi-union | **`LINK-002` closed 2026-07-30** — `unionIds` filter on SourcesBlock/Resources/`/assets`; no casual third-party logo packs |
| Playbook + narrative | [`external-links-audit-plan.md`](external-links-audit-plan.md), [`session-knowledge-2026-07-30.md`](session-knowledge-2026-07-30.md), [`.cursor/rules/external-links.mdc`](../../.cursor/rules/external-links.mdc) |
| Verify | Browser-first for `opseu.org` (automated HEAD often 403) |
| Steward copy | `sources.intro` in EN/FR — use `/assets` mirrors when national links fail |

## Route status / Local 404 (2026-08-09)

| Topic | Reality |
|-------|---------|
| Stock “404 This page could not be found.” | Next default — root `not-found` + `global-error` kill it |
| Quips | Stable pathname hash; banks in `routeUi.quips` EN/FR |
| Portal | Own `not-found`/`error`/`loading` — not Hub, not public tools CTAs |
| Missing poll/RSVP/meeting | Call `notFound()` (HTTP 404); do not return 200 inline |
| Eggs | Quiet 243 footnote; snowmobile on 5× mark tap only |
| Narrative | [`session-knowledge-2026-08-09-local-404.md`](session-knowledge-2026-08-09-local-404.md) |

## Public workshop Comms (2026-08-08/09)

| Topic | Reality |
|-------|---------|
| Live demo order | Brand Kit → Board Notice → Graphic Maker → Captions |
| Facilitator | [`docs/guides/WORKSHOP_SOCIAL_COMMS.md`](../guides/WORKSHOP_SOCIAL_COMMS.md) Day-of section |
| Public outline | `/guide/workshop`; First week calendar on `/guide/social-media-plan` |
| UX contract | [`.cursor/rules/comms-public-ux.mdc`](../../.cursor/rules/comms-public-ux.mdc) |
| Smoke | `e2e/workshop.smoke.spec.ts` (`@smoke`, quote the tag in PowerShell) |
| Wednesday pitch | Demo-complete boards/print/social — Share Kit v0 is an orchestrator only (no one-click campaign OS / mass email) |
| Narrative | [`session-knowledge-2026-08-09-workshop-comms.md`](session-knowledge-2026-08-09-workshop-comms.md) |
| Flyer + unified chrome (2026-08-14) | Flyer Maker QOL v2; Share Kit `/tools/share-kit`; shell checklist — [`session-knowledge-2026-08-14-flyer-unified-tools.md`](session-knowledge-2026-08-14-flyer-unified-tools.md) |

## Agent habits

- Diff docs vs code before “implement next” — plan files and backlog tickets lag
- National citation URLs: edit `comms-sources.ts` only; follow `LINK-001` replace-vs-remove policy
- Bounded PRs; EN/FR + module spec + PROGRESS + rules in same milestone
- Grep access-helper call sites when signatures change
- Skip VISION non-goals (dues, member lists); skip Basecamp **Campfire / hill charts** greenfield — check-ins shipped
- Route status UX: extend `RouteStatusPanel` + `routeUi` — do not invent parallel 404 chrome
- Public workshop talk: follow Demo Path + `comms-public-ux.mdc`; Hub/Portal out of live demo; do not recreate `feat/comms-workshop-ux`
