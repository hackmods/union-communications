# Implementation status

Updated 2026-10-01. Branch `feat/ui-uplift`, base and prior checkpoint `fd204bb1`. This visual pass is in progress. The source and contract recovery is documented in [13_UPLIFT_BASELINE](../product-refactor/13_UPLIFT_BASELINE.md); implementation order is in [07_IMPLEMENTATION_PLAN](07_IMPLEMENTATION_PLAN.md).

## Delivered in this working checkpoint

- Home now leads with concrete outcomes (materials, workplace cases and local operations), an immediate anchor into useful work, and a separate platform path. Supporting copy names grievance preparation, agreement reference, accommodation planning, learning, and separate private/member spaces. Brand Kit is an optional reusable advantage instead of a prerequisite CTA.
- Home presents six direct tasks with canonical links to graphic creation, website templates, grievance preparation, return-to-work accommodation, meeting rules, and Officer Learning.
- Home now shows one actual localized Officer Learning module from the shipped catalog, including its real summary, self-test marker and lesson destination; no fake progress state is shown.
- Home now previews the actual RTW worksheet title, functional-limit prompt and supported accommodation measures, linked to the real tool. The preview shows no case details and its prompt/options come from the existing bilingual tool catalog.
- The notice/graphic/flyer preview is stable and visitor-selected, with local Brand Kit colours applied. Copy identifies it as a sample preview rather than a rendered application output. Page-entry motion was removed.
- A ruled two-audience platform section explains private Officer Hub work and member Portal participation. Trust copy distinguishes on-device drafts from role/module-controlled hosted spaces and links Privacy/Security.
- Platform now uses the same two-audience editorial hierarchy. Its copy separates hosted Hub access from public Brand Kit identity according to the brand bridge contract.
- Create/Learn result entries use open ruled groups; search/filter behavior is retained. Shared `PublicHubPanel` surfaces use flat white and a quieter border for Brand Kit and other workspace consumers.
- Local Portal's shared panel and loading shell now use a quiet white operational surface; station, dispatch and fronts entries keep their hit areas and use restrained color-only hover states.
- `ToolEditorLayout` now frames all shared builder forms with a flat, smaller-radius boundary; form spacing, mounted previews and mobile Edit/Preview behavior are unchanged.
- Officer Learning retains its visual theme and module cover art; the catalog card no longer lifts or zooms, and whole-card keyboard focus is visible with reduced-motion support.
- EN/FR Home and Platform copy, responsive/focus assertions, and the affected smoke expectations were updated. No API, authorization, persistence, tenancy or export-renderer change was made.

## Verification so far

- `npm run typecheck`: passed after the first-screen rewrite and real Officer Learning example.
- Full `npm run test:unit`: 3,239 passed, 2 skipped and 1 todo across 538 files at the Home/catalog/Platform checkpoint, before the later shared visual refinements.
- `npm run lint`: exits successfully but skips ESLint because the configured typescript-eslint does not support TypeScript 7. It is not an ESLint pass.
- `git diff --check`: passed after the Officer Learning example and documentation updates.
- After clarifying the preview sample label in both locales: TypeScript and the 4 focused copy/metadata/readability test files passed (46 tests).
- After flattening the shared editor form boundary: `ToolEditorLayout.test.tsx` passed (11 tests).
- After the Officer Learning card interaction change: `theme.test.ts` passed (3 tests).
- After rewriting the first-screen Home copy: TypeScript and the focused public-copy/metadata/readability suite passed (46 tests). Updated browser smoke expectations are present but not executed.
- After adding the real learning example: TypeScript and the same 46 focused copy tests passed; the EN/FR canonical lesson-link assertions are added to smoke specs but not run.
- After adding the RTW worksheet preview: `npm run typecheck` passed and the focused public-copy/metadata/readability suite passed (46 tests). EN/FR smoke assertions cover the real prompt and canonical tool route; browser smoke and rendered review remain pending.
- `npm run build`: passed after the real Officer Learning Home example and again after the RTW steward preview; all 569 static pages generated. Next still logs the existing auth-default, Edge deprecation and dynamic filesystem tracing warnings.
- Updated Home EN/FR smoke assertions are in `e2e/builders.smoke.spec.ts` and `e2e/public-discovery.smoke.spec.ts`. A 320/375/768/1280/1536 width/no-overflow matrix now covers EN/FR with axe at 320px; browser smoke was not run because the local URL is blocked by the browser tool policy.
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
3. Add a synthetic, member-safe hosted interface example. The Home communications preview is still a labeled sample renderer, not an exact application capture.
4. Run affected unit/smoke coverage, lint (reporting its skip accurately), typecheck and production build. No browser visual acceptance or accessibility conformance is claimed yet.
5. Update `docs/PROGRESS.md`, direction/pattern/migration docs and the remaining migration list from actual review findings.

Browser revalidation remains blocked under the browser tool URL policy. It needs a supported URL permission/configuration before rendered evidence can be produced. This limitation does not erase the code work above, but it prevents visual acceptance of responsive and operational surfaces. The Local Portal shell refinement is source-verified only until that acceptance is available.
