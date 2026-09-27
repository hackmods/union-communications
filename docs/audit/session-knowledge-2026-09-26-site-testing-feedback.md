# Session knowledge — 2026-09-26 site testing feedback

## Brand Kit logo upload

Selecting **Upload custom logo** while `customLogoDataUrl` still holds the UnionOps platform mark used to keep that mark (`brandKitPatchForLogoMode("custom", …, mark)`), so `resolveLogoMode` snapped back to **platform** and `ImageUpload` never mounted. Fix: clear platform / UnionOps src to `""` when entering custom mode; keep a real prior upload.

## Design treatment swatches

`DesignTreatmentControl` preview squares are pointer buttons (`data-treatment`) with the grid still `aria-hidden`; SegControl radios remain the accessible control. One shared component updates Brand Kit + makers.

## Saved Looks

Looks now snapshot `designTreatment`. Apply restores it when present; older Looks omit the field. UI uses colour swatches to load; `#brand-looks` jump nav; cap messaging accounts for Looks hidden under other union presets. Full kit backup stays on Local pack.

## Complaint vs grievance score

Triple display was composition-only (static diagram + form scorecard + preview scorecard). Keep `diagrams.filterCaption` + path Callout in the form; single `ViabilityScorecard` in Draft & next steps.

## Discipline ladder by collection

Pre-disciplinary optional ladder was four fixed i18n strings. Presets live in `discipline-ladder-presets.ts` (ids only — no union names in resolvers). Defaults map from Brand Kit profile `bargainingUnitCode`; stewards can override preset or edit rungs per active collection via Brand Kit profile fields (`ladderPresetId`, `disciplineLadderCustom`). Teaching diagram in Officer Learning may still differ intentionally.
