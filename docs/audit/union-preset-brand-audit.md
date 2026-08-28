# Union preset brand audit (2026-08-28)

**Scope:** `src/lib/constants/unionPresets.ts` starter colours, slogans, and canvas font defaults.  
**Not in scope:** Bundled official logos (OPSEU reference pack only), Hub bargaining-unit tenancy.

UnionOps presets are **workshop starters**, not trademarked national assets. Values below are the best verified match to public brand sources as of this audit.

---

## Colour verdict

| Preset | Primary | Secondary | Accent | Source / note |
|---|---|---|---|---|
| **OPSEU / SEFPO** | `#003DA5` | `#FFFFFF` | `#002868` | Reference tenant seed + bundled asset pack; official specs in OPSEU graphics download |
| **CUPE** | `#E5007D` | `#FFFFFF` | derived | Common CUPE pink on public materials; no public hex manual — **hold** until union communicator confirms |
| **Unifor** | `#C31A1A` | `#FFFFFF` | `#005EB8` | [Identity Guidelines PDF (2023)](https://www.unifor.org/sites/default/files/documents/20230330-Identity-Guidelines.pdf); live site `mask-icon color="#c31a1a"` |
| **USW** | `#002A5C` | `#FFC72C` | derived | [USW Style Guide](https://assets.usw.org/resources/Styleguide_logos_vendors/usw-styleguidev2.pdf) — PMS 294U + 122U; hex is approximate conversion |
| **ONA** | `#003865` | `#FFD100` | derived | Public ona.org palette — reasonable starter |
| **PSAC** | `#E31837` | `#FFFFFF` | derived | Matches common PSAC red |
| **Other** | `#C2410C` | `#FFFFFF` | `#9A3412` | UnionOps platform orange (not union-affiliated) |

**Changed this audit:** Unifor primary `#ED1B2F` → `#C31A1A`; added accent `#005EB8`.

**Rejected (Gemini):** CUPE `#CC338B` / `#E80068` — no official public hex found.

---

## Slogans

First `defaultSlogans` entry applies as sub-text on preset apply. Extended picker lists live in `brandKit.presetSlogans.{id}.items` (EN/FR).

| Preset | Default (EN apply) | Picker extras |
|---|---|---|
| OPSEU | Educate. Advocate. Organize. | Because Public Services Matter. |
| CUPE | On the front line. | Au cœur de l'action. (FR pair from 2000 rebrand) |
| Unifor | A union for everyone. | — |
| USW | Unity and Strength for Workers. | — |
| ONA | Stand up, speak out. | Value Nurses. Value Nursing. |
| PSAC | Here for Canada. | — |
| Other | Solidarity. | — |

---

## Canvas fonts (OFL catalog nearest-match)

Applied via `canvasFontDefaults` on preset apply — maps to `BrandKit.canvas.headlineFontId` / `bodyFontId`.

| Preset | Headline | Body | Rationale |
|---|---|---|---|
| CUPE | Montserrat | Source Sans 3 | National brand uses Avenir; Montserrat is closest in catalog |
| Unifor | Montserrat | Source Sans 3 | Custom sans in guidelines; Montserrat starter |
| USW | Oswald | Source Sans 3 | Logo uses Futura T; Oswald condensed starter |
| OPSEU / ONA / PSAC / Other | — | — | Platform defaults until Look / preset fonts are sourced |

---

## Collection grouping (CAAT Support)

- **Comms:** one **College Support** identity (`code: support`) + Other  
- **Membership:** FT + PT join forms (same local)  
- **Hub seed:** separate FT/PT bargaining units for CA/grievance  

See `.cursor/rules/brand-kit-collections.mdc`.

---

## CI guard

`src/lib/constants/union-preset-brand-audit.test.ts` — preset hex values must match `AUDITED_PRESET_COLORS`.
