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
| Sector / collection bindings UI | **Shipped 2026-10-02** — `/api/site-admin/preset-bindings` + memory store wired into empty-Local seed |
| Preset catalog admin | **Shipped 2026-10-02** — durable `comms_preset_catalog` + `/api/site-admin/comms-presets`; `UNION_PRESETS` remains compiled fallback |
| Auto-apply published baseline on Hub seed | **Narrowed 2026-10-02** — opt-in `BRAND_BASELINE_AUTO_SEED` for **empty Local only**; Match/Apply remain for existing kits |

## Shipped after theme-admin (2026-09-30)

| Capability | Notes |
|------------|--------|
| Logo assets in Brand Styles → baseline | Upload PNG/JPEG/WebP via customization assets; `logoAssetId` on draft/publish |

## Constraints

- Keep Comms on-device data sovereignty (Brand Kit localStorage) unless product explicitly opts into Hub `ApiAdapter`.
- Do not let theme admin write Hub membership / `users.unionId`.
- Customization MFA/env stack remains separate from lightweight brand binding unless operators enable full customization.
