# Session knowledge — Union brand default bridge (2026-09-25)

## Verdict

Hub `users.unionId` stays invite/operator-owned. Comms Brand Kit / `unionPresetId` drives **public** chrome. Platform admin can bind a Comms preset to a Hub union. JWT tenancy refreshes when `sessionVersion` advances.

## Do not

- Let Brand Kit write Hub `users.unionId`.
- Conflate Brand Kit `unionPresetId` with Hub tenant `unionId` (see also CA snippets session knowledge).
- Imply empty Brand Kit preset = OPSEU (empty is neutral; OPSEU sources only when preset is `opseu`).

## Shipped

| Piece | Where |
|-------|--------|
| Bridge helper | `src/lib/brand/union-preset-bridge.ts` — binding → seed `commsPresetId` → trusted slug |
| Durable binding | `unions.comms_preset_id` (migration `0060_union_comms_preset`) + overlay patch |
| Site admin UI | `/app/site-admin/brand-styles` — slug + Comms preset per union |
| Hub → Brand Kit seed | `HubBrandKitSeed` when no stored kit; Match control on Brand Kit |
| Host default preset | Optional `host-brand.json` / `NEXT_PUBLIC_BRAND_UNION_PRESET` (no admin UI) |
| Empty-preset neutrality | `sourceMatchesUnion` / `isReferenceAssetPackVisible` |
| JWT refresh | `refreshJwtTenancyIfStale` in Auth.js jwt callback |

## Follow-on

Detailed Brand Kit / theme admin (colours, host-brand UI, sector matrix, rich baselines, code-free presets): [`plan-2026-09-25-brand-kit-admin.md`](plan-2026-09-25-brand-kit-admin.md).
