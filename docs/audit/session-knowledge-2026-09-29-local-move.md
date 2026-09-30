# Session knowledge — Site Admin Move Local (in-place)

**Audience:** future agents + Ryan.  
**Date:** 2026-09-29 (implemented 2026-09-30).

## Product

Site Admin can **move a local to another union** while keeping `locals.id`
stable. Accounts, memberships, invites, collections, and dual-key casework
follow automatically — no per-account hand-holding for setup mistakes.

Canonical UI: Organization structure → Open structure → **Move** on a local row
([`MoveLocalPanel`](../../src/components/site-admin/MoveLocalPanel.tsx) via
[`LocalLifecycleActions`](../../src/components/site-admin/LocalLifecycleActions.tsx)).

## Contract

| Rule | Behavior |
|------|----------|
| Keep `local_id` | Stable FKs |
| Rewrite `union_id` | Allowlisted dual-key tables + portal circle children + customization scope children |
| Collective | Clear or remap to a **destination** collective |
| Storage keys | Leave opaque; auth follows updated meta |
| Audit history | Append-only — `site_admin.local.move` / `move_preview` |
| Postgres + owner DB | Required (`MIGRATE_DATABASE_URL`) |
| Fresh MFA | Required for preview and commit |

## APIs

- `POST /api/site-admin/locals/[id]/move/preview` — MFA, impact + blocks + warnings
- `POST /api/site-admin/locals/[id]/move` — MFA, typed confirm, dual-phase audit, execute

Engine: [`src/lib/site-admin/local-move.ts`](../../src/lib/site-admin/local-move.ts)  
Registry: [`src/lib/site-admin/local-move-registry.ts`](../../src/lib/site-admin/local-move-registry.ts)  
Completeness test fails CI if a Drizzle dual-key table is missing from the
allowlist or `LOCAL_MOVE_EXCLUDED_TABLES`.

## Hard blocks

Same union / destination archived / number taken / demo mismatch (unless
acked) / data identifier collision / officer-learning collision /
`single_local` conflict (unless end-other flag) / missing owner DB.

## Escape hatch

When preview hard-blocks, UI links to create a local under the destination
(`#organization-create-local`) and points operators at Assign local for
manual re-home — option 3 only when in-place cannot run.

## Do not

- Rewrite historical `audit_log` rows or object-storage path strings
- Move union-level Brand Styles / entitlements with the local
- Cascade-delete casework
- Attempt move on memory backend
