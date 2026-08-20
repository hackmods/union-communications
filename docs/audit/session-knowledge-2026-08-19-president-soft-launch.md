# Session knowledge — President soft launch (2026-08-19)

**Audience:** future agents + Ryan.  
**Companions:** [`session-knowledge-2026-08-18-multi-union-hub-signup.md`](session-knowledge-2026-08-18-multi-union-hub-signup.md), [`docs/guides/SETUP.md`](../guides/SETUP.md) (president soft-launch flags), [`docs/guides/POSTGRES_OPS.md`](../guides/POSTGRES_OPS.md).

## What shipped

Operator (platform admin) emails a local president **before** Officer Hub is advertised nationally (`NEXT_PUBLIC_OFFICER_HUB_PUBLIC=false`). The president sets up the local + Hall, then invites officers and members. Login and `/app/invite/[token]` stay reachable. No public `/app/register`.

## First-run QOL (same day)

- Hub/Portal layouts hydrate Postgres overlay; dashboard/nav use live tenant + **session `localId`**, not seed Local 243.
- President accept CTA signs in with `?next=/app/onboarding` (allowlisted). Later logins still go to `/app`. Unadvertised Hub shows a dashboard **Set up your local** card.
- Pending invites expose copy/resend to managers; president form can add a first collection.
- Together / Create Hall rebuilds Hall membership from demo roster (when on), in-process invitees, and durable `users` rows so the Hall is not empty after restart.

## Durable tenants

`create_local` / `create_collection` / `create_union` write Postgres `unions` / `locals` / `bargaining_units` when `DATABASE_URL` is set ([`src/lib/tenant/persist.ts`](../../src/lib/tenant/persist.ts)). The loader still reads static seed + overlay; overlay is hydrated from those tables once per process. Overlay-only remains the fallback without Postgres.

## Invites

- Role ladder is server-enforced ([`src/lib/tenant/access.ts`](../../src/lib/tenant/access.ts)): presidents cannot invite `union_admin` / `division_admin`.
- `local_member` is an invite role — they land on Local Portal, not Hub casework.
- Elevated users pick a local (or enter a local number to find-or-create) instead of inheriting Local 243 from the platform-admin seed.
- `GET /api/invites` lists pending invites scoped by union (presidents: their local only).

## Hall

Portal Bulletin/Floor stay memory. Hall for any local is `ensureHall` + auto-join on Together load, invite accept, and `/api/portal/hall/ensure`. Seeded Local 243 keeps `circle-hall-243`; new locals use `circle-hall-${localId}`.

## Do not

- Advertise Hub on Home just because presidents are invited.
- Treat overlay-only locals as durable when `DATABASE_URL` is unset.
- Rebuild a public Hub register page.
