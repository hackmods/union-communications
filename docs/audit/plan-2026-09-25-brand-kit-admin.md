# Plan — Detailed Brand Kit / theme admin (follow-on)

**Status:** Partial — theme editor + host-brand admin + baseline-from-Brand-Styles shipped 2026-09-25  
**Date:** 2026-09-25  
**Depends on:** [`session-knowledge-2026-09-25-union-brand-bridge.md`](session-knowledge-2026-09-25-union-brand-bridge.md) (v1 union ↔ preset binding shipped)  
**Shipped notes:** [`session-knowledge-2026-09-25-brand-theme-admin.md`](session-knowledge-2026-09-25-brand-theme-admin.md)

## Goal

Give platform operators a full Site Admin surface to configure per-union brand themes and instance host defaults without editing code or JSON files.

## Out of scope for the v1 binding (already shipped)

- Associating a Comms preset + slug with a Hub union (`/app/site-admin/brand-styles`)
- One-way Hub → Brand Kit public chrome seed / Match control
- JWT tenancy refresh after assign-local

## Shipped in theme-admin pass (2026-09-25)

| Capability | Notes |
|------------|--------|
| Per-union theme editor | Colours + canvas fonts on Brand Styles (`unions.brand_theme`) |
| Host-brand admin UI | Durable `platform_host_brand` overlay; env still wins |
| Rich baseline publish from Brand Styles | Draft/publish `brand:baseline` when customization is configured |

## Still deferred

| Capability | Notes |
|------------|--------|
| Logo assets in theme editor | Wire logo upload into baseline draft form |
| Sector / collection bindings UI | Productize `customization_preset_bindings` sector_id matrix + OPSEU sectors |
| Preset catalog admin | Add/edit Comms presets without code changes to `unionPresets.ts` |
| Auto-apply published baseline on Hub seed | Opt-in policy (never silent overwrite of steward kits) |

## Constraints

- Keep Comms on-device data sovereignty (Brand Kit localStorage) unless product explicitly opts into Hub `ApiAdapter`.
- Do not let theme admin write Hub membership / `users.unionId`.
- Customization MFA/env stack remains separate from lightweight brand binding unless operators enable full customization.
