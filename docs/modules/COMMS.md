# Comms Module

## Status: v1 Shipped

Public-facing social media toolbox. Static export, client-side image generation.

## Routes

| Route | Description |
|-------|-------------|
| `/[locale]/` | Landing |
| `/[locale]/onboarding` | Brand setup wizard |
| `/[locale]/brand-kit` | Export/import branding JSON |
| `/[locale]/guide` | The Blueprint handbook |
| `/[locale]/guide/crisis` | Crisis comms playbook |
| `/[locale]/examples` | Notice Board gallery |
| `/[locale]/captions` | Caption & hashtag library |
| `/[locale]/assets` | Union asset pack (CAAT OPSEU reference) |
| `/[locale]/tools/*` | Six image generation tools |

## Multi-Union Migration Checklist (Phase 1)

- [ ] Replace hardcoded "OPSEU" / "CAAT" strings with `UnionConfig.name`
- [ ] Move `CAAT_OPSEU_COLORS` to per-union `brandDefaults`
- [ ] Rename asset pack to `UnionAssetPack` pattern; CAAT pack = reference seed
- [ ] Extend Brand Kit schema v2: `unionId`, `unionName`, `divisionName`
- [x] Default local number fallback via `resolveLocalNumber()` (easter egg: 243)
- [ ] Platform-neutral metadata titles in `messages/*.json`

## Public vs Authenticated

v1: all public. Phase 1+: optional premium templates behind login; core tools stay public.

## Key Components

- `src/lib/export/image-export.ts` — PNG/SVG/ZIP export
- `src/components/tools/*` — upload, contrast, consent, undo/redo
- `src/store/brand-store.ts` — brand state via DataAdapter
