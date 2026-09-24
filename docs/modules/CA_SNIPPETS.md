# CA clause library (Hub)

Site-stored collective-agreement clauses for Officer Hub casework.
Public Comms `/tools/ca-snippets` remains an **on-device personal draft** and
stays free forever (ADR-019).

## Surfaces

| Path | Audience | Persistence |
|------|----------|-------------|
| `/app/snippets` | Hub officers | Server adapters (`SNIPPETS_DB_BACKEND`, default memory) |
| `/tools/ca-snippets` | Public Comms | `localStorage` draft only |

## Scoping

- Every row carries `unionId`. Optional `localId` / `bargainingUnitId`.
- Shipped reference packs (`libraryId` set, `createdById: system-seed`) are
  **union-wide** (`localId` null) so every local in the union can browse them.
- Custom imports may stamp the officer’s active local / collection.

## Reference packs

CSV packs under `seed/snippets/` registered in
`src/lib/snippets/libraries.ts`. Runtime reseed reads from
`process.cwd()/seed/snippets` (copied into the Docker runner).

Default library filter maps Hub collection codes via
`defaultLibraryForBargainingUnitCode` (includes Brand Kit `support` →
`caat-s-ft`).

## Setup flow

1. Union setup (`/app/onboarding`): pick Brand Kit **union preset** + optional
   **collection** → preferred library + idempotent reseed for OPSEU/CAAT.
2. Brand Kit (Hub `ApiAdapter`): changing active collection updates
   **preferred library only** — never wipes custom clauses.
3. Presidents / VPs (`local_exec`): **Load your CA** (CSV / Excel / text) with
   append or replace-union.
4. Union admins: **Restore shipped packs** (`POST /api/snippets/reset`).

## Future paid feature

Org-wide hosted CA library management is seeded as entitlement key
`ca_library_hosted` (`mayManageHostedCaLibrary`). When no entitlement rows
exist for a union, management stays open (demo hosts). Commercial gates can
be added later without paywalling public Comms.

## Flags

- `SNIPPETS_DB_BACKEND=memory|postgres`
- RLS via `withTenantRlsScope` / `withRlsContext` on list, create, bulk,
  reset, reseed, and by-id routes.
