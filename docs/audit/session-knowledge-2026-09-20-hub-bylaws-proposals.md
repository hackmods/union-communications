# Session: Hub bylaws + bargaining proposals casework (2026-09-20)

Shipped the in-progress governance branch to a working whole: Hub `/app/bylaws`
and `/app/proposals` casework, `/portal/proposals` member-safe publications, and
a "Send to Hub" sync path from the on-device tools.

## What shipped

- **Hub pages** — `/app/bylaws` (draft list, create, status workflow, generated
  preview) and `/app/proposals` (package list) + `/app/proposals/[id]`
  (rows editor, caucus note, activity timeline, publish/unpublish). Module
  registry + `hub` nav labels + B7P seed enable both modules.
- **API** — `/api/bylaws*`, `/api/proposals*` (packages / rows / events /
  publications), and member-safe `GET /api/portal/proposals`.
- **Persistence** — Drizzle adapters behind `BYLAWS_DB_BACKEND=postgres` /
  `PROPOSALS_DB_BACKEND=postgres`; memory is the demo default. Migration 0039 +
  RLS policies were already scaffolded; adapters were the missing half.
- **Portal** — `/portal/proposals` shows published snapshots only
  (headline + bullets + guide link, never counters/caucus notes/employer
  language). Portal nav link appears only when the union enables `proposals`.
- **Tools** — `HubDraftSyncPanel` on the Bylaw Builder and Proposal Tracker for
  signed-in officers (module enabled, write role, has a local). Proposal
  Tracker got a UI uplift: eyebrow, per-status summary chips, status badges,
  privacy note, and sync panel. Tools remain local-first.
- **What's new** — `hub-bylaws-proposals` hub-audience entry (EN/FR).

## Lessons

- **L1 — RLS route wrapping is required here.** The `rls-store` auto-scope keys
  are `list` / `create` / `importLocalSlice`; governance adapters use
  `listPackages` / `createPackage` / `upsertRow` etc., so `withTenantRlsScope`
  would pass through. Every route wraps store calls in
  `withRlsContext(rlsContextForSession(session) ?? {}, ...)` — memory is a
  pass-through, Postgres gets the `SET LOCAL` GUCs.
- **L2 — keep Hub copies as snapshots.** The public tools are the authoring
  surface ("stay on-device"); the Hub record is a shared copy whose lifecycle
  (status, publish) is managed on the Hub. Bylaw preview is regenerated from
  the stored `form` using the same builder lib, so the Hub never trusts a
  client-rendered text blob.
- **L3 — publications are the publish source of truth.** The package
  `published_summary` mirrors the latest non-archived publication; the Portal
  reads `proposal_publications` directly. Archiving a publication hides it from
  the Portal without extra bookkeeping.
- **L4 — PortalPanel titles are `<h2>`.** The member proposals page assertion
  needed `level: 2` (or no level), not `level: 1`.
- **L5 — public-tools gating shipped in the same branch** (site-admin
  enable/disable, `0038_public_tool_settings`, nav/sitemap filtering). It was
  already wired; a lint error in the settings form (`setState` in effect) was
  the only repair.

## Residual / next

- Postgres flip for bylaws/proposals on real hosts (`*_DB_BACKEND=postgres`).
- Assignee pickers / notifications on rows: the row has `assigneeIds` but the
  UI does not yet pick assignees.
- Status-change events are server-generated on package/row PATCH; comment
  events are explicit. No polling/websockets: the timeline is refreshed on
  reload/re-fetch (the practical "multi-user" path for a local committee).
- Consider a "pull a Proposal Tracker draft into an existing package" flow
  (rename instead of a new package) once duplicates appear in practice.

## Verification

`npx tsc --noEmit` clean; `npm run lint` clean (one pre-existing warning in
`src/lib/site-admin/demo-purge.ts`); full `vitest run` 317 files / 2004
passed / 1 skipped; `npm run build` green; new e2e
`e2e/hub.governance.smoke.spec.ts` 3/3 passing against the local dev server
(president creates bylaws draft + proposal package, publishes, member sees the
Portal snapshot).