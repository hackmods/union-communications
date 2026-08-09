# Local Portal

Authenticated collaboration surface for **rank-and-file members**, **stewards**, and **board/committee** people. Replaces paid generic PM tools (e.g. Basecamp) with solidarity-named, multi-org Circles under UnionOps.

**Slogan alignment:** Solidarity.  
**Route:** `/[locale]/portal/*`  
**Module flag:** `enabledModules.portal`  
**ADR:** ADR-017

## Surfaces

| Surface | Path | Audience | Data |
|---------|------|----------|------|
| Public Comms | `/tools`, guides | Anyone | On-device |
| Officer Hub | `/app/*` | Officers / stewards (confidential) | Grievance, bumping, time, QOL |
| **Local Portal** | `/portal/*` | Members, stewards, committees | Circles collaboration |

Grievance notes, bumping strategy, and confidential Hub casework are **never** shown in the Portal.

## Solidarity naming (required)

Do **not** ship Basecamp labels (Campfire, Hey!, Lineup, Hill Chart, etc.) in UI or i18n.

| Capability | Product name | FR (messages) |
|------------|--------------|---------------|
| Collaboration unit | **Circle** | Cercle |
| Default local Circle | **Hall** | Salle |
| Async threads | **Bulletin** | Babillard |
| Group chat | **Floor** | Plancher |
| Assigned work | **Actions** | Actions |
| Events | **Calendar** | Calendrier |
| Docs & files | **Binder** | Classeur |
| Personal home | **Station** | Poste |
| Notifications | **Dispatch** | Relais |
| Private 1:1 | **Sidebars** | Coulisses |
| Recurring questions | **Roll Call** | Appel |
| Kanban | **Pipeline** | Chaîne |
| Reports | **Oversight** | Bilan |
| Portfolio timeline | **Fronts** | Fronts |
| Progress narrative | **Momentum** | Élan |
| People on a Circle | **Roster** | Effectif |

Basecamp appears only in migration / parity docs, never as product copy.

## Multi-org membership

```
UserAccount
  └── LocalMembership[]   (unionId, localId, portalRole)
  └── CircleMembership[]  (circleId, role: viewer|member|admin)
Circle
  unionId, localId?
  kind: local_hall | committee | campaign | ad_hoc
  visibility: circle_only | local_members | invited
```

- One account may belong to **multiple locals and Circles**.
- Session: `activeLocalId` + optional `activeCircleId` (Hub local/collection switcher remains separate).
- No cross-union Circles. Cross-local only via explicit membership or elevated Hub admin roles.

## Feature inventory

### P0 — Shell
- Station landing, Circle list, Roster, create/invite (role-gated), context switcher

### P1 — Core 4
- Bulletin, Actions, Calendar, Binder + Station (my Actions + recent Bulletin)

### P2 — Near-full
- Floor, Dispatch, Roll Call, Pipeline, Oversight

### P3 — Near-full Basecamp alignment (memory)
- [x] Momentum, Sidebars, Fronts
- [x] Cross-Circle search, week digest, unread badges, Circle templates
- [x] Bulletin pin + comments, Calendar ICS, Roster invite
- [x] Deep-link search (`?tab=`), Roll Call create, Fronts date edit, Action assignee/due, Calendar datetime/location

### P4 — Experience polish (memory)
- [x] @mentions → Dispatch, soft-delete + audit, per-tool mute
- [x] Pipeline drag-and-drop, Basecamp CSV import, activity pack export
- [x] Keyboard shortcuts (1–0), Calendar external RSVP URL, guest banner
- [ ] Email→Bulletin, digest email, SSE Floor (see backlog)

## Future intent

Do not lose remaining design ideas — see:

- [`.cursor/rules/local-portal-backlog.mdc`](../../.cursor/rules/local-portal-backlog.mdc)
- [`.cursor/plans/local_portal_future.plan.md`](../../.cursor/plans/local_portal_future.plan.md)

## Testing

- Unit: `src/lib/portal/portal.test.ts`
- Smoke E2E: `e2e/portal.smoke.spec.ts` (`@smoke`) — auth redirect, member Station, Bulletin→Action, Calendar/Binder/Floor, Pipeline/Oversight, Dispatch, create Circle, FR Poste, axe on Station + Circle
- Gate: `npm run lint` · `npm run typecheck` · `npm run test:unit` · `npm run test:smoke`

## Access

- Portal does **not** require MFA (Hub confidential modules still do).
- Writes: Circle `member`+; admin actions: `circle_admin` or Hub `local_president` / `local_exec` / elevated.
- Rank-and-file role: `local_member` (portal + Hall; no grievance unless also steward).

## Non-goals

- National member ERP / dues / external portals
- Grievance notes in Portal
- Marketing email / analytics
- Slack-depth chat (Floor stays calm)
- Cross-union spaces

## Persistence

Memory adapter until Postgres + RLS (`unionId` / `localId` / `circleId`). Binder production path needs object storage + virus scan (Phase 7).

## Related

- [`docs/modules/CALENDAR_MEETINGS.md`](CALENDAR_MEETINGS.md) — meetings / RSVP (public token form stays non-portal)
- [`docs/RBAC.md`](../RBAC.md)
- [`.cursor/rules/local-portal.mdc`](../../.cursor/rules/local-portal.mdc)
