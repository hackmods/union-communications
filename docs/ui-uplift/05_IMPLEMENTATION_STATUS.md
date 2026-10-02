# Implementation status

Updated 2026-10-01. Branch `feat/ui-uplift`, base and prior checkpoint `fd204bb1`. This visual pass is in progress. The source and contract recovery is documented in [13_UPLIFT_BASELINE](../product-refactor/13_UPLIFT_BASELINE.md); implementation order is in [07_IMPLEMENTATION_PLAN](07_IMPLEMENTATION_PLAN.md).

## Delivered in this working checkpoint

- Home now leads with a task-oriented message, an immediate anchor into useful work, and a separate platform path. Brand Kit is an optional reusable advantage instead of a prerequisite CTA.
- Home presents six direct tasks with canonical links to graphic creation, website templates, grievance preparation, return-to-work accommodation, meeting rules, and Officer Learning.
- The notice/graphic/flyer preview is stable and visitor-selected, with local Brand Kit colours applied. Copy identifies it as a sample preview rather than a rendered application output. Page-entry motion was removed.
- A ruled two-audience platform section explains private Officer Hub work and member Portal participation. Trust copy distinguishes on-device drafts from role/module-controlled hosted spaces and links Privacy/Security.
- Platform now uses the same two-audience editorial hierarchy. Its copy separates hosted Hub access from public Brand Kit identity according to the brand bridge contract.
- Create/Learn result entries use open ruled groups; search/filter behavior is retained. Shared `PublicHubPanel` surfaces use flat white and a quieter border for Brand Kit and other workspace consumers.
- Local Portal's shared panel and loading shell now use a quiet white operational surface; station, dispatch and fronts entries keep their hit areas and use restrained color-only hover states.
- `ToolEditorLayout` now frames all shared builder forms with a flat, smaller-radius boundary; form spacing, mounted previews and mobile Edit/Preview behavior are unchanged.
- EN/FR Home and Platform copy, responsive/focus assertions, and the affected smoke expectations were updated. No API, authorization, persistence, tenancy or export-renderer change was made.

## Verification so far

- `npm run typecheck`: passed after homepage, catalog and Platform implementation.
- Full `npm run test:unit`: 3,239 passed, 2 skipped and 1 todo across 538 files. The focused Home/copy/nav/accessibility group separately passed 53 tests.
- `npm run lint`: exits successfully but skips ESLint because the configured typescript-eslint does not support TypeScript 7. It is not an ESLint pass.
- `git diff --check`: passed after the Portal operational-surface refinement.
- After clarifying the preview sample label in both locales: TypeScript and the 4 focused copy/metadata/readability test files passed (46 tests).
- After flattening the shared editor form boundary: `ToolEditorLayout.test.tsx` passed (11 tests).
- `npm run build`: passed on this visual diff, including type generation and route output. Next also prints existing auth-default and dynamic snippet-filesystem tracing warnings.
- `npm run typecheck`: passed on the final canonical-link implementation.
- Updated Home EN/FR smoke assertions are in `e2e/builders.smoke.spec.ts` and `e2e/public-discovery.smoke.spec.ts`; browser smoke was not run because the local URL is blocked by the browser tool policy.
- The browser tool previously denied this local URL under its URL policy. No viewport screenshots of the new UI or keyboard walkthrough have been captured in this checkpoint.

## Earlier rendered baseline (before this visual diff)

These observations describe the old interface and are not acceptance evidence for the new one.

| Surface | Earlier inspected state | Current follow-up |
|---|---|---|
| Home | EN desktop and FR phone | New layout awaits rendered EN/FR review across viewport matrix. |
| Create / Learn | EN catalog | Open result rows are implemented; filter, no-results, URL and phone states await rendered review. |
| Brand Kit | Unconfigured/hydrating workspace | Shared panels are flatter; hydration, configured and failure states need review. |
| Graphic Maker | Default Member Spotlight form/output | Shared editor contracts are preserved; French and phone editing/preview remain to verify. |
| Steward worksheet | Empty RTW/accommodation intake | No domain form change; confirm reading order and medical-privacy guidance remain clear. |
| Platform | Two text-led panels | Two audience sections and source-correct copy are implemented; review in browser. |
| Officer Hub | Synthetic Local 777 president | Shared shell foundation is present; role/module/MFA states and compact layout remain to verify. |
| Local Portal | Synthetic officer Together view | Officer view does not prove member permissions; a synthetic member-safe view is required. |

## Remaining before completion

1. Visually review Home and Platform in EN/FR at 320, 375, 768, 1280 and 1536px, including zoom, reflow and keyboard behavior.
2. Review all nine named representative surfaces, retaining screenshots or a concise evidence record and checking actual saved/error/empty states.
3. Refine or replace marketing examples with verifiable real application states. The existing Home communications preview is a labeled sample renderer; it does not by itself demonstrate steward or hosted product depth.
4. Run affected unit/smoke coverage, lint (reporting its skip accurately), typecheck and production build. No browser visual acceptance or accessibility conformance is claimed yet.
5. Update `docs/PROGRESS.md`, direction/pattern/migration docs and the remaining migration list from actual review findings.

Browser revalidation remains blocked under the browser tool URL policy. It needs a supported URL permission/configuration before rendered evidence can be produced. This limitation does not erase the code work above, but it prevents visual acceptance of responsive and operational surfaces. The Local Portal shell refinement is source-verified only until that acceptance is available.
