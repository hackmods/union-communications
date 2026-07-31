# Session knowledge — multi-union sources & bundled logos (2026-07-30)

**Audience:** future agents + Ryan.  
**Companion:** [`session-knowledge-2026-07-30.md`](session-knowledge-2026-07-30.md) (LINK-001 / upstream rot), [`current-ground-truth.md`](current-ground-truth.md).  
**Product decision (Ryan, chat):** OPSEU-specific bibliography should not show for other unions; multi-union support grows carefully; bundling third-party logos is permission-gated.

---

## Decisions

### 1. Gate national-union citations by Brand Kit preset

- **Universal** sources (no `unionIds`): WCAG, AODA, GitHub Pages, Facebook Groups help, OFL, Ontario posters/OHSA/ESA.
- **OPSEU-scoped** (`unionIds: ["opseu"]`): `opseu-*`, `local243-website`.
- **Filter:** `getSourcesForPage(pageId, unionPresetId)` / `sourceMatchesUnion()`.
- **Unset preset:** treat as **reference tenant** — still show OPSEU-scoped sources (workshop / first visit).
- **Other preset (e.g. `cupe`):** hide OPSEU-scoped rows. `SourcesBlock` returns `null` if nothing left.
- Website ZIP footer already gated: `includeOpseuResources = unionPresetId === "opseu"` in Website Template.

### 2. Multi-union build-out order (do not boil the ocean)

| Layer | Status / next |
|-------|----------------|
| Colour presets + upload-your-own logo + UnionOps mark fallback | Shipped |
| Filter bibliography / ZIP footers by preset | **This session** |
| Per-union source entries (CUPE, Unifor, …) when stewards need them | Later — add `unionIds` + registry rows, no logo pack required |
| Real non-OPSEU tenant seeds (modules, CA steps) | Ops / product when a second union onboards |
| Bundled official logo packs under `public/assets/…` | **Only with written permission** or a clear national reuse policy |

### 3. Trademark / logo risk (not legal advice — product stance)

- **Linking** to a public national graphics/letterhead page ≈ citation — preferred.
- **Bundling** trademarked logos in the repo or on unionops.org ≈ higher risk (trademark + copyright in artwork). A public brand-guidelines URL is **not** an open-source license to redistribute marks.
- UnionOps `LICENSE` is **source-available**, not OSS — that does not grant rights in third-party marks.
- Risk ↑ if the product looks **endorsed** or **operated** by the national union, or if anyone can download competing “official” packs.
- Risk ↓ with written permission, clear “not affiliated / not endorsed,” steward **upload** instead of shipping marks, local-volunteer framing.
- **OPSEU pack** today = pragmatic reference-tenant mirror + cite official About page — do **not** copy that pattern for CUPE/Unifor/etc. without a green light. Prefer colours + upload + link.

### 4. `/assets` Brand Asset Pack

- Swatches use `ASSET_PACK_COLORS` (seed OPSEU blue), not host `BRAND_COLORS` (platform orange).
- UI shows the OPSEU reference pack when Brand Kit preset is unset or `opseu`; otherwise Callout → Brand Kit (upload / colours), no implied endorsement that the pack is “your” union’s.

---

## Code map

| Concern | Path |
|---------|------|
| Registry + `unionIds` + filter | `src/lib/constants/comms-sources.ts` |
| Sources footer UI | `src/components/comms/SourcesBlock.tsx` |
| Resources full list | `src/components/comms/ResourcesSourcesList.tsx` (client filter) |
| Asset pack gating | `src/components/comms/AssetPackPanel.tsx` |
| Website ZIP OPSEU footer | `includeOpseuResources` + `getOpseuWebsiteFooterSources()` |
| Agent rule | `.cursor/rules/external-links.mdc` |

---

## Do not

- Ship CUPE/Unifor/USW/… official lockups into `public/assets/` “because OPSEU is there.”
- Hardcode national union hrefs outside `comms-sources.ts`.
- Assume unset Brand Kit means “hide everything OPSEU” — unset = reference demo.
