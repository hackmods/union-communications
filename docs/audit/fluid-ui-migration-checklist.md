# Fluid UI migration checklist (in-scope)

**Status:** Complete — Batches 1–12 shipped 2026-09-08.  
**Standards:** [`.cursor/rules/guide-layout-standards.mdc`](../../.cursor/rules/guide-layout-standards.mdc), [`responsive-layouts.mdc`](../../.cursor/rules/responsive-layouts.mdc), [`public-marketing-ux.mdc`](../../.cursor/rules/public-marketing-ux.mdc).  
**Shared type tokens:** [`src/lib/constants/public-type.ts`](../../src/lib/constants/public-type.ts).  
**Shared catalog rail:** [`src/components/comms/CatalogStartHerePanel.tsx`](../../src/components/comms/CatalogStartHerePanel.tsx).  
**Out of scope (intentionally not migrated):** Officer Learning dark shell; `/privacy` `/security` `/accessibility`; canvas/`ToolEditorLayout` interiors and tool form Cards; PDF export; Hub `/app/**` + Portal `/portal/**` (deferred product decision). Website guide `PartFrame` remains an accepted exception per guide-layout-standards.

## Done (reference)

- [x] Home (`HomeContent`)
- [x] `/guide` Blueprint + playbook/hub densification (Batches 1–5)
- [x] Public title tokens + examples/updates/manifesto family (Batches 6–7)
- [x] `/guides` + `/tools` shared start-here + fluid titles (Batch 8)
- [x] `/captions` + `/onboarding` fluid catalog / stepped hub (Batch 9)
- [x] workplace-mapping + union-history tip grids / wide figures (Batch 10)
- [x] steward-101 + steward-playbooks outline / catalog densify (Batch 11)
- [x] `/brand-kit` workspace composition + hub panels (Batch 12)
- [x] Most playbook shells on `guide-ui` barrel (GB-001/008)

---

## Simple

| ID | Surface | Status |
|----|---------|--------|
| S1–S8 | Module nav, callout pins, website CTAs, sources heading, examples, updates, manifesto/support/feedback/install/assets titles | **Done** B4–B7 |

## Medium

| ID | Surface | Legacy signal | Target | Status |
|----|---------|---------------|--------|--------|
| M13 | `/guides` catalog | Local `StartHerePanel`; sparse lists | Shared catalog + fluid title | **Done** B8 |
| M14 | `/tools` catalog | Duplicate start-here; sparse groups | Align with `/guides` | **Done** B8 |
| M15 | `/captions` | Rigid h1; Card templates | Fluid title + catalog pattern | **Done** B9 |
| M16 | `/onboarding` | Sparse Card wizard | Stepped hub chrome + fluid title | **Done** B9 |

## Complex

| ID | Surface | Legacy signal | Target | Status |
|----|---------|---------------|--------|--------|
| C1 | `/guide/workplace-mapping` | Many prose-pinned lists; `max-w-md` diagram | Tip/bullet grids + `GuideWideFigure` | **Done** B10 |
| C2 | `/guide/union-history` | Raw tips in grid; expand pins | `GuideTipItem` / outline cleanup | **Done** B10 |
| C3 | `/guide/steward-101` | Expand + scenario `li.max-w-prose` | Outline phases; module nav | **Done** B11 |
| C4 | `/guide/steward-playbooks` | Raw sections; border-l stacks; callout clamps | `GuideSection` + catalog cards | **Done** B11 |
| C5 | `/brand-kit` | Long Card form stack | Tool-hub composition (not GuideLayout) | **Done** B12 |

## Completion audit (2026-09-08)

| Requirement | Evidence | Verdict |
|-------------|----------|---------|
| Complexity-grouped checklist produced | This file | Met |
| Batches of 2–3 files with ticks | Commits B1–B12; Status column Done | Met |
| In-scope surfaces match fluid standards | Guide pages use `guide-ui`; catalogs use shared rail + `PUBLIC_*` titles; brand-kit uses `ComposedPageLayout` workspace + hub panels | Met |
| Out-of-scope exceptions respected | Officer Learning / legal / tool Cards / Hub / Portal / PDF still use prior chrome; website `PartFrame` documented exception | Met |
| No remaining checklist rows open | S/M/C tables all **Done** | Met |

## Batch plan

1. ~~Batches 1–12~~ — complete  
2. ~~Completion audit~~ — complete  
