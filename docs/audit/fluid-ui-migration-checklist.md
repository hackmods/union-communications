# Fluid UI migration checklist (in-scope)

**Status:** Active — Batches 1–5 shipped 2026-09-08; pause for approval before Batch 6.  
**Standards:** [`.cursor/rules/guide-layout-standards.mdc`](../../.cursor/rules/guide-layout-standards.mdc), [`responsive-layouts.mdc`](../../.cursor/rules/responsive-layouts.mdc), [`public-marketing-ux.mdc`](../../.cursor/rules/public-marketing-ux.mdc).  
**Out of scope:** Officer Learning dark shell; `/privacy` `/security` `/accessibility`; canvas/`ToolEditorLayout` interiors; PDF export; Hub `/app/**` + Portal `/portal/**` (deferred product decision).

## Done (reference)

- [x] Home (`HomeContent`)
- [x] `/guide` Blueprint (spotlight + link clusters)
- [x] `/guide/workshops`, workshop outlines, land-ack, social-media-plan
- [x] Most playbook shells on `guide-ui` barrel (GB-001/008)
- [x] Batch 1–2: all `fullScenario` playbooks except joint-committee (then Batch 3)
- [x] Batch 3: joint-committee + running-meetings + bylaws

---

## Simple

| ID | Surface | Legacy signal | Target | Status |
|----|---------|---------------|--------|--------|
| S1 | `Steward101ModuleNav.tsx` | Raw `Callout` | `GuideCallout` | Done B4 |
| S2 | `/guide/email-broadcast` | Inner prose pins in callouts | Rely on `GuideCallout` measure | |
| S3 | `/guide/union-boards` | `p.max-w-prose` inside accents | Drop redundant pins | Done B5 |
| S4 | `/guide/website` CTAs only | `button-row max-w-lg` | `GuideActionRow` (keep `PartFrame`) | Done B4 |
| S5 | `ResourcesSourcesList` heading | Rigid `text-xl` | Fluid clamp token | |
| S6 | `/examples` title + footer prompts | Rigid h1; prose link dump | Fluid title; `GuideLinkCluster` | |
| S7 | `/updates` (`UpdatesContent`) | Rigid h1; raw Callout empty | Fluid title + marketing empty state | |
| S8 | `/manifesto`, `/support`, `/feedback`, `/install`, `/assets` | Rigid page titles | Shared public title clamp | |

## Medium

| ID | Surface | Legacy signal | Target | Status |
|----|---------|---------------|--------|--------|
| M1 | `/guide/bargaining` `fullScenario` | `li.max-w-prose` | `GuideOutlineStep` | Done B1 |
| M2 | `/guide/crisis` `fullScenario` | same | same | Done B1 |
| M3 | `/guide/strike` `fullScenario` | same | same | Done B2 |
| M4 | `/guide/photo-consent` `fullScenario` | same | same | Done B2 |
| M5 | `/guide/dfr` `fullScenario` | same | same | Done B1 |
| M6 | `/guide/right-to-refuse` `fullScenario` | same | same | Done B2 |
| M7 | `/guide/joint-committee` `fullScenario` | same | same | Done B3 |
| M8 | `/guide/running-meetings` | Agenda/motion pins; narrow diagrams | Outline/bullet + `GuideWideFigure` | Done B3 |
| M9 | `/guide/bylaws` | Committee steps + figure pins | Outline + `GuideWideFigure` | Done B3 |
| M10 | `/guide/grievance-process` | Local `ForumFlowFigure` `max-w-prose` | `GuideWideFigure` | Done B4 |
| M11 | `/guide/resources` | Hand-rolled link grids / middot explore | `GuideLinkCluster` / catalog | Done B5 |
| M12 | `/guide/short-form` | `Card` editor grid; `max-w-md` figure | Catalog cards + `GuideWideFigure` | Done B5 |
| M13 | `/guides` catalog | Local `StartHerePanel`; sparse lists | Shared catalog + fluid title | |
| M14 | `/tools` catalog | Duplicate start-here; sparse groups | Align with `/guides` | |
| M15 | `/captions` | Rigid h1; Card templates | Fluid title + catalog pattern | |
| M16 | `/onboarding` | Sparse Card wizard | Stepped hub chrome + fluid title | |

## Complex

| ID | Surface | Legacy signal | Target | Status |
|----|---------|---------------|--------|--------|
| C1 | `/guide/workplace-mapping` | Many prose-pinned lists; `max-w-md` diagram | Tip/bullet grids + `GuideWideFigure` | |
| C2 | `/guide/union-history` | Raw tips in grid; expand pins | `GuideTipItem` / outline cleanup | |
| C3 | `/guide/steward-101` | Expand + scenario `li.max-w-prose` | Outline phases; module nav | |
| C4 | `/guide/steward-playbooks` | Raw sections; border-l stacks; callout clamps | `GuideSection` + catalog cards | |
| C5 | `/brand-kit` | Long Card form stack | Tool-hub composition (not GuideLayout) | |

## Batch plan

1. ~~Batch 1~~ — M1/M2/M5 bargaining, crisis, dfr  
2. ~~Batch 2~~ — M3/M4/M6 strike, photo-consent, right-to-refuse  
3. ~~Batch 3~~ — M7/M8/M9 joint-committee, running-meetings, bylaws  
4. ~~Batch 4~~ — M10 grievance-process + S1 Steward101ModuleNav + S4 website CTA  
5. ~~Batch 5~~ — M11 resources + M12 short-form + S3 union-boards  
6. **Batch 6 (next):** Simple polish S2/S5 + catalog titles S6–S8 subset, or complex C4 steward-playbooks  
7. **Later:** M13–M16, C1–C3, C5

Pause for approval between batches.
