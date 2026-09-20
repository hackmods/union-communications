# Module: Hub Bylaws & Bargaining Proposals

Officer Hub casework for local bylaws drafts and bargaining proposal packages,
with a member-safe snapshot surface on Local Portal. The public Comms tools
stay **on-device**; this module is the optional shared copy.

## Surfaces

| Surface | Route | What it does |
|---------|-------|--------------|
| Hub — Local Bylaws | `/app/bylaws` | List/sync bylaw drafts, status workflow (`draft` → `committee` → `pending_gmm` → `adopted` / `archived`), preview the generated text |
| Hub — Bargaining proposals | `/app/proposals` | Shared proposal packages: rows (article / current language / union proposal / employer counter), statuses, caucus note, activity timeline, publish to Portal |
| Hub — package detail | `/app/proposals/[id]` | Rows editor (writers), timeline + comments (writers), publish/unpublish panel (writers/publishers) |
| Portal — Proposals | `/portal/proposals` | Member-safe published snapshots: headline + bullets + optional guide link. **Never** counters, caucus notes, or employer language |
| Public tools | `/tools/bylaw-builder`, `/tools/proposal-tracker` | On-device authoring (localStorage); "Send to Hub" panel pushes a copy into casework when the officer is signed in |

## Server-sync contract (stay on-device)

The public tools remain local-first. `HubDraftSyncPanel` appears only for a
signed-in officer whose union has the module enabled, has write access, and has
a local. Sync POSTs the current on-device draft as a new Hub record:

- Bylaws → `POST /api/bylaws` with `{ title, mode, form }` where `form` is the
  `BylawFormValues` plus `articleSet` / `articleOverrides` / `committeeNotes` /
  `existingBylaws`.
- Proposals → `POST /api/proposals` with `{ name, roundLabel, rows }` using the
  tracker's row shape.

Editing stays on-device; the Hub copy is a snapshot. Status/lifecycle changes
happen on the Hub.

## Data model

- `bylaw_drafts` — title, status, mode, `form` jsonb (builder values), actor.
- `proposal_packages` — name, round label, status (`active`/`closed`/`archived`),
  confidential `caucus_note`, `published_at` + `published_summary` mirrors.
- `proposal_rows` — per-package rows: article, current language, union
  proposal, employer counter, status (same statuses as the public tracker),
  notes, sort order, assignees.
- `proposal_events` — activity timeline (`comment` / `status` / `system`) with
  author + optional `row_id`.
- `proposal_publications` — member-safe snapshots (headline, bullets, guide
  href); archived rows are hidden from Portal.

All tables carry `union_id`/`local_id` and RLS policies (migration
`0039_hub_bylaws_proposals.sql`). Elevating roles (`platform_admin`,
`union_admin`, `division_admin`) may list union-wide.

## Persistence

Memory adapters are the demo default; `BYLAWS_DB_BACKEND=postgres` and
`PROPOSALS_DB_BACKEND=postgres` switch to the Drizzle adapters once the
operator flips (see `docs/guides/POSTGRES_OPS.md`). Every API route wraps store
calls in `withRlsContext(rlsContextForSession(session), ...)` — route-level
wrapping is required because the adapter method names do not match the
`rls-store` `list`/`create` auto-scope keys.

## API

- `GET/POST /api/bylaws`, `GET/PATCH/DELETE /api/bylaws/[id]`
- `GET/POST /api/proposals`, `GET/PATCH/DELETE /api/proposals/[id]`
- `POST /api/proposals/[id]/rows`, `PATCH/DELETE /api/proposals/[id]/rows/[rowId]`
- `POST /api/proposals/[id]/events`
- `GET/POST /api/proposals/[id]/publications`, `PATCH /api/proposals/publications/[id]`
- `GET /api/portal/proposals` — member-safe published feed (Portal session, `proposals` module required)

## Access

`src/lib/hub-governance/access.ts` — read for all officer roles; write for
president/exec/union-admin/platform-admin/solo. Writers may also publish unless
a future role splits publisher duties. Portal members only ever read
publications.

## Copy guards

`hubBylaws`, `hubProposals`, `hubDraftSync`, `portalProposals` are Hub
namespaces swept by the copy-style tests. No national union names. Error
strings carry a remedy ("Try again." / "Réessayez.").