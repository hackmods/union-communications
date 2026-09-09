# Session knowledge — Fluid UI migration (Batches 1–12) (2026-09-08)

**Audience:** future agents + Ryan.  
**Checklist (complete):** [`fluid-ui-migration-checklist.md`](fluid-ui-migration-checklist.md).  
**Standards:** [`.cursor/rules/guide-layout-standards.mdc`](../../.cursor/rules/guide-layout-standards.mdc), [`responsive-layouts.mdc`](../../.cursor/rules/responsive-layouts.mdc), [`public-marketing-ux.mdc`](../../.cursor/rules/public-marketing-ux.mdc).  
**Growth / still deferred:** [`guide-layout-growth-backlog.md`](guide-layout-growth-backlog.md).

---

## What shipped

In-scope public reading + catalog surfaces were migrated in small batches (pause between batches). Final status: **all Simple / Medium / Complex checklist rows Done**.

| Batch | Surfaces (high level) |
|-------|------------------------|
| 1–5 | Playbook densify (scenarios → `GuideOutlineStep`, tip grids, catalog hubs, module nav) |
| 6–7 | `PUBLIC_*` type tokens; examples/updates/manifesto family titles |
| 8 | `/guides` + `/tools` shared [`CatalogStartHerePanel`](../../src/components/comms/CatalogStartHerePanel.tsx) |
| 9 | `/captions` catalog tiles; `/onboarding` stepped hub panel |
| 10 | workplace-mapping + union-history: `GuideWideFigure`, tip/bullet grids, outline steps |
| 11 | steward-101 + steward-playbooks: outline phases, catalog cards, fluid training titles |
| 12 | `/brand-kit`: `ComposedPageLayout` **workspace** + hub panels (not GuideLayout); canvas panel untouched |

**Shared primitives worth preferring:**

| Primitive | Job |
|-----------|-----|
| `guide-ui` barrel | All public guide pages (no dual GuideLayout / raw Callout imports) |
| `PUBLIC_PAGE_TITLE_CLASS` / `PUBLIC_SECTION_TITLE_CLASS` / `PUBLIC_CARD_TITLE_CLASS` | [`public-type.ts`](../../src/lib/constants/public-type.ts) |
| `CatalogStartHerePanel` | Catalog start-here rail (`/tools`, `/guides`) |
| `GuideWideFigure` | Diagrams/tables — never `max-w-md` phone plates on desktop |
| `GuideOutlineStep` | Numbered scenarios / worked phases / map-yours |
| `GuideCatalogCard` | Hub discovery rows (playbooks, captions footer, reference stacks) |
| `GuideTipGrid` + `GuideTipItem` | Labeled tip clusters (fill column at `sm+`) |
| `GuideBulletList` | Label-less discs (optional 2-col) |
| `GuideTrainingPhase` | Steward-101 module chrome only |

Guards: `npm run test:unit -- src/lib/comms/guide-layout-guards.test.ts`.

---

## Decisions that must stick

1. **Do not force GuideLayout onto Brand Kit, tools, or Officer Learning.** Brand Kit = workspace composition + local hub panels; tools stay `ToolEditorLayout`; OL stays dark shell.
2. **Prose measure stays for continuous reading** (section intros, `GuideProse`, callout body). Tip/list clusters must **not** wrap items in `max-w-prose` inside a playbook article column.
3. **`GuideExpandSection`:** never pin the outer shell with `max-w-prose` / `max-w-3xl` — summary inside already uses prose; children should fill the column (tip grids / outlines).
4. **Website `/guide/website` `PartFrame`** remains an accepted exception (multi-part site-build chrome). Do not “fix” by converting to `GuideSection` without a product redesign.
5. **Batch discipline worked** — 2–3 surfaces, tick checklist, pause — kept diffs reviewable and avoided Hub/Portal scope creep.

---

## Gaps and QOL improvements noticed

Not blockers for “checklist complete.” Prioritized for a future pass (or growth backlog).

### High leverage (in-scope polish)

| Gap | Why it matters | Suggested fix |
|-----|----------------|---------------|
| **`GuideTipItem` is string-only** | Union-history (and peers) still hand-roll `<li className="min-w-0">` for `RegistryLink` cells | Allow `content: ReactNode` (or `GuideTipRichItem`) so tip grids stay consistent |
| **`GuideCatalogCard` always uses `<h2>`** | Nested under chapter `h2`s → heading-level noise; playbooks often duplicate title text + same-label CTA | Optional `titleAs` / linkable title; or `title` as Link when `href` provided |
| **Page-local hub panel chrome** | Brand Kit `BrandKitPanel` and onboarding stepped panel share the same gradient/border language but are copy-pasted | Extract `PublicHubPanel` (or move BrandKitPanel under `components/brand/`) for Brand Kit + onboarding reuse |
| **No structural guard for tip pins** | `guide-layout-guards` only bans local `GuideSection` / dual imports — cannot catch `li.max-w-prose` regressions | Extend guards: forbid `max-w-prose` on tip/list items inside `src/app/**/guide/**/page.tsx` (allow section intro / GuideProse) |

### Medium (visual / steward feel)

| Gap | Why it matters | Suggested fix |
|-----|----------------|---------------|
| **Social map diagram still “cluster in a box”** | Wider than `max-w-xs`, but not full-column like the scale diagram | Optional side-by-side legend + cluster, or soft fill of `GuideWideFigure` |
| **Steward-101 dual chrome** | `GuideTrainingPhase` cards vs `GuideSection` border-l elsewhere | Keep intentional for training, or document as the only dual system; avoid inventing a third |
| **Captions highlight ring on border-l tiles** | Deep-link `?caption=` ring may feel clipped vs old Card | Spot-check mobile; consider `rounded-r-lg` + inset ring only |
| **Tools catalog group lists** | Still sparse title+blurb rows (not catalog cards) after start-here share | Optional densify to `GuideCatalogCard` per tool if Tools feels thin next to Guides |
| **Website PartFrame headings** | Still fixed `text-2xl` while rest of public uses fluid tokens | Apply `PUBLIC_SECTION_TITLE_CLASS` inside PartFrame without changing layout |

### Deferred / out-of-scope (do not “finish” under fluid checklist)

| Surface | Note |
|---------|------|
| **Tool editor pages** (`/tools/*` Cards, rigid `h1`) | Explicit exception — canvas/workspace chrome. Separate QOL if product wants fluid titles on ToolEditorLayout chrome only |
| **Officer Learning dark shell** | See growth backlog — dark tip-grid variant, not GuideLayout |
| **Legal trio** | Stay narrow pamphlet |
| **Hub `/app/**` + Portal** | Largest remaining density debt if scope expands; needs product decision |
| **PDF / guide sheets** | Separate engine — do not apply Tailwind tip grids |
| **`/build` ops pages** | Rigid titles; not on public fluid checklist |

### Small copy / a11y nits

- Onboarding progress: labeled steps shipped; consider `aria-current="step"` on the active step for SR clarity.
- Steward-playbooks featured quiz badge sits in `meta` — confirm contrast on blue-tint featured cards.
- Brand Kit purpose CTA: fixed nested `Link`>`Button` → shared `guideCtaClassSm` on `Link` (good pattern; repeat on any remaining nested buttons).

---

## Do not

- Re-open OL / legal / tool interiors / PDF / Hub under “fluid UI leftover” without an explicit product expand
- Import `GuideSection` into Brand Kit or canvas tools
- Reintroduce `max-w-md` diagram plates or tip `li.max-w-prose` in playbooks
- Add What's new for layout-only densify (no new steward capability)

---

## Verify

```bash
npm run test:unit -- src/lib/comms/guide-layout-guards.test.ts
npx eslint "src/app/[locale]/brand-kit/page.tsx" "src/app/[locale]/guide/steward-101/page.tsx" "src/app/[locale]/guide/steward-playbooks/page.tsx"
```

Spot widths after layout edits: ~375 / 768 / 1280 / 1536 on playbooks + `/brand-kit` + `/tools` + `/guides`.

---

## Related commits (main)

Approx train ending `26e0de3` (brand-kit B12); prior fluid batches on `main` same day include catalog start-here, captions/onboarding, workplace-mapping/union-history, steward-101/playbooks.
