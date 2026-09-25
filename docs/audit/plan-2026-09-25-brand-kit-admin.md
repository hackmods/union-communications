# Plan — Detailed Brand Kit / theme admin (follow-on)

**Status:** Deferred — scoping only  
**Date:** 2026-09-25  
**Depends on:** [`session-knowledge-2026-09-25-union-brand-bridge.md`](session-knowledge-2026-09-25-union-brand-bridge.md) (v1 union ↔ preset binding shipped)

## Goal

Give platform operators a full Site Admin surface to configure per-union brand themes and instance host defaults without editing code or JSON files.

## Out of scope for the v1 binding (already shipped)

- Associating a Comms preset + slug with a Hub union (`/app/site-admin/brand-styles`)
- One-way Hub → Brand Kit public chrome seed / Match control
- JWT tenancy refresh after assign-local

## Capabilities to build later

| Capability | Notes |
|------------|--------|
| Per-union theme editor | Colours, fonts, logo assets, canvas defaults — beyond today’s `brand:baseline` colours/fonts |
| Host-brand admin UI | Edit instance defaults currently in `config/host-brand.json` / `NEXT_PUBLIC_BRAND_*` |
| Sector / collection bindings UI | Productize `customization_preset_bindings` sector_id matrix + OPSEU sectors |
| Rich baseline publish from Brand Styles page | Draft/preview/publish `brand:baseline` without leaving the union brand screen; logo upload wired into draft form |
| Preset catalog admin | Add/edit Comms presets without code changes to `unionPresets.ts` |
| Auto-apply published baseline on Hub seed | Opt-in policy (never silent overwrite of steward kits) |

## Constraints

- Keep Comms on-device data sovereignty (Brand Kit localStorage) unless product explicitly opts into Hub `ApiAdapter`.
- Do not let theme admin write Hub membership / `users.unionId`.
- Customization MFA/env stack remains separate from lightweight brand binding unless operators enable full customization.
