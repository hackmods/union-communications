# Lighter Comms designs: follow-through

The three Design treatments, saved Looks, and public Office output landed on local `main` in `7503fa29`. This document tracks acceptance work left after that implementation. It is about the public, browser-local Comms tools; Officer Hub exports, Image Resizer, Logo Builder, and Website Template are outside this change.

## Acceptance matrix

| Area | Current evidence | Remaining acceptance |
|------|------------------|----------------------|
| Fresh and stored Brand Kits | Fresh Balanced and legacy Full browser checks; blocked storage warning; first-visit hydration race fixed | Steward confirmation of the CAAT-S coral appearance |
| Looks | Starter count, saved Look/colour/logo unit checks, CUPE browser switching, and Local pack import/export pass | Visual check of CAAT-S coral and uploaded logos |
| Maker state | Browser smoke covers Flyer override, undo, reset; treatment in all maker states | Sample the other geometry classes and legacy Full appearance; check paper and Balanced with long French copy |
| Raster and print | Default Balanced PNG/PDF fidelity for Flyer, Board Notice, QR Card; Graphic and Quote pass after fixing scaled-preview test capture | Compare each treatment for representative social, print, board, and wallet outputs; inspect small print and photo layouts |
| Office | DOCX, DOTX, XLSX, PPTX ZIP/content checks pass for all three treatments | Render or open representative Word, Excel, and PowerPoint files; check white writing grids and long French text |
| Accessibility | Control uses accessible radio buttons; narrow French editor smoke passes | Contrast checks for light/dark brand colours, keyboard path, and responsive treatment examples |
| Human review | Chair/president feedback is the design target | Ask a steward to confirm Balanced visibly reduces CAAT-S coral while retaining identity |

## Phase 1 — Brand Kit and persistence

- Exercise an older stored kit in browser and confirm it opens as Full colour.
- Verify a saved Look retains colours and logo mode without changing treatment; Local pack import/export retains both.
- Verify blocked browser storage keeps the current session usable and shows the existing save warning.
- Commit test or product fixes on `feat/comms-lighter-followthrough` for Ryan to merge.

**Status:** Complete locally. Six serial Chromium smoke checks, 17 focused unit checks, typecheck, and lint pass. The first-visit store now shows queued preset/colour edits immediately and preserves edits or Local pack imports when host defaults finish loading. Lint has three pre-existing warnings outside this phase.

## Phase 2 — Composition and export matrix

- Use CAAT-S coral, a dark palette, and a light palette on representative social, print, board, and wallet canvases.
- Include a photo layout, long French text, and small print format.
- Compare preview/capture/download for Full colour, Balanced, and Mostly white. Correct illegible copy, clipping, or export differences.
- Commit fixes and evidence on `feat/comms-lighter-followthrough`.

## Phase 3 — Office and accessibility

- Inspect representative DOCX/DOTX, XLSX, and PPTX package content and rendered layouts for each treatment; preserve white form/list entry areas.
- Check keyboard, contrast, and 360 px/desktop layout for the shared control.
- Update the Comms visual-system guidance and progress record for any fixes; commit on `feat/comms-lighter-followthrough`.

## Sign-off and deferred operations

- Steward visual sign-off on CAAT-S Balanced is pending human review.
- CI and pipeline repair are deferred to Ryan. Local typecheck, relevant unit tests, and targeted browser checks remain the gate for each follow-through commit.
- `origin/main` has not been updated. The follow-through is on `feat/comms-lighter-followthrough` for Ryan to merge. A previous direct push to main was rejected by automatic approval review because external default-branch publishing was not explicitly authorized.
