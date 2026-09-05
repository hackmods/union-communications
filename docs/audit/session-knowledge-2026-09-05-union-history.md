# Session knowledge — Canadian union history playbook (2026-09-05)

## What shipped

Public **gold** playbook `/guide/union-history` (`unionHistoryGuide`). Discoverability: labour registry (gold tier), Resources labour path, steward playbooks hub. **Not** in the Guides mega-menu.

Facilitator kit: two-track diagrams, Local 243 worked example, map-your-local steps, confirm-before-you-speak checklist, history dates in `GuideExpandSection`, warning callout for area council vs labour council, and a one-page affiliation map PDF (`AffiliationMapWorksheetButton` → `downloadAffiliationMapWorksheetPdf`).

## Pedagogy

Affiliation is **two tracks**, not one ladder:

1. **Union family:** local → parent union → national federation *if any* (NUPGE for OPSEU / SEFPO) → CLC
2. **Geographic house:** local (or parent) → labour council → provincial federation (OFL) → CLC

Locals do **not** join NUPGE or the CLC as standalones. Area council ≠ labour council. Niagara Area Council is OPSEU / SEFPO-internal (no durable public homepage). Niagara Regional Labour Council is CLC-chartered and multi-union; its Who We Are list includes OPSEU / SEFPO Local 243. Québec centrals may sit outside the CLC.

OPSEU / SEFPO Local 243 is the **worked example**, not a platform default.

## Sources

All external URLs in `src/lib/constants/comms-sources.ts` (`PAGE_SOURCE_IDS.unionHistory`). Do not hardcode national `https://` in the page.

## Copy

New public namespaces default to **zero em dashes** (`ZERO_EM_DASH_NS`). Prefer period or colon. Do not bulk-strip the older catalog.

## Floor handout

`src/lib/comms/affiliation-map-worksheet-pdf.ts` via `writeBrandedWorksheetPdf` (`layoutMode: flow`). Preview: `npm run pdf:preview -- affiliation-map en`. Keep copy off U+2014.
