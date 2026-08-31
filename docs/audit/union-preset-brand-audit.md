# Union preset brand audit (2026-08-28)

**Scope:** `src/lib/constants/unionPresets.ts` starter colours, slogans, and canvas font defaults.  
**Not in scope:** Bundled official logos (OPSEU reference pack only), Hub bargaining-unit tenancy.

UnionOps presets are **workshop starters**, not trademarked national assets. Values below are the best verified match to public brand sources as of this audit.

---

## Colour verdict

| Preset | Primary | Secondary | Accent | Source / note |
|---|---|---|---|---|
| **OPSEU / SEFPO** | `#003DA5` | `#FFFFFF` | `#002868` | Pantone 285 (OPSEU graphics pack); reference tenant seed |
| **CUPE** | `#AF0061` | `#FFFFFF` | derived | `cupe.ca` / `scfp.ca` Drupal theme logo SVG (`themes/custom/cupe/logo.svg`) |
| **Unifor** | `#C31A1A` | `#FFFFFF` | `#005EB8` | [Identity Guidelines PDF (2023)](https://www.unifor.org/sites/default/files/documents/20230330-Identity-Guidelines.pdf) |
| **USW** | `#002C65` | `#FFC03F` | derived | PMS 294U navy (approx.; matches [usw.ca](https://usw.ca) theme `#002C65`) + PMS 122U gold (`#FFC03F` approx.) |
| **ONA** | `#003865` | `#FFD100` | derived | Pre-2023 palette retained; 2023+ ONA brand is intentionally handmade/flexible per [Frontlines rebrand](https://ona.org/wp-content/uploads/2024/10/ona_frontlines_winter2023-2024.pdf) |
| **PSAC** | `#C0311A` | `#FFFFFF` | derived | [PSAC Brand Guidelines (2024)](https://psacunion.ca/sites/psac/files/2024-09-13_psac-afpc_brandguidelines_national_en.pdf) — Pantone 1805 |
| **Other** | `#C2410C` | `#FFFFFF` | `#9A3412` | UnionOps platform orange (not union-affiliated) |

**Changed 2026-08-28 (pass 2):** CUPE `#E5007D` → `#AF0061`; PSAC `#E31837` → `#C0311A`; USW gold `#FFC72C` → `#FFC03F`; USW navy `#002A5C` → `#002C65` (usw.ca theme).

**Changed 2026-08-28 (pass 3):** Unifor preset applies **Lato** (OFL catalog id `lato`) — official typeface per Unifor identity guidelines.

---

## Slogans

First `defaultSlogans` entry applies as sub-text on preset apply. Extended picker lists live in `brandKit.presetSlogans.{id}.items` (EN/FR).

| Preset | Default (EN apply) | Picker extras (sourced) |
|---|---|---|
| OPSEU | Educate. Advocate. Organize. | Because Public Services Matter. / FR: Parce que les services publics comptent. |
| CUPE | On the front line. | Au cœur de l'action. (2000 rebrand pair — [cupe.ca logo history](https://cupe.ca/cupe-logo-through-time)) |
| Unifor | A union for everyone. | FR: Un syndicat pour tous. ([identity guidelines](https://www.unifor.org/sites/default/files/documents/20230330-Identity-Guidelines.pdf)) |
| USW | Unity and Strength for Workers. | FR localized in `presetSlogans` |
| ONA | Stand up, speak out. | Value Nurses. Value Nursing. / FR campaign lines in `presetSlogans` |
| PSAC | Here for Canada. | Là pour le Canada. ([2024 NPSW materials](https://psacunion.ca/download-national-public-service-week-2024)) |
| Other | Solidarity. | — |

---

## Canvas fonts (OFL catalog nearest-match)

Applied via `canvasFontDefaults` on preset apply.

| Preset | Headline | Body | Official typeface | Catalog match |
|---|---|---|---|---|
| CUPE | Montserrat | Source Sans 3 | Avenir (locals) | Montserrat |
| Unifor | Lato | Lato | Lato | Lato (official) |
| USW | Oswald | Source Sans 3 | Futura T (logo) | Oswald |
| PSAC | Montserrat | Source Sans 3 | Avenir / Montserrat | Montserrat |
| OPSEU / ONA / Other | — | — | — | platform defaults |

---

## Collection grouping (CAAT Support)

- **Comms:** one **College Support** identity (`code: support`) + Other  
- **Membership:** FT + PT join forms (same local)  
- **Hub seed:** separate FT/PT bargaining units for CA/grievance  

See `.cursor/rules/brand-kit-collections.mdc`.

---

## CI guard

`src/lib/constants/union-preset-brand-audit.test.ts` — preset hex values must match `AUDITED_PRESET_COLORS`.
