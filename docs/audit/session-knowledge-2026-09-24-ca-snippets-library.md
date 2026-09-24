# Session knowledge — Hub CA clause library (2026-09-24)

## Problem

`/app/snippets` showed empty libraries and “Could not reset” for non-demo /
Postgres hosts. UI read as a local import tool, not a site-stored catalog.

## Root causes

1. Memory adapter only seeded `union-b7p` at process start.
2. Postgres `resetUnion` / `reseedReferencePacks` / `bulkCreate` were outside
   `withTenantRlsScope` (`SCOPE_ARG`), so RLS blocked mutations.
3. Docker runner omitted `seed/snippets/`, so reseed restored 0 rows.
4. Generic UI error hid 403 MFA / role / 500 distinctions.

## Fixes shipped

- Extend RLS scope for string `unionId` methods + route-level `withRlsContext`.
- Copy `seed/snippets` into runner; warn when packs missing.
- `ensureReferencePacksIfEmpty` on GET list; idempotent memory reseed.
- Preferred library store; Brand Kit PUT syncs preference only.
- Onboarding: union preset + collection → codes + seed for OPSEU.
- Catalog-first `SnippetLibrary` + Excel via exceljs; `local_exec` may replace.
- Entitlement key `ca_library_hosted` (open when unconfigured).

## Do not

- Conflate Brand Kit `unionPresetId` with Hub tenant `unionId`.
- Call `resetUnion` on Brand Kit collection change.
- Paywall public `/tools/ca-snippets`.
