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

**Cost (ADR-019):** Public Comms stay free. If UnionOps hosts Local Portal or Officer Hub for a local, that hosting has a cost. Self-host remains an option.

## Solidarity naming (required)

Product language is **solidarity memes and names**, not a Basecamp parody and not a shop-floor glossary. Similar jobs (discussions, to-dos, files) are fine. Matching Basecamp’s naming system is not.

Do **not** ship Basecamp labels (Campfire, Hey!, Lineup, Hill Chart, Card Table, Check-in as product titles) in UI or i18n.

**Test:** would a member who has never used Basecamp feel the slogan? Keep Circle / Hall / Floor / Bulletin / Binder / Sidebars / Roll Call / Dispatch / Roster. Prefer we/us/ours chants over locker/shop/bargaining-table puns.

| Capability | Product name | FR (messages) |
|------------|--------------|---------------|
| Collaboration unit | **Circle** | Cercle |
| Default local Circle | **Hall** | Salle |
| Async threads | **Bulletin** | Babillard |
| Group chat | **Floor** | Plancher |
| Assigned work | **Actions** | Actions |
| Events | **Calendar** | Calendrier |
| Docs & files | **Binder** | Classeur |
| Personal home | **Together** | Ensemble |
| Notifications | **Dispatch** | Relais |
| Private 1:1 | **Sidebars** | Coulisses |
| Recurring questions | **Roll Call** | Appel |
| Shared card wall | **Many hands** | Plusieurs mains |
| Reports | **Oversight** | Bilan |
| Live Circles | **Hold the line** | Tenir la ligne |
| Campaign progress | **One fight** | Un seul combat |
| People on a Circle | **Roster** | Effectif |

Implementation keys and routes may keep older slugs (`station`, `fronts`, `momentum`, `pipeline`, `/portal/fronts`, `?tab=momentum`) so bookmarks stay stable. **Labels** are what members see.

French must carry the same *job*, not the same joke. Do not restore Station / Fronts / Momentum / Pipeline **or** Locker / On the table / The push / Shop board as UI titles.

Basecamp appears only in migration / parity docs and the CSV importer, never as product chrome.

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
- Together landing (`/portal`), Circle list, Roster, create/invite (role-gated)
- PortalNav + Hub-style drawer (Together, Circles, Dispatch, Hold the line, Sidebars, send-feedback; Officer Hub for officers)
- Public Header keeps Guides / Tools; account cluster highlights Local Portal on `/portal`

### P1 — Core 4
- Bulletin, Actions, Calendar, Binder + Together (my Actions + recent Bulletin)

### P2 — Near-full
- Floor, Dispatch, Roll Call, Many hands, Oversight

### P3 — Near-full collaboration surface (memory)
- [x] One fight, Sidebars, Hold the line
- [x] Cross-Circle search, week digest, unread badges, Circle templates
- [x] Bulletin pin + comments, Calendar ICS, Roster invite
- [x] Deep-link search (`?tab=`), Roll Call create, Hold-the-line date edit, Action assignee/due, Calendar datetime/location

### P4 — Experience polish (memory)
- [x] @mentions → Dispatch, soft-delete + audit, per-tool mute
- [x] Many hands drag-and-drop, Basecamp CSV import, activity pack export
- [x] Keyboard shortcuts (1–0), Calendar external RSVP URL, guest banner
- [x] Rank-and-file home is Together; `/app` dashboard redirects members to Portal when the module is on
- [x] Circle tabs keep `?tab=` on refresh/share; Dispatch pings open the matching tool
- [x] Together opens on Hall work (not an empty search); demo seed is current-week; Hall hides empty committee tools
- [ ] Email→Bulletin, digest email, SSE Floor (see backlog)

## Future intent

Do not lose remaining design ideas — see:

- [`.cursor/rules/local-portal-backlog.mdc`](../../.cursor/rules/local-portal-backlog.mdc)
- [`.cursor/plans/local_portal_future.plan.md`](../../.cursor/plans/local_portal_future.plan.md)

## Testing

- Unit: `src/lib/portal/portal.test.ts`
- Smoke E2E: `e2e/portal.smoke.spec.ts` (`@smoke`) — auth redirect, member Together, Bulletin→Action, Calendar/Binder/Floor, Many hands/Oversight, Dispatch, create Circle, FR Ensemble, axe on Together + Circle
- Gate: `npm run lint` · `npm run typecheck` · `npm run test:unit` · `npm run test:smoke`

## Access

- Portal does **not** require MFA (Hub confidential modules still do).
- Rank-and-file (`local_member` only) land on Together after sign-in. Visiting `/app` as a member redirects to `/portal` when the module is enabled. Officers and stewards still home to Officer Hub.
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
