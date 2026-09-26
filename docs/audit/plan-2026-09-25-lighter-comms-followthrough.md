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


## QOL follow-up (2026-09-25)

Shipped on `feat/comms-treatment-qol` (PR #133): shared `resolveTreatmentSurface` helper across makers, live Brand Kit primary swatches + treatment beside colours, SegControl Tab QOL for long lists, save-banner remount per `lastSavedAt`, Header logo hydrate gate. Steward CAAT-S visual sign-off remains human.

CI unblock (same PR): host-brand resolve stays on the client-safe overlay module so Docker/browser builds do not pull `postgres`; Document Generator swatch + fidelity `nearWhiteShare` + baseline audit metadata type fixes.

### Adjacent QOL / UX patterns noticed (not blockers)

These sat beside the treatment acceptance matrix. They were not Phase 1–3 blockers; several shipped in the QOL follow-up.

| Pattern | Notes | Status |
|---------|-------|--------|
| Header logo hydration flicker | SSR UnionOps mark vs client CAAT/host logo. Noisy in e2e, possible flash for stewards. Brand bridge residual, not treatment-specific. | Mitigated — Header waits for Brand Kit `hydrated` before rendering `BrandLogo` (PR #133). Residual brand-bridge edge cases still possible on first paint elsewhere. |
| Save banner sticky/stale | “Changes saved” could still be on screen from an earlier edit, so it did not always mean the last click persisted. Local pack race was fixed earlier; banner UX was still soft. | Mitigated — banner keys off `lastSavedAt` and remounts/dismisses per persist (PR #133). |
| SegControl roving tabindex | Better a11y for treatment radios (<=6 options), but Brand Kit font pickers skipped unselected options on Tab. Tab should still feel right on long font lists. | Mitigated — roving only when <=6 options (or `rovingTabIndex={false}` on Canvas font SegControls) (PR #133). |
| Out of scope by design | Logo Builder, Website Template, Image Resizer, Hub exports do not get treatments. Fine unless presidents expect “Mostly white” everywhere. | Deferred by design — document expectation; no maker migration planned unless product asks. |

### Longevity guards (2026-09-25)

- QR Board balanced frame routed through `treatmentQrBoardFrameStyle` / `TREATMENT_CHROME.qrBoardBalancedRatio`.
- Unit locks: meetingTop widths, SegControl roving threshold, Hub `brandKitInputSchema.designTreatment`, maker chrome contract test.
