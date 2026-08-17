# Session knowledge — Brand Kit collection profiles (2026-08-17)

**Audience:** future agents + Ryan.  
**Rule:** [`.cursor/rules/brand-kit-collections.mdc`](../../.cursor/rules/brand-kit-collections.mdc) (defaults + source URLs).  
**Companions:** [`session-knowledge-2026-07-30-multi-union-sources.md`](session-knowledge-2026-07-30-multi-union-sources.md), ADR-013 Collection / BargainingUnit, [`seed/reference-tenant-opseu-caat.json`](../../seed/reference-tenant-opseu-caat.json).

---

## What happened

Brand Kit v2 shipped two **CAAT Support** profiles (`Full-time Support Staff` / `Part-time Support Staff`) on `DEFAULT_BRAND_KIT`. Applying CUPE, Unifor, or any other preset did **not** replace them. The switcher hint assumed every steward had FT/PT identities.

Ryan’s direction: support **all** unions. Locals and areas break out differently. Collection profiles should exist as a capability for everyone; only OPSEU CAAT Support should *default* to two.

---

## Decisions

1. **Fresh kit = one Local profile.** No CAAT language until the OPSEU preset is applied.
2. **OPSEU preset = College Support Full-time + College Support Part-time** (`ft` / `pt`). Labels match official OPSEU sector names, not a claim that every OPSEU local is college support.
3. **Every other preset = one Local profile.** Stewards add collections for extra units/workplaces.
4. **Preset application replaces `profiles` + `activeProfileId` + local collection fields** (same hygiene as membership URLs).
5. **In-app add/remove/rename.** JSON import is not enough for amalgamated locals.
6. **Do not migrate existing localStorage kits.** Re-apply a preset or Reset to pick up new defaults.
7. **Hub seed names stay** `Full-time Support Staff` / `Part-time Support Staff` (CA / grievance copy). Brand Kit labels can be the public sector names.

---

## Why these default labels

| Label | Why |
|---|---|
| **Local** | Safe across CUPE, Unifor, USW, ONA, PSAC, Other. Does not imply FT/PT, a hospital, or a classification group. Switcher stays hidden until a second collection exists. |
| **College Support Full-time / Part-time** | OPSEU.org sector titles (CAAT-S FT / CAAT-S PT). More precise than “Support Staff” and matches the reference tenant, not OPS/hospital/academic. |
| Not “Bargaining unit” as the generic default | Accurate for ONA/Unifor amalgamated locals, misleading for a single-unit CUPE local. Stewards can rename. |
| Not “Members” | Too vague for a switcher list. |
| Not “Collection” as the stored label | Collection is the *product* word for the control; Local is the identity the graphic speaks as. |

---

## Sourced matrix (research pass)

Full URL list lives in the cursor rule. Short form:

| Union | Typical breakout | Brand Kit default | Add-more examples |
|---|---|---|---|
| **OPSEU CAAT Support** | Statute-split FT + PT; 24-hour rule | 2 (College Support FT/PT) | Academic FT, Academic PT/Sessional, hospital, OPS Unified, Correctional |
| **OPSEU other sectors** | Usually one unit per local; 17 sectors | *(if they picked OPSEU preset they still get CAAT Support — rename/remove)* | Sector/employer name |
| **CUPE** | 1 unit, FT+PT, or many job-family units | 1 Local | Inside workers, outside workers, library, child-care site |
| **Unifor** | Single-unit or amalgamated (2+ units) | 1 Local | Plant / workplace unit name |
| **USW** | Local + units (each may have its own CA) | 1 Local | Staff-appointed, casual, campus unit |
| **ONA** | Local = 1+ employer BUs; central + local CA | 1 Local | Hospital site, LTC home |
| **PSAC** | Local / component; TB PA·TC·EB·SV etc. | 1 Local | PA, CRA, workplace |

---

## Code shipped

- [`src/lib/brand/collection-profiles.ts`](../../src/lib/brand/collection-profiles.ts) — defaults, normalize, add/remove/rename, sync active → local
- [`CollectionProfilesEditor.tsx`](../../src/components/brand/CollectionProfilesEditor.tsx) — Brand Kit UI
- `brandFieldsFromUnionPreset(preset, { localNumber })` now writes collection fields
- `setBrandKit` syncs the active profile when Local number / sub-text / code change
- Legacy kits without `profiles`: OPSEU → CAAT Support FT/PT on read; others → one Local; explicit `profiles: []` hides collections
- Hub `ApiAdapter` normalizes on GET/PUT (parity with localStorage)

---

## Residual gaps

- No OPSEU *sector* picker (CAAT Academic / OPS / hospital). OPSEU preset still means CAAT Support until we add that.
- No Hub-onboarding bridge that seeds Brand Kit profiles from tenant `bargainingUnits`.
- Stored profile labels are English data (same as before). Chrome is EN/FR.
- Membership URL audiences remain `full_time` / `part_time` / `all` — fine for CAAT Support; other unions use `all` or custom links.
