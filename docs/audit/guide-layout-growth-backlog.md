# Guide layout growth — out-of-scope review backlog

**Status:** Living plan for surfaces **not** migrated in the 2026-09 playbook layout rollout.  
**In-scope reference:** [`.cursor/rules/guide-layout-standards.mdc`](../../.cursor/rules/guide-layout-standards.mdc), shared primitives in [`src/components/comms/guide-ui.ts`](../../src/components/comms/guide-ui.ts), pilot [`LandAcknowledgementGuide.tsx`](../../src/components/comms/LandAcknowledgementGuide.tsx).  
**Shell vs composition:** [`.cursor/rules/responsive-layouts.mdc`](../../.cursor/rules/responsive-layouts.mdc).

## Why this note exists

The playbook rollout standardizes **public guide chapter chrome**: prose measure for reading, responsive tip grids for clusters, full-column diagrams, shared `GuideSection*` instead of page-local copies.

Several related surfaces stay **out of scope** on purpose. They should **not** blindly copy playbook tip grids. When we grow them, review against the methodology below, reuse shared primitives where they fit, and invent **cool new** components when the shell or job is different.

## Out-of-scope surfaces

| Surface | Why deferred | Review questions later |
|---------|--------------|------------------------|
| **Officer Learning** dark shell (`/guide/officer-learning/**`) | Training UX + dark tokens; already shares `GuideToc` / progress chrome. Playbook light `border-l` sections would clash. | Can OL reuse `GuideTipGrid` semantics with a `variant="dark"`? Keep module viewer density without empty-half at `xl`. Prefer new `Module*` wrappers over forcing `GuideSection`. |
| **`/privacy`, `/security`, `/accessibility`** | Intentional `GuideLayout preset="narrow"` / legal pamphlet measure. Wide tip grids fight “read this carefully” UX. | Keep narrow shell. Only densify if a page gains non-legal tool lists — then hub-style grids inside `narrow` are wrong; stay single column or opt into `playbook` with TOC intentionally. |
| **Tool panels** (e.g. [`AssetPackPanel`](../../src/components/comms/AssetPackPanel.tsx)) | Workspace / export chrome, not guide reading. Border accents here are pack sections, not chapters. | Prefer `ToolEditorLayout` / catalog patterns. If a panel grows tip-like lists, extract a **tool** list primitive — do not import playbook `GuideSection` into canvas tools. |
| **PDF / guide sheet layout** ([`guide-pdfs.mdc`](../../.cursor/rules/guide-pdfs.mdc), `src/lib/export/**`) | Print spatial contracts ≠ responsive Tailwind. | Keep PDF golden tests. Visual “density” on PDF is a separate engine; do not “fix” PDF by applying `GuideTipGrid` class names. |

## Methodology for growth (when you touch these)

1. **Name the job** — reading pamphlet, training module, workspace panel, or print sheet. Pick shell + composition first (`PAGE_SHELL` / `GUIDE_COMPOSITION` / OL shell / ToolEditor).
2. **Reuse before inventing** — If the job is “labeled tip cluster in a light reading column,” use `GuideTipGrid` / `GuideTipItem` (or a themed variant). If the job is different, **design a new named primitive** and document it in the matching rule — do not fork anonymous local helpers across pages.
3. **Cool new components welcome** — Asymmetry, diagrams, phase cards, dark rails, print sheets: invent them. Gate with: fills the shell at `lg+`, keeps readable measure for continuous prose, avoids robotic equal card grids for every list.
4. **Anti-regression** — No left-pinned `max-w-prose` tip lists inside a wide shell; no page-local `function GuideSection` copies; no empty-half stretched mobile stacks.
5. **Review checklist** — Spot ~375 / 768 / 1280 / 1536; EN/FR claim parity if copy moves; smoke if routes/names change; update this note when an out-of-scope item is intentionally brought in.

## Deferred within public guides (intentional)

These stay on specialized chrome for now — not the same as the out-of-scope surfaces above:

| Surface | Why |
|---------|-----|
| Workshop outline `<li>` steps (`/guide/workshop`, `/guide/workshops/**`) | Numbered outline + `WorkshopNote` badges — not chapter `GuideSection` |
| Mapped phase cards (`social-media-plan`, nested `union-boards` accents) | Iterator-driven cards; forcing `GuideSection` breaks the map |
| Resources hub category bands without `id` | Catalog sections, not TOC chapters — `min-w-0` accent only |

When redesigning those, prefer a **new** named primitive (e.g. `GuideOutlineStep`) over anonymous local helpers.

## Suggested future passes (not scheduled)

- OL: optional dark tip-grid variant + four-width matrix on module viewer.
- Legal trio: leave narrow unless product asks for TOC playbooks.
- Asset packs / tool panels: audit `border-l-2` duplication only if packs grow into multi-column catalogs.
- PDF: keep [`guide-pdfs.mdc`](../../.cursor/rules/guide-pdfs.mdc); any “density” work stays in `pdf-layout` contracts.

## Related

- Playbook rollout plan (Cursor): guide layout standards + remaining `/guide/**` migrations.
- Session pilot: land-acknowledgement densification (`GuideSection` / tip grids / wide writing-flow diagram).
