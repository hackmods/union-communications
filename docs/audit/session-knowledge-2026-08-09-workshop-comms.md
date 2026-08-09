# Session knowledge — 2026-08-09 (Workshop Comms multiphase)

**Audience:** future agents + Ryan.  
**Companion:** [`current-ground-truth.md`](current-ground-truth.md), [`workshop-gap-fit-2026-08.md`](workshop-gap-fit-2026-08.md), [`../PROGRESS.md`](../PROGRESS.md).  
**Talk:** *Starting Your Local Social Communications* (~2026-08-12).  
**Landed on:** `main` (`a1fcf68` Phase A → `f37cf6c` Phase B → `ddffc40` Gap Fit / close-out). Earlier UX pack: merge `d426f64` (`feat/comms-workshop-ux` → `main`).

---

## What happened

Public Comms UX/content/gap audit for a mixed workshop audience (auth / Officer Hub / Portal **out of scope** for the talk). Shipped terminology + Demo Path first, then multiphase **A / B / C + Gap Fit** on primary `main` so Wednesday is demo-complete without overselling Share Kit or mass email.

---

## What shipped

| Slice | Outcome |
|-------|---------|
| Language | Prefer **UnionOps Comms**, **Graphic Maker**, **Image Resizer**, **First week**, **Brand Kit** / Open Brand Kit; Officer Hub only for `/app` |
| Demo Path | [`WorkshopDemoPath`](../../src/components/comms/WorkshopDemoPath.tsx): Brand Kit → Board Notice → Graphic Maker → Captions |
| Facilitator | [`docs/guides/WORKSHOP_SOCIAL_COMMS.md`](../guides/WORKSHOP_SOCIAL_COMMS.md) — includes **Day-of checklist** |
| Public outline | `/guide/workshop` (+ First week calendar on `/guide/social-media-plan`) |
| Contracts | `.cursor/rules/comms-public-ux.mdc`; `brandSetupHref`, `BrandSetupPrompt`, `exportSuccess`, `purposeHint`, `ToolRelatedFooter` / `RELATED_BY_TOOL` |
| Phase A | Day-of run sheet; `e2e/workshop.smoke.spec.ts` @smoke |
| Phase B | Remaining canvas tools: export success; RelatedTools + when-to-use; BrandSetup on quiet demo tools; Captions → Graphic Maker CTA |
| Phase C | Deleted `origin/feat/comms-workshop-ux`; removed obsolete workshop worktree; lint + unit green |
| Gap Fit | [`workshop-gap-fit-2026-08.md`](workshop-gap-fit-2026-08.md) — demo-complete vs post-talk backlog |

---

## Hard lessons (do not re-learn)

### 1. Primary checkout vs workshop worktree

When `main` is dirty mid-merge, prefer a **clean worktree from `origin/main`** for workshop commits, then merge carefully. Concurrent branch hopping (`feat/local-404-solidarity` vs workshop) caused “files vanished” hallucinations — verify with `git ls-files` / `-LiteralPath` before trusting Glob.

**Talk tree:** `C:\Users\Ryan\Projects\union-communications` on **`main`**. The old `union-communications-comms-workshop` worktree was removed after land.

### 2. `messages/*.json` merges — keep both namespaces

Portal (`portal*`) and workshop (`workshopDemo`, `workshopGuide`, `whenToUse`, `captions.graphicMaker*`) namespaces co-exist. Resolving conflicts by dropping either side breaks the other feature. Keep **both**; resolve PROGRESS by stacking top sections.

### 3. BrandSetup + existing `toolbar=` — merge, don’t inject sibling

Automated “add `toolbar={!themeEstablished ? BrandSetup…}` next to `exportError`” **duplicates** the `toolbar` prop. In JSX the **second** wins — Graphic Maker silently lost BrandSetup and kept only presets. Always compose into a single `toolbar` (prompt above presets).

### 4. Wire `exportSuccess` into the hook destructure

Passing `exportSuccess={exportSuccess}` without destructuring it from `useExportHandler()` (board-banner) throws at runtime and takes down the page in smoke. Pattern: `{ exportError, exportSuccess, exporting, runExport } = useExportHandler(...)`.

### 5. PowerShell eats `@smoke`

`npx playwright test --grep @smoke` can mangle the tag. Use **quoted** `"@smoke"`. Prefer temp `.mjs` scripts over fragile PowerShell one-liners for bulk file rewrites; delete tmp scripts before push.

### 6. Stashes are sacred until listed

`stash@{0..2}` from merge pauses exist on primary. **List them to Ryan; do not drop** without explicit OK. Local 404 work previously parked workshop WIP in stash — workshop later landed separately on main.

### 7. Scope lock for the talk

| In | Out |
|----|-----|
| Public Comms makers, Brand Kit, guides, Captions | Officer Hub auth, MFA, Portal Circles |
| Copy/mailto email invites | Member broadcast lists / SMTP demos |
| Brand-first Demo Path | Pulse Poll **publish** (Hub-gated — mention only) |

Do not rebuild Discussions/Tasks/Documents/Portal as greenfield — they shipped; ground truth + PROGRESS win.

### 8. Gap Fit honesty

Platform is **demo-complete** for brand → boards → print → social. It is **not** a one-click social campaign OS. After-talk: Share Kit v0, FR caption packs, paper/Form feedback (ADR-006 — no product analytics).

---

## Decision log

| Choice | Locked | Why |
|--------|--------|-----|
| Live demo order | Brand Kit → Board Notice → Graphic Maker → Captions | Mix of offline boards + social; brand first |
| Layout modernization | Allowed when four-width fails | Revise stale “don’t change” notes in rules |
| Captions bodies | EN templates + `#LocalUnion` placeholders | Multi-union; FR chrome i18n already |
| Quiet makers BrandSetup | Amber prompt when `!themeEstablished` | Demo tools used to brand silently |
| Related tools | `RELATED_BY_TOOL` map | Discoverability without Hub |
| Over-claims | No Share Kit / no mass email in talk | Gap Fit residual |

---

## File map (agents)

| Concern | Path |
|---------|------|
| UX contract | `.cursor/rules/comms-public-ux.mdc` |
| Editor chrome register | `.cursor/rules/tool-editor-ux.mdc` |
| Run sheet (Day-of) | `docs/guides/WORKSHOP_SOCIAL_COMMS.md` |
| Gap Fit / backlog | `docs/audit/workshop-gap-fit-2026-08.md` |
| Demo Path UI | `src/components/comms/WorkshopDemoPath.tsx` |
| Brand setup href / prompt | `src/lib/utils/brand-setup.ts`, `src/components/tools/BrandSetupPrompt.tsx` |
| Export status | `src/hooks/use-export-handler.ts` → `ToolEditorLayout` |
| Related tools | `src/components/tools/RelatedToolsStrip.tsx`, `ToolRelatedFooter.tsx` |
| Workshop smoke | `e2e/workshop.smoke.spec.ts` |
| Public outline | `src/app/[locale]/guide/workshop/page.tsx` |

---

## Ops / verify

- Facilitator: Day-of URLs + offline PNG/PDF samples (run sheet)
- Automated: `npm run lint`; `npm run test:unit`; `npx playwright test e2e/workshop.smoke.spec.ts --grep "@smoke" --project=chromium`
- Manual click-path: `/en/` Demo Path → Brand Kit → Board Notice → Graphic Maker → Captions (+ FR workshop H1)

---

## Stash note (as of land)

Primary still listed (not dropped):

- `stash@{0}` — wip: workshop on main — pause for local-404  
- `stash@{1}` — wip before workshop-to-main merge  
- `stash@{2}` — wip: workshop/comms before local-404 (branch `feat/local-404-solidarity`)

Inspect before applying; prefer discard only after confirming no unique content vs `main`.
