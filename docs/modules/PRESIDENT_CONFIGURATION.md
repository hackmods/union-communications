# President Configuration & dual-shell navigation

Union presidents need a calm daily cockpit: Officer Hub for confidential
executive work, Local Portal for members — both reachable as peers, not buried
in account chrome.

## Updated navigation map

```
Public header (signed-in)
├── Start
├── Brand Kit
├── Create
├── Learn
├── Officer Hub          → /app          (peer)
├── Local Portal         → /portal       (peer; module + role gated)
└── Account (profile / sign out)

Officer Hub chrome (/app/*)
├── Home
├── Officer tools ▾
│   ├── Casework | Records | Funds | Admin
│   └── Admin includes: Invites, Union setup, **President configuration**
└── Enabled Hub modules (grievance, discussions, …) — portal omitted here

Local Portal chrome (/portal/*)
├── Together
├── Circles ▾
└── Surfaces from president Portal list (Dispatch, Hold the line, …)
```

Local Portal is **not** listed again under Officer Hub top-level modules (same
reason Comms is omitted — the site header already elevates it).

## Officer Hub vs Local Portal module matrix

### Officer Hub (`enabledModules`) — new-local / overlay defaults

| Module | Default | Tier | Notes |
|--------|---------|------|-------|
| Comms toolbox | **On** | Executive | Public Brand Kit / tools |
| Grievance overview | **On** | Executive | Case list & deadlines |
| Executive communications (Discussions) | **On** | Executive | Board / case threads |
| Local bylaws | **On** | Executive | Revision drafts |
| Bargaining proposals | **On** | Executive | Shared proposal rows |
| Local Portal | **On** | Executive | Member shell gate |
| Workforce Time (+ scheduling / shifts) | **Off** | Operational | Opt-in when local runs time |
| Stability / bumping | **Off** | Operational | |
| Tasks | **Off** | Operational | |
| Steward Quick-Log | **Off** | Operational | |
| Check-ins | **Off** | Operational | |
| UnionOps Data | **Off** | Operational | Union/platform admin + Postgres |

### Always on for presidents (role tools, not module flags)

| Surface | Path | Default |
|---------|------|---------|
| Local financial summaries (Ledger) | `/app/ledger` | Available by role |
| Expenses | `/app/expenses` | Available by role |
| Invites | `/app/invites` | Available by role |
| Meetings & RSVP | `/app/meetings` | Available by role |

### Local Portal surfaces (dedicated list)

| Surface | Portal nav | Default | Hub dependency |
|---------|------------|---------|----------------|
| Member announcements | Dispatch | **On** | Portal on |
| Local news & campaigns | Hold the line | **On** | Portal on |
| Voting / elections feed | Proposals | **On** | `proposals` module |
| Community discussions | Together + Circles | **On** (locked) | Portal on |
| My cases | My cases | **On** | `grievance` module |
| Sidebars | Sidebars | **On** | Portal on |
| Send feedback | Feedback | **On** | Portal on |

## UX recommendations (implemented)

1. **Two peer destinations** in the main menu — Hub and Portal share equal visual weight in the public header.
2. **Grouped toggles** on `/app/configuration` — executive (default on) vs operational (default off) with clear badges.
3. **Separate Portal list** so member chrome is not mixed into confidential Hub modules.
4. **Workflow tip** on the page: modules → union setup → invites; soft-launch setup card links Configuration first.
5. **Instant save** per toggle with consequence + remedy copy on failure.
6. **Data stays locked** for presidents — elevates only with union/platform admin after durable Postgres.

## Implementation map

| Concern | Path |
|---------|------|
| Catalog + defaults | `src/lib/president/module-catalog.ts` |
| Portal surface store | `src/lib/tenant/portal-surfaces.ts` |
| Overlay defaults | `DEFAULT_OVERLAY_MODULES` in `src/lib/tenant/overlay.ts` |
| API | `POST /api/tenant` `set_modules` / `set_portal_surfaces` |
| UI | `src/components/hub/PresidentConfiguration.tsx` → `/app/configuration` |
| Nav peers | `LocalPortalNavLink` + `OfficerHubNavLink` in Header / MobileNavDrawer |

## Related

- [`LOCAL_PORTAL.md`](./LOCAL_PORTAL.md)
- Soft-launch: `docs/audit/session-knowledge-2026-08-19-president-soft-launch.md`
- Access: `canManageLocalModules` in `src/lib/tenant/access.ts`
