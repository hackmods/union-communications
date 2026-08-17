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
3. **CUPE / Unifor / USW / ONA / PSAC presets** load starter lists from the catalog (each ends with **Other**). **Other / unset** = one **Local** profile.
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

| Union | Starter profiles | Reference (homepage only) |
|---|---|---|
| **CUPE** | Full-time, Part-time, All-employee, Other | [cupe.ca](https://cupe.ca) |
| **Unifor** | Bargaining unit, Additional bargaining unit, Other | [unifor.org](https://www.unifor.org) |
| **USW** | Unit, Additional unit, Other | [usw.ca](https://usw.ca) |
| **ONA** | Bargaining unit, Additional bargaining unit, Other | [ona.org](https://ona.org) |
| **PSAC** | PA, TC, EB, SV, Other | [psacunion.ca](https://psacunion.ca) |
| **OPSEU CAAT Support** | College Support Full-time, College Support Part-time | [opseu.org](https://opseu.org) |
| **Other / unset** | Local | — |

Catalog: [`src/lib/brand/collection-profile-catalog.ts`](../../src/lib/brand/collection-profile-catalog.ts). URLs are for docs/agents — not stored in Brand Kit.

---

## Code shipped

- [`src/lib/brand/collection-profile-catalog.ts`](../../src/lib/brand/collection-profile-catalog.ts) — per-union starter lists + homepage references
- [`src/lib/brand/collection-profiles.ts`](../../src/lib/brand/collection-profiles.ts) — defaults, normalize, add/remove/rename, sync active → local
- [`CollectionProfilesEditor.tsx`](../../src/components/brand/CollectionProfilesEditor.tsx) — Brand Kit UI
- `brandFieldsFromUnionPreset(preset, { localNumber })` now writes collection fields
- Legacy kits without `profiles`: OPSEU → CAAT Support FT/PT on read; catalog presets → starter list; others → one Local; explicit `profiles: []` hides collections
- Hub `ApiAdapter` normalizes on GET/PUT (parity with localStorage)
- `setBrandKit` syncs **local number to all profiles**; sub-text/code follow the **active** collection
- Onboarding step 1 surfaces `CollectionProfilesEditor` when a preset ships starter collections; sub-text field hidden when multi-profile
- Preset-specific hints under `brandKit.profilePresetHint.*` (EN/FR); generalized membership URL copy

---

## QOL pass (2026-08-17 evening)

- Preset-specific collection hints (CUPE FT/PT/all-employee, PSAC PA/TC/EB/SV, etc.)
- Starter note: remove collections you do not use; rename **Other**
- Local number syncs to every profile on save (fixes onboarding only updating active row)
- Renaming the active collection updates sub-text for graphics
- Brand Kit union preset card notes when starter collections load

---

## Residual gaps

- No OPSEU *sector* picker (CAAT Academic / OPS / hospital). OPSEU preset still means CAAT Support until we add that.
- No Hub-onboarding bridge that seeds Brand Kit profiles from tenant `bargainingUnits`.
- Stored profile labels are English data (same as before). Chrome is EN/FR.
- Membership URL audiences remain `full_time` / `part_time` / `all` — fine for CAAT Support; other unions use `all` or custom links.
