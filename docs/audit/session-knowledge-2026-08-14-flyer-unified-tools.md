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

Flyer exposes font stacks / case / typeScale because handouts need outdoor readability. Other tools correctly inherit Brand Kit `canvas` tokens. Do not add font pickers to Graphic Maker / Quote Card / wallet tools “for parity.”

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

- FR caption body packs (content project)
- Provenance / watermark on anonymous canvas exports (strategic)
- Calendar RSVP → flyer QR deep embed
- Expanding Flyer-style typography pickers to other print tools (explicit product ask)
- Unrelated local dirty: `e2e/helpers/axe.ts` (do not assume it belongs in Comms commits)
