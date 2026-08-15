# Session knowledge — 2026-08-14 (Flyer Maker QOL + unified tools)

**Audience:** future agents + Ryan.  
**Companion:** [`current-ground-truth.md`](current-ground-truth.md), [`workshop-gap-fit-2026-08.md`](workshop-gap-fit-2026-08.md), [`../modules/COMMS_VISUAL_SYSTEM.md`](../modules/COMMS_VISUAL_SYSTEM.md), [`../PROGRESS.md`](../PROGRESS.md).  
**Landed on:** `main` — `da1f669` (Flyer Maker QOL v2) → `23e819d` (unified chrome + Share Kit v0).

---

## What happened

Two product trains in one session:

1. **Flyer Maker QOL v2** — the Print-channel handout tool was a single letter template; upgraded into a real print utility (layouts, paper sizes, system fonts, presets, QR/photo, invite email).
2. **Unified Comms tools experience** — audit siblings for accidental chrome gaps vs intentional channel differences; close gaps in four waves; ship **Share Kit v0** as an orchestrator (no new canvas).

---

## What shipped

### Flyer Maker QOL v2 (`da1f669`)

| Area | Outcome |
|------|---------|
| Layouts | `stack` / `band` / `split` / `photoHero` via [`flyer-layouts.tsx`](../../src/components/tools/flyer-layouts.tsx) |
| Paper | letter / half-letter / tabloid — preview aspect + PDF inches ([`flyer-formats.ts`](../../src/lib/comms/flyer-formats.ts)) |
| Fonts | System stacks only (ADR-014): Impact, condensed, clean, slab, serif ([`flyer-fonts.ts`](../../src/lib/comms/flyer-fonts.ts)) |
| Typography | Headline case + local typeScale override on Brand Kit tokens ([`flyer-tokens.ts`](../../src/lib/comms/flyer-tokens.ts)) |
| Presets | picket / rally / meeting / walkabout ([`flyer-presets.ts`](../../src/lib/comms/flyer-presets.ts)) |
| QR / photo | Optional `CanvasQrPlate`; photo + `ConsentModal` on photo-capable layouts |
| Invite | `InviteEmailPanel` + [`fieldsFromFlyer`](../../src/lib/comms/event-email-from-flyer.ts) (later moved to footer in unified pass) |
| Tests | [`flyer-maker.test.ts`](../../src/lib/comms/flyer-maker.test.ts) |

### Unified tools Waves 1–4 (`23e819d`)

| Wave | Outcome |
|------|---------|
| 1 Chrome | `purposeHint` / `previewActions` / BrandSetup-in-`toolbar` on pulse-poll, board-banner, action-card, qr-board; Resizer `ConsentModal`; Flyer invite → footer |
| 2 Primitives | [`ToolColourSection`](../../src/components/tools/ToolColourSection.tsx), [`ToolExportActions`](../../src/components/tools/ToolExportActions.tsx); board-notice options collapse; shell checklist in `tool-editor-ux.mdc` |
| 3 Packs | Channel packs doc + [`channel-packs.ts`](../../src/lib/comms/packs/channel-packs.ts); `?preset=` deep links on action-card / qr-board / solidarity / meeting-background |
| 4 Share Kit | [`/tools/share-kit`](../../src/app/[locale]/tools/share-kit/page.tsx) — seed → Graphic Maker (`?preset=`) → Captions → optional Resizer |

---

## Hard lessons (do not re-learn)

### 1. Shell vs layout vs channel packs — three layers, not one engine

```
Shell (mandatory TEL contract)
  → Channel packs (Print / Social / Board / Wallet compose features)
    → Per-tool layout IDs (never collapse into one layout engine)
```

Do **not** invent `ToolDesignControls` mega-components or a unified layout engine. Visual-system rule #2 still holds: layout IDs stay per-tool; style packages set **tokens only**.

### 2. Flyer is the Print reference — not the typography mandate for every tool

Flyer exposes font stacks / case / typeScale because handouts need outdoor readability. Other tools correctly inherit Brand Kit `canvas` tokens. Do not add font pickers to Graphic Maker / Quote Card / wallet tools “for parity.” See **Cross-tool comparison** below.

### 3. ADR-014 fonts — system stacks only

User chose **1A**: Impact / Arial Narrow / system-ui / Rockwell / Georgia stacks inside the **capture root**. No Google Fonts, no `next/font/local` unless an explicit later product decision + licensed files in-repo.

### 4. ThemePicker already includes ContrastChecker

Wave 3 “add ContrastChecker to ThemePicker tools” is mostly satisfied by adopting `ToolColourSection` (wraps ThemePicker). Quote-card still adds a **text-colour** ContrastChecker on top — that is intentional. Do not double-wrap ThemePicker’s built-in checkers.

### 5. BrandSetup must live in a single `toolbar=` prop

Still true from workshop session knowledge: never inject a second `toolbar=` sibling. Pulse-poll / board-banner had BrandSetup buried in the form body — moved into `toolbar`. Flyer presets + BrandSetup compose in one toolbar wrapper.

### 6. InviteEmailPanel slot = footer

Graphic Maker and Board Notice put invite panels in the `footer` slot with `ToolRelatedFooter`. Flyer initially appended the panel under the form; unified pass standardized on **footer**. Keep that convention.

### 7. French typography guards bite `:` and `;`

`public-copy-style.test.ts` requires a space before `:` and `;` in FR leaves (`dirigeants ; les membres`). SEO descriptions must sit in **95–165** chars (`public-page-meta.test.ts`). Shorten FR Share Kit meta aggressively.

### 8. PowerShell has no bash heredoc

On Windows agent shells, `git commit -m "$(cat <<'EOF'…)"` fails. Use sequential `-m "title" -m "body"` flags instead.

### 9. Commit only the train — leave unrelated dirty files

This session left `e2e/helpers/axe.ts` unstaged (axe rule tweak unrelated to Comms chrome). Stage by path; do not `git add -A` when other WIP sits in the tree. Pulse Poll Hub-gating (`fede32d`) landed as a separate prior commit on the same branch.

### 10. Share Kit is orchestration, not a canvas

Gap Fit residual “Share Kit v0” is **closed**. The route does not export PNG/PDF itself — it deep-links Graphic Maker with `TOOL_PRESETS` keys (`strikeAction`, etc.) that Graphic Maker already understands via `?preset=`. Do not rebuild a third social canvas “because Share Kit feels empty.”

### 11. Intentional non-gaps (do not “fix”)

| Keep different | Why |
|----------------|-----|
| Social PNG-first vs print PDF/ZIP | Channel |
| document-generator / alt-text layout exceptions | Documented in tool-editor-ux |
| logo-builder without BrandSetupPrompt | Tool *is* brand setup |
| board-notice Brand Kit–direct colours (no ThemePicker) | Workplace notices stay on Brand Kit |
| Pulse Poll publish Hub-gated | Advanced / later for workshops |

---

## Decision log

| Choice | Locked | Why |
|--------|--------|-----|
| Flyer fonts | System stacks (1A), not `next/font/local` | ADR-014 + capture-safe |
| Flyer scope | Full stretch (2C): layouts + sizes + fonts + QR + photo + InviteEmail | Only physical Print handout tool |
| Colour UI | `ThemePicker` via `ToolColourSection` for override tools; Flyer keeps `BrandSwatchPicker` | Existing patterns |
| Invite slot | Footer | Match graphic / board-notice |
| Share Kit | Orchestrator route under Social pack | Gap Fit; no new canvas engine |
| Typography expansion | Flyer only for now | Channel pack rule |

---

## Cross-tool comparison — fonts, layouts, placement

Use this table when auditing “parity gaps.” **Same shell chrome ≠ same design controls.** Channel and capture constraints decide who gets fonts / layout pickers / where panels sit.

### Typography model

| Layer | Who owns it | What stewards pick |
|-------|-------------|--------------------|
| **Brand Kit `canvas` tokens** | `resolveCanvasTokens` — `typeScale` (`compact` / `display` / `dense`), weight, tracking, uppercase via style packages (`solid` / `field` / `workshop`) | Almost every canvas tool (Graphic, Quote, Meeting, Solidarity, wallets, boards, …) |
| **Flyer in-tool stacks** | `flyer-fonts.ts` on capture-root `fontFamily` only | Flyer Maker only: `impact` / `condensed` / `clean` / `slab` / `serif` + local `headlineCase` + `typeScaleOverride` |
| **Hardcoded UI type** | Tailwind on chrome / form labels | Never on export capture |

**Why Flyer alone has a font picker:** physical Print handouts need outdoor readability (Impact/condensed) without bundling webfonts. Social/board/wallet tools stay Brand Kit–driven so one style package restyles the whole toolkit. Expanding stacks to other print tools (e.g. board-notice, solidarity print) needs an **explicit product ask** — not shell-parity work.

**Not a gap:** Quote Card / Graphic Maker lacking a font family control. They amplify Brand Kit `typeScale` / alignment / density.

### Layout IDs (per-tool — never unify)

Same English words (`stack`, `split`, `banner`) are **coincidental labels**, not shared types.

| Tool | Layout / composition IDs | Notes |
|------|--------------------------|-------|
| **Flyer Maker** | `stack` · `band` · `split` · `photoHero` | Photo on `split` / `photoHero`; paper = letter / half-letter / tabloid |
| **Graphic Maker** | `solidarity` · `thanks` · `spotlight` · `notice` · `results` | Photo on solidarity / spotlight / thanks; Quote is a sibling tool |
| **Quote Card** | single `QuoteLayout` | No multi-layout picker |
| **Solidarity Poster** | `stack` · `split` · `banner` | Print + digital formats; QR optional |
| **Board Banner** | `slantCallout` · `centeredLockup` · `minimalStripe` (+ trim kit pieces) | Banner vs trim mode |
| **Board Notice** | **no layout picker** — letter / tabloid format only | Intentional single workplace notice composition |
| **Meeting Background** | Bold: `corner` · `lower-third` · `side-panel` · `bands`; Minimal: `masthead` · `footer` · `rails` · `upper-stack` | Face-safe; design set gates which IDs appear |
| **QR / Action Card** | size + bg mode / preset (`link` vs `reference` on QR) — not a flyer-style layout enum | Wallet pack |
| **QR Board** | grid of QR cells; format letter/tabloid | Multi-QR board, not a single lockup layout |
| **Pulse Poll** | single poll card composition | Tokens only |
| **Share Kit** | **no canvas** — orchestrates Graphic Maker layouts via `?preset=` | |

Do **not** invent a shared `LayoutId` union or `ToolDesignControls` that maps Flyer `stack` ↔ Solidarity `stack`.

### Placement — chrome vs canvas geometry vs panels

Three different “placement” questions; agents often conflate them.

#### A. Editor chrome (where controls live in TEL)

| Slot / pattern | Convention | Examples |
|----------------|------------|----------|
| `toolbar` | BrandSetup (+ presets when present) — **one** `toolbar=` | Flyer presets+BrandSetup; pulse-poll / board-banner BrandSetup moved here |
| Form body | Content + design SegControls | Layout / font / paper on Flyer; layout on Graphic / Meeting / Solidarity |
| `footer` | InviteEmailPanel + `ToolRelatedFooter` | Graphic notice, board-notice, Flyer (after unified pass) |
| `previewActions` | Export buttons | Prefer `ToolExportActions` |
| `purposeHint` | One-line channel purpose | Required shell checklist |

#### B. Canvas geometry (where content sits in the export)

| Concern | Owner | Notes |
|---------|-------|-------|
| Alignment of type blocks | Brand Kit `alignmentBias` (`start` / `center` / `asymmetric`) | Most tools via `CanvasTypeBlock` / `textAlignFromBias` |
| QR plate chrome | Brand Kit `qrPlate` (`white-card` / `inset` / `flush`) | `CanvasQrPlate`; wallet QR often stays optically centered |
| Photo | Per-layout + ConsentModal | Graphic / Flyer / Solidarity / Resizer — gate upload on consent |
| Meeting face-safe | Layout ID + edge-clearance | Content stays out of webcam crop; Bold vs Minimal sets |
| Board Banner trim | Trim kit toggles (top/side/bottom/corner) | Physical board rails, not text alignment |

#### C. Channel affordances (feature placement by pack)

| Affordance | Print | Social | Board | Wallet |
|------------|-------|--------|-------|--------|
| System font family picker | Flyer **yes** | no | no | no |
| Multi layout SegControl | Flyer **yes** | Graphic / Meeting **yes** | Solidarity / Banner **yes**; Notice **no** | size/preset, not layout enum |
| Paper / sheet size | Flyer + Doc Gen; Notice letter/tabloid | platform aspects | letter/tabloid common | wallet sizes |
| InviteEmailPanel (footer) | Flyer (event-like) | Graphic notice | Board Notice | — |
| Photo + consent | Flyer (photo layouts) | Graphic / Resizer | Solidarity (digital) | — |
| Optional QR | Flyer | — | Solidarity / QR Board | QR Card / Action Card |

### Parity checklist (before “adding for consistency”)

1. Is the missing control a **shell** gap (`purposeHint` / BrandSetup-in-toolbar / exportSuccess)? → Fix.
2. Is it a **channel** feature (font picker, paper size, InviteEmail)? → Only if the channel pack table says yes.
3. Is it a **layout ID** from another tool? → Do not port; add a new per-tool ID if the product needs a new composition.
4. Is typography “missing”? → Check Brand Kit canvas tokens first; Flyer stacks are the exception.

---

## File map (agents)

| Concern | Path |
|---------|------|
| Flyer page | `src/app/[locale]/tools/flyer-maker/page.tsx` |
| Flyer canvas | `src/components/tools/flyer-layouts.tsx` |
| Flyer libs | `src/lib/comms/flyer-{formats,fonts,layouts,tokens,presets}.ts` |
| Colour / export primitives | `src/components/tools/ToolColourSection.tsx`, `ToolExportActions.tsx` |
| Channel packs | `src/lib/comms/packs/channel-packs.ts` + COMMS_VISUAL_SYSTEM “Channel packs” |
| Share Kit | `src/app/[locale]/tools/share-kit/page.tsx` |
| Shell checklist | `.cursor/rules/tool-editor-ux.mdc` |
| Related tools | `src/components/tools/RelatedToolsStrip.tsx` (`share-kit` entry) |
| Gap Fit | `docs/audit/workshop-gap-fit-2026-08.md` (Share Kit marked shipped) |

---

## Ops / verify

```bash
npm run lint
npm run test:unit -- src/lib/comms/flyer-maker.test.ts src/lib/comms/packs/channel-packs.test.ts src/lib/comms/public-copy-style.test.ts src/lib/seo/public-page-meta.test.ts
```

Manual: `/en/tools/flyer-maker` (preset → paper size → PDF); `/en/tools/share-kit` (seed → Graphic Maker); pulse-poll Preview tab exports; Resizer upload consent gate.

---

## Open residuals (not this train)

- **Phase 9 — export integrity (planned):** Flyer PDF confirmed unstyled vs preview (2026-08-14); add fidelity harness + Playwright download smoke — [`TOOL-008`](execution-backlog.md) / [`TOOL-009`](execution-backlog.md), [`docs/ROADMAP.md`](../ROADMAP.md) Phase 9
- FR caption body packs (content project)
- Provenance / watermark on anonymous canvas exports (strategic)
- Calendar RSVP → flyer QR deep embed
- Expanding Flyer-style typography pickers to other print tools (explicit product ask)
- Unrelated local dirty: `e2e/helpers/axe.ts` (do not assume it belongs in Comms commits)
