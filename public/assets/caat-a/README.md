# CAAT-A identity pack assets

Source: reconstructed College Faculty bilingual lockups for UnionOps
(official OPSEU mark tinted to faculty red + outlined type).

| File | Use |
|------|-----|
| `logo-lockup-color.svg` | Colour lockup (transparent) — Brand Kit Look + Brand Assets download |
| `logo-lockup-on-primary-knockout.svg` | White lockup on faculty red plate (`#B22E2C`) — Brand Assets download |
| `logo-lockup-on-coalition.svg` | White lockup on OPSEU blue (`#003DA5`) — joint bargaining plate |
| `logo-lockup-reverse.svg` | White lockup on near-black (`#231F20`) |
| `logo-lockup-one-color.svg` | Tight faculty-red strip — Brand Kit letterhead only (not a Brand Assets card) |
| `logo-lockup-on-primary.svg` | Same job as knockout; kept as source, not listed on Brand Assets |

Brand tokens from the art: primary `#B22E2C` (stacked-plate field),
accent `#003DA5` (OPSEU blue coalition tie-in). Coalition Look uses white
accent so canvas type stays knockout-white.

SVGs are clean reconstructions (official mark PNG + outlined Arial Black
wordmarks) — not path-traces of the low-res faculty rasters. Rebuild with
`node scripts/build-caat-a-lockups.mjs` (needs `opentype.js` + a local bold
sans). Replace with vector EPS exports when faculty art lands — keep
viewBoxes tight so Look cards stay aligned.

Reference rasters (`logo-lockup-*.png`) stay for comparison only; Brand Kit
reads the SVGs.
