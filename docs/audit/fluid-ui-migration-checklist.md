# Fluid UI migration checklist (in-scope)

**Status:** Active — Step 1–2 complete 2026-09-08; batches pause for approval between groups.  
**Standards:** [`.cursor/rules/guide-layout-standards.mdc`](../../.cursor/rules/guide-layout-standards.mdc), [`responsive-layouts.mdc`](../../.cursor/rules/responsive-layouts.mdc), [`public-marketing-ux.mdc`](../../.cursor/rules/public-marketing-ux.mdc).  
**Out of scope:** Officer Learning dark shell; `/privacy` `/security` `/accessibility`; canvas/`ToolEditorLayout` interiors; PDF export; Hub `/app/**` + Portal `/portal/**` (deferred product decision).

## Done (reference)

- [x] Home (`HomeContent`)
- [x] `/guide` Blueprint (spotlight + link clusters)
- [x] `/guide/workshops`, workshop outlines, land-ack, social-media-plan
- [x] Most playbook shells on `guide-ui` barrel (GB-001/008)

---

## Simple

| ID | Surface | Legacy signal | Target |
|----|---------|---------------|--------|
| S1 | `Steward101ModuleNav.tsx` | Raw `Callout` | `GuideCallout` |
| S2 | `/guide/email-broadcast` | Inner prose pins in callouts | Rely on `GuideCallout` measure |
| S3 | `/guide/union-boards` | `p.max-w-prose` inside accents | Drop redundant pins |
| S4 | `/guide/website` CTAs only | `button-row max-w-lg` | `GuideActionRow` (keep `PartFrame`) |
| S5 | `ResourcesSourcesList` heading | Rigid `text-xl` | Fluid clamp token |
| S6 | `/examples` title + footer prompts | Rigid h1; prose link dump | Fluid title; `GuideLinkCluster` |
| S7 | `/updates` (`UpdatesContent`) | Rigid h1; raw Callout empty | Fluid title + marketing empty state |
| S8 | `/manifesto`, `/support`, `/feedback`, `/install`, `/assets` | Rigid page titles | Shared public title clamp |

## Medium

| ID | Surface | Legacy signal | Target |
|----|---------|---------------|--------|
| M1 | `/guide/bargaining` `fullScenario` | `li.max-w-prose` | `GuideOutlineList` / `GuideOutlineStep` | **Done** Batch 1 |
| M2 | `/guide/crisis` `fullScenario` | same | same | **Done** Batch 1 |
| M3 | `/guide/strike` `fullScenario` | same | same | |
| M4 | `/guide/photo-consent` `fullScenario` | same | same | |
| M5 | `/guide/dfr` `fullScenario` | same | same | **Done** Batch 1 |
| M6 | `/guide/right-to-refuse` `fullScenario` | same | same | |
| M7 | `/guide/joint-committee` `fullScenario` | same | same | |
| M8 | `/guide/running-meetings` | Agenda/motion `li.max-w-prose`; narrow diagrams | Outline/bullet + `GuideWideFigure` |
| M9 | `/guide/bylaws` | Committee steps + figure pins | Outline + `GuideWideFigure` |
| M10 | `/guide/grievance-process` | Local `ForumFlowFigure` `max-w-prose` | `GuideWideFigure` |
| M11 | `/guide/resources` | Hand-rolled link grids / middot explore | `GuideLinkCluster` / catalog |
| M12 | `/guide/short-form` | `Card` editor grid; `max-w-md` figure | Catalog cards + `GuideWideFigure` |
| M13 | `/guides` catalog | Local `StartHerePanel`; sparse lists | Shared catalog + fluid title |
| M14 | `/tools` catalog | Duplicate start-here; sparse groups | Align with `/guides` |
| M15 | `/captions` | Rigid h1; Card templates | Fluid title + catalog pattern |
| M16 | `/onboarding` | Sparse Card wizard | Stepped hub chrome + fluid title |

## Complex

| ID | Surface | Legacy signal | Target |
|----|---------|---------------|--------|
| C1 | `/guide/workplace-mapping` | Many prose-pinned lists; `max-w-md` diagram | Tip/bullet grids + `GuideWideFigure` |
| C2 | `/guide/union-history` | Raw tips in grid; expand pins | `GuideTipItem` / outline cleanup |
| C3 | `/guide/steward-101` | Expand + scenario `li.max-w-prose` | Outline phases; module nav |
| C4 | `/guide/steward-playbooks` | Raw sections; border-l stacks; callout clamps | `GuideSection` + catalog cards |
| C5 | `/brand-kit` | Long Card form stack | Tool-hub composition (not GuideLayout) |

## Batch plan

1. **Batch 1 (now):** M1–M3 subset — `bargaining`, `crisis`, `dfr` `fullScenario` → outline steps  
2. **Batch 2:** remaining `fullScenario` (M3 strike if not done, M4–M7)  
3. **Batch 3:** Medium playbook cleanup (M8–M10)  
4. **Batch 4:** Guide hubs (M11–M12, C4) + Simple guide polish (S1–S5)  
5. **Batch 5:** Catalog/marketing (M13–M16, S6–S8, C5)

Tick items here as batches land. Pause for approval between batches.
