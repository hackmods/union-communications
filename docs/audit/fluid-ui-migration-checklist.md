# Fluid UI migration checklist (in-scope)

**Status:** Active — Batches 1–6 shipped 2026-09-08; pause for approval before Batch 7.  
**Standards:** [`.cursor/rules/guide-layout-standards.mdc`](../../.cursor/rules/guide-layout-standards.mdc), [`responsive-layouts.mdc`](../../.cursor/rules/responsive-layouts.mdc), [`public-marketing-ux.mdc`](../../.cursor/rules/public-marketing-ux.mdc).  
**Shared type tokens:** [`src/lib/constants/public-type.ts`](../../src/lib/constants/public-type.ts).  
**Out of scope:** Officer Learning dark shell; `/privacy` `/security` `/accessibility`; canvas/`ToolEditorLayout` interiors; PDF export; Hub `/app/**` + Portal `/portal/**` (deferred product decision).

## Done (reference)

- [x] Home (`HomeContent`)
- [x] `/guide` Blueprint (spotlight + link clusters)
- [x] `/guide/workshops`, workshop outlines, land-ack, social-media-plan
- [x] Most playbook shells on `guide-ui` barrel (GB-001/008)
- [x] Batches 1–6 (playbook scenarios, hubs, simple polish)

---

## Simple

| ID | Surface | Legacy signal | Target | Status |
|----|---------|---------------|--------|--------|
| S1 | `Steward101ModuleNav.tsx` | Raw `Callout` | `GuideCallout` | Done B4 |
| S2 | `/guide/email-broadcast` | Inner prose pins in callouts | Rely on `GuideCallout` measure | Done B6 |
| S3 | `/guide/union-boards` | `p.max-w-prose` inside accents | Drop redundant pins | Done B5 |
| S4 | `/guide/website` CTAs only | `button-row max-w-lg` | `GuideActionRow` (keep `PartFrame`) | Done B4 |
| S5 | `ResourcesSourcesList` heading | Rigid `text-xl` | Fluid clamp token | Done B6 |
| S6 | `/examples` title + footer prompts | Rigid h1; prose link dump | Fluid title; catalog cards | Done B6 |
| S7 | `/updates` (`UpdatesContent`) | Rigid h1; raw Callout empty | Fluid title + marketing empty state | |
| S8 | `/manifesto`, `/support`, `/feedback`, `/install`, `/assets` | Rigid page titles | Shared public title clamp | |

## Medium

| ID | Surface | Legacy signal | Target | Status |
|----|---------|---------------|--------|--------|
| M1–M12 | Playbooks / hubs (see prior batches) | various | guide-ui primitives | Done B1–B5 |
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

1. ~~Batches 1–6~~ — playbook scenarios, hubs, simple polish through `/examples`  
2. **Batch 7 (next):** S7 updates + S8 public titles (manifesto/support/feedback/install/assets) — 2–3 files  
3. **Batch 8:** M13 `/guides` + M14 `/tools` catalog align  
4. **Batch 9:** M15 captions + M16 onboarding  
5. **Batch 10+:** Complex C1–C5

Pause for approval between batches.
