# Remaining migration

The planned visual-uplift implementation is complete. The shared system has been tested across the nine named representative surfaces; repetitive route-by-route restyling was intentionally not part of this pass. No required implementation item remains open.

## Human review follow-up

- Verify 200% browser zoom and reflow in a headed browser with the target deployment/browser combination. The current headless Chromium ignored its zoom shortcuts; the responsive width matrix and doubled-text test passed.
- Complete a human screen-reader review of the Home example selector, primary task links, Brand Kit relationship and hosted-preview captions, plus one catalog and one working form. Automated axe/keyboard results are not a conformance claim.
- For release reviews, exercise the unchanged domain states: Hub role/module/MFA gating, Portal membership visibility, builder export failures and worksheet value retention. Existing domain behavior and contracts were not altered by this presentation pass.

## Shared patterns for later sibling work

Future changes should be driven by an observed usability defect and reuse [03_COMPONENT_PATTERNS](03_COMPONENT_PATTERNS.md):

| Surface group | Shared pattern to reuse | Defer until a demonstrated gap |
|---|---|---|
| Other Create/Learn catalogs | `PublicCatalogExplorer`: readable open results, explicit filters, stable query/history behavior | Catalog-by-catalog restyling without a specific layout or task failure |
| Tool editors | `ToolEditorLayout`: compact task framing, existing field hierarchy, mounted preview and mobile Edit/Preview | Canvas/export-root styling, which has separate geometry contracts |
| Hub modules | Existing operational components and contextual navigation: scope, permission, current work, allowed action | Applying public landing-page hierarchy to authenticated tasks |
| Portal modules | Existing member-safe `PortalPanel`, consent, membership and participation boundaries | Surfacing private Hub records or treating every module as public |
| Guides and Officer Learning | Existing teaching hierarchy, source links, lesson and progress patterns; Officer Learning keeps its dedicated theme | Replacing instruction with marketing cards or decorative movement |

## Outside this pass

- Product architecture, route taxonomy, tenancy, membership, permission, storage and pricing decisions.
- Historical product-refactor packets beyond the recovered baseline in `docs/product-refactor/13_UPLIFT_BASELINE.md`.
- Auth, MFA, audit, hosted readiness or persistence behavior.
- Output-engine rewrites, export-root restyling, new dashboards, speculative analytics, tours, testimonials or customer claims.
