# Lighter Comms designs: follow-through

The three Design treatments, saved Looks, and public Office output landed on local `main` in `7503fa29`. This document tracks acceptance work after that implementation. It is about the public, browser-local Comms tools; Officer Hub exports, Image Resizer, Logo Builder, and Website Template are outside this change.

## Acceptance matrix

| Area | Current evidence | Remaining acceptance |
|------|------------------|----------------------|
| Fresh and stored Brand Kits | Fresh Balanced and legacy Full browser checks; blocked storage warning; first-visit hydration race fixed | Steward confirmation of the CAAT-S coral appearance |
| Looks | Starter count, saved Look/colour/logo unit checks, CUPE browser switching, and Local pack import/export pass | Visual check of CAAT-S coral and uploaded logos |
| Maker state | Browser smoke covers Flyer override, undo, reset; treatment in all maker states | Human sample of remaining geometry classes |
| Raster and print | `@export` matrix: coral flyer (+PDF), dark graphic, light board, coral wallet, photo spotlight, long French flyer | Steward eye-check of small print and photo layouts |
| Office | DOCX/DOTX/XLSX/PPTX package checks for all treatments with long French body; white RSVP entry rows stay off the brand band | Open a few files in desktop Office if desired |
| Accessibility | Arrow/Home/End keyboard path on `SegControl`; narrow French editor; axe contrast on the treatment radiogroup for light and dark kits | Chair/president visual sign-off |
| Human review | Chair/president feedback is the design target | Ask a steward to confirm Balanced visibly reduces CAAT-S coral while retaining identity |

## Phase 1 — Brand Kit and persistence

**Status:** Complete. Six serial Chromium smoke checks, focused unit checks, typecheck, and lint pass. The first-visit store now shows queued preset/colour edits immediately and preserves edits or Local pack imports when host defaults finish loading.

## Phase 2 — Composition and export matrix

**Status:** Complete in automation. `e2e/design-treatment.fidelity.spec.ts` (`@export`) covers coral / dark / light palettes across flyer, graphic, board notice, and wallet; adds photo spotlight consent upload and long French flyer copy; asserts Balanced/Mostly white increase near-white share on coral flyer; preview↔capture↔PNG (and PDF on flyer) agree per treatment.

## Phase 3 — Office and accessibility

**Status:** Complete in automation. Office package tests carry long French through Word/template/slide and keep worksheet entry rows off the brand band. `SegControl` supports radiogroup arrow/Home/End with roving tabindex. Smoke covers keyboard path plus axe contrast on the treatment control for dark and light kits.

## Sign-off and deferred operations

- Steward visual sign-off on CAAT-S Balanced is pending human review.
- CI and pipeline repair are deferred to Ryan. Local typecheck, relevant unit tests, and targeted browser checks remain the gate for each follow-through commit.
- Branch: `feat/comms-lighter-followthrough` (merge when green). Do not force-push `main`.
