# Session knowledge — Union lifecycle (archive / rename / empty delete)

**Audience:** future agents + Ryan.
**Companions:** [`session-knowledge-2026-09-17-site-admin.md`](session-knowledge-2026-09-17-site-admin.md), [`src/lib/site-admin/union-lifecycle.ts`](../../src/lib/site-admin/union-lifecycle.ts).

## Problem

President configuration’s “Union to configure” list came from every tenant seed with no archive filter and no remove action. Accidental creates (same display name, different `union.id`) cluttered the picker. Schema already had `unions.archived_at` from migration `0035`; only locals had archive/restore APIs.

## Shipped

- **Site Admin → Unions** (`/app/site-admin/unions`): rename, soft-archive, restore, hard-delete when empty + already archived (typed slug confirm + MFA step-up when host policy requires it).
- APIs: `POST .../unions/[id]/archive|restore`, extended `PATCH .../unions/[id]` (`name` and/or `membershipPolicy`), `DELETE .../unions/[id]` with `{ confirm: slug }`.
- Runtime overlay omits archived unions on hydrate; archive removes the overlay seed; restore re-imports it.
- Pickers (`GET /api/tenant`, brand-styles, customization) use active unions only; President config shows `name (slug)`.
- `createUnionDurable` reuses an active union with the same case-insensitive display name (covers onboarding, invites, site-admin create, access-request create).

## Do not

- Put delete controls on President configuration (picker only).
- Cascade-delete production casework from this surface — use Demo cleanup for `is_demo`.
- Trust display name alone when cleaning duplicates — use id/slug/createdAt.

## Cleanup of live duplicates

1. Open Site Admin → Unions.
2. Archive unused same-name rows → they leave President configuration.
3. If counts show empty, Delete with typed slug.
4. If `is_demo` with casework, use Demo cleanup instead.
