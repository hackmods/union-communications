# Guide layout growth — review backlog

**Status:** Living plan for shells that must **not** blindly copy playbook tip grids.  
**In-scope reference:** [`.cursor/rules/guide-layout-standards.mdc`](../../.cursor/rules/guide-layout-standards.mdc), shared primitives in [`src/components/comms/guide-ui.ts`](../../src/components/comms/guide-ui.ts).  
**Shell vs composition:** [`.cursor/rules/responsive-layouts.mdc`](../../.cursor/rules/responsive-layouts.mdc).  
**Final deferred uplift:** [`fluid-ui-final-uplift-checklist.md`](fluid-ui-final-uplift-checklist.md) · [`session-knowledge-2026-09-08-fluid-ui-final-uplift.md`](session-knowledge-2026-09-08-fluid-ui-final-uplift.md).

## Why this note exists

Public guide chapters and workshop outlines use shared `GuideSection*` / outline primitives. Adjacent surfaces keep distinct shells. When growing them, reuse shared primitives where they fit, invent named wrappers when the job differs, and record deferred edge cases here.

## Surfaces (post–final uplift)

| Surface | Shell / wrappers | Still deferred / edge cases |
|---------|------------------|------------------------------|
| **Officer Learning** dark shell | `olTheme` + `OfficerLearningDashboard` / `ModuleViewer`; track picker CSS grid; module cards `sm:2 lg:3 xl:4`; sources `max-w-prose` via `olTheme.sourcesCard` + `SourcesBlock` | Optional dark tip-grid `variant`; four-width matrix on **module viewer** body (not the index); Hub light board (`/app/officer-learning`) stays Hub chrome |
| **Legal pamphlets** | `GuideLayout preset="narrow"` + `GuideSection` / `GuideCallout` / `GuideProse` / `GuideBulletList`; DisplaySettings → `PublicHubPanel` | Do **not** widen to playbook tip grids or TOC rails unless product asks |
| **Tool editor chrome** | `ToolEditorLayout`: `PUBLIC_PAGE_TITLE_CLASS` + shared form panel (`p-4 md:p-6`); form-root Cards unwrapped | Canvas **preview interiors** stay Canvas Core; bespoke PageShell exceptions: alt-text, rules-of-order, proposal-tracker; bylaw workspace delegate |
| **Hub / Portal dashboards** | `HubDashboard` / `PortalStation` + `PUBLIC_*` titles; widget/circle CSS grids; Card for widgets only | Deeper Hub boards (TaskBoard, CircleWorkspace density) still product-scoped; do not force GuideLayout |
| **PDF / capture** | `pdf-layout` margins + safe floors; `stripExportChromeFromClone`; `CanvasSafeZoneOverlay` = `data-export-chrome` outside export roots | No Tailwind tip grids on print; density work stays in golden spatial contracts |

## Methodology for growth (when you touch these)

1. **Name the job** — reading pamphlet, training module, workspace panel, authenticated dashboard, or print sheet.
2. **Reuse before inventing** — guide reading → `guide-ui`; workspace forms → `PublicHubPanel`; canvas tools → `ToolEditorLayout` panel; OL → `olTheme` tokens.
3. **Cool new components welcome** — invent named primitives; document in the matching `.cursor/rules` file.
4. **Anti-regression** — no left-pinned `max-w-prose` tip lists in wide playbook columns; no form-root Card inside ToolEditor form panel; no GuideLayout on OL/Hub/Portal; no interactive chrome in export rasters.
5. **Review checklist** — spot ~375 / 768 / 1280 / 1536; EN/FR claim parity if copy moves; update this note when scope changes.

## Brought in (cumulative)

| Wave | Surface | Primitive / outcome |
|------|---------|---------------------|
| Playbook stretch | Workshops, first-week, resources, boards, Demo Path, TOC | `GuideOutlineStep`, `GuideCatalogCard`, `GuideSpotlightBand`, `GuidePlaybookToc`, … |
| Fluid migration Batches 1–12 | Catalogs, captions, brand-kit, densify guides | `CatalogStartHerePanel`, `PUBLIC_*` type, `GuideWideFigure`, … |
| Gaps / QOL | Tip ReactNode, catalog `href`/`titleAs`, tip-pin guards | `PublicHubPanel`, `GuideTipItem` content |
| **Final uplift 2026-09-08** | Legal, Hub/Portal, ToolEditor chrome, OL index, PDF capture | guide-ui pamphlets; dashboard grids; form panel; `olTheme` contrast/grid; export chrome strip |

Full tick lists: [`fluid-ui-migration-checklist.md`](fluid-ui-migration-checklist.md), [`fluid-ui-final-uplift-checklist.md`](fluid-ui-final-uplift-checklist.md).

Closed public GB items: [`docs/growth-backlog.md`](../growth-backlog.md) (GB-001–012).

## Suggested future passes (not scheduled)

- OL **module viewer** density (aside + prose) at `xl` — index/dashboard already fluid.
- Hub TaskBoard / CircleWorkspace composition if product expands dashboard density.
- Asset packs: audit `border-l-2` duplication only if packs grow into multi-column catalogs.
- PDF: keep [`guide-pdfs.mdc`](../../.cursor/rules/guide-pdfs.mdc); any density work stays in `pdf-layout` contracts.

## Related

- Actionable public UI backlog: [`docs/growth-backlog.md`](../growth-backlog.md).
- Editor chrome contract: [`.cursor/rules/tool-editor-ux.mdc`](../../.cursor/rules/tool-editor-ux.mdc).
