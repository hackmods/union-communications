# Canvas visual redesign + Brand Kit stress (2026-09-07)

**Scope: within reason.** Ship hierarchy/rhythm/composition polish and proof where
it prevents broken posters — not an unbounded art direction rewrite of every tool.

## Deliverables

| # | Deliverable | Within-reason bar |
|---|-------------|-------------------|
| 1 | Visual redesign (hierarchy, rhythm, brand composition) | Shared print type rhythm; Flyer meta grid parity with Board Notice; Solidarity stack packs top→footer without dead-band clip; Graphic notice packs brand + type without meta crush |
| 2 | Brand Kit stress proof | Automated matrix: **tight density** + **wide lockup** (+ default solid) on Flyer picket, Board Notice default, Solidarity forever — `expectMetaSupport` / lead readable / copy visible |
| 3 | Meta-pack parity | Solidarity footer, Meeting lead/closer, Graphic local/footer tagged + guarded like Flyer/Board Notice (`data-canvas-meta`, in-bounds, supporting size) |

## Non-goals (this pass)

- Redesigning Meeting Background art direction beyond lead/closer meta tags + copy guards
- Exhaustive every-layout × every-Look combinatorial gallery
- Changing Brand Kit style packages (`solid` / `field` / `workshop`) definitions
- Wallet QR Card / Action Card redesign

## Engine hooks (already shipped)

- `resolvePrintPageLayout` / capped `printPageScaledTokens`
- `expectMetaSupport` / `measureMetaSupport`
- Flyer + Board Notice on the print layout API

## Implementation order

1. Tag + pack Solidarity / Meeting / Graphic for meta-pack parity
2. Visual rhythm: Flyer meta grid; Solidarity stack `flex-start`; Graphic notice packing
3. Extend `seedCanvasFonts` for density + official lockup; Brand Kit stress smoke
4. Layout-matrix guards for the three tools; unit contract where applicable
5. What's new + this audit closed with evidence

## Evidence required to close

- Unit: print layout contracts + graphic meta chrome green
- `tools.layout-matrix.smoke`: Solidarity forever meta + Meeting cold meta + Graphic cold meta
- `tools.brand-kit-stress.smoke`: tight density + wide official lockup paths green
- Commit on `main`

## Evidence (closed 2026-09-07)

| Check | Result |
|-------|--------|
| Unit graphic-layout-chrome + updates/public-copy | Pass |
| layout-matrix: solidarity / meeting / graphic / board-notice meta | Pass (6/6 targeted) |
| brand-kit-stress: tight + wide lockup | Pass |
| Within-reason visual | Flyer meta grid; Solidarity stack pack; Graphic notice pack; capped graphic metaPx |

## Residuals (deferred — inventory still accurate)

From [Audit canvas visual state](a319780e-eb8a-4502-8b22-2ff79a82a9b2) after ship `b6661c1` (inventory was partly pre-ship):

1. Solidarity **split/banner** still use `justify-between` in places (stack packing fixed).
2. Meeting bold layouts still use `justify-between` for intentional face-safe bands — not the print meta-clip class of bug.
3. Solidarity/Meeting/Graphic still do **not** call `resolvePrintPageLayout` (print Solidarity uses capped `printPageScaledTokens`; digital Meeting/Graphic use tagged meta + chrome caps).
4. `LogoContainer` `wideLockup` not wired through Meeting/Solidarity/Graphic yet — Brand Kit stress uses official lockup without that prop.
5. No exhaustive Look × layout gallery.

Earlier shell failures (stale Next PID / `ERR_CONNECTION_REFUSED`) were environment noise; targeted e2e later passed 6/6.
