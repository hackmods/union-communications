# Implementation status

Updated 2026-10-02. Branch `feat/ui-uplift`, base and prior checkpoint `fd204bb1`. The visual implementation and first rendered review are complete; deeper state and human accessibility review remain open. The source and contract recovery is documented in [13_UPLIFT_BASELINE](../product-refactor/13_UPLIFT_BASELINE.md); implementation order is in [07_IMPLEMENTATION_PLAN](07_IMPLEMENTATION_PLAN.md).

## Delivered in this working checkpoint

- Home now leads with concrete outcomes (materials, workplace cases and local operations), an immediate anchor into useful work, and a separate platform path. Supporting copy names grievance preparation, agreement reference, accommodation planning, learning, and separate private/member spaces. Brand Kit is an optional reusable advantage instead of a prerequisite CTA.
- Home presents six direct tasks with canonical links to graphic creation, website templates, grievance preparation, return-to-work accommodation, meeting rules, and Officer Learning.
- Home now shows one actual localized Officer Learning module from the shipped catalog, including its real summary, self-test marker and lesson destination; no fake progress state is shown.
- Home now previews the actual RTW worksheet title, functional-limit prompt and supported accommodation measures, linked to the real tool. The preview shows no case details and its prompt/options come from the existing bilingual tool catalog.
- A prior authenticated Hub capture revealed that the French global navigation wrapped its last links at 1280px. Desktop nav links now prevent wrapping and use tighter horizontal spacing from 1280px; an EN/FR smoke assertion records the expected one-row layout. Rendered confirmation is pending.
- The Hub and global site bars each have a mobile drawer. Their visible labels now distinguish site navigation (“Menu”) from Hub module/tools navigation (“Tools” / “Outils”); the Hub drawer keeps its full localized accessible name.
- The notice/graphic/flyer preview is stable and visitor-selected, with local Brand Kit colours applied. Copy identifies it as a sample preview rather than a rendered application output. Page-entry motion was removed.
- A ruled two-audience platform section explains private Officer Hub work and member Portal participation. Trust copy distinguishes on-device drafts from role/module-controlled hosted spaces and links Privacy/Security.
- Platform now uses the same two-audience editorial hierarchy. Its copy separates hosted Hub access from public Brand Kit identity according to the brand bridge contract.
- Create/Learn result entries use open ruled groups; search/filter behavior is retained. Shared `PublicHubPanel` surfaces use flat white and a quieter border for Brand Kit and other workspace consumers.
- Local Portal's shared panel and loading shell now use a quiet white operational surface; station, dispatch and fronts entries keep their hit areas and use restrained color-only hover states.
- `ToolEditorLayout` now frames all shared builder forms with a flat, smaller-radius boundary; form spacing, mounted previews and mobile Edit/Preview behavior are unchanged.
- Officer Learning retains its visual theme and module cover art; the catalog card no longer lifts or zooms, and whole-card keyboard focus is visible with reduced-motion support.
- EN/FR Home and Platform copy, responsive/focus assertions, and the affected smoke expectations were updated. No API, authorization, persistence, tenancy or export-renderer change was made.

## Verification so far

### Rendered review on 2026-10-02

- The local preview is verified at `http://127.0.0.1:3015`. Next dev had been rejecting its client assets on this loopback alias; `next.config.ts` now explicitly allows only `127.0.0.1` for development assets. This restores hydration, live search and the correct brand mark on the URL used for review.
- Rendered and reviewed Home (EN desktop, FR at 320/375/1280), Create and Learn catalogs, Brand Kit, Graphic Maker, the RTW worksheet, Platform, authenticated Officer Hub and a synthetic member-safe Local Portal view. Hub/Portal captures contain synthetic/demo data and are local review evidence only, not marketing assets.
- Moved the hero actions ahead of the longer breadth description in French. At 320×812 the primary action now ends at y=793 and remains in the first viewport; the page has no horizontal overflow. The French copy remains intact.
- `public-discovery.smoke.spec.ts` and `mobile-menu.matrix.spec.ts`: 26 passed. Coverage includes French and English Home/catalog routes, 320/375/768/1280/1536 viewport checks, focus containment/Escape and the separate public/Hub mobile menus. The catalog width loop is English; dedicated French routes and the Home first-screen check are covered separately.
- Targeted CTA and catalog viewport checks: 2 passed. Representative Brand Kit, RTW and Graphic Maker smoke checks: 3 passed. Home EN/FR and Brand Kit axe smoke checks: 3 passed.
- Axe scans with color-contrast enabled reported no violations on Home EN/FR, Platform EN/FR and the synthetic member Portal route. This does not replace manual keyboard, screen-reader or 200% zoom review.
- The public Home/Platform/catalog and shared workspace changes continue to preserve route, tenant, permission, persistence and export behavior. The stale French same-page search expectation was corrected to the canonical hash URL.

### Final checks for this checkpoint

- `npm run typecheck`: passed after stopping the preview server and clearing only its malformed generated `.next/dev` cache.
- `npm run build`: passed; all 569 static pages generated. Existing Edge-runtime deprecation and dynamic filesystem tracing warnings remain.
- `npm run lint`: exits 0 but skips ESLint because typescript-eslint does not yet support TypeScript 7; this is not an ESLint pass.
- `git diff --check`: passed before commit.

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
- After compacting the shared desktop navigation: `npm run typecheck` and `npm run build` passed; all 569 static pages generated. The French 1280px one-row assertion is in the public-discovery smoke suite but was not run in a browser.
- Current full unit suite after the Home and responsive-nav changes: 538 files passed; 3,240 passed, 2 skipped and 1 todo. `npm run lint` still exits by intentionally skipping ESLint because the configured typescript-eslint does not support TypeScript 7.
- After distinguishing the Hub mobile drawer label in EN/FR, typecheck passed and focused i18n/public-copy checks passed (30 tests). E2E menu assertions were updated but not browser-run.
- `npm run build`: passed after the real Officer Learning Home example and again after the RTW steward preview; all 569 static pages generated. Next still logs the existing auth-default, Edge deprecation and dynamic filesystem tracing warnings.
- Updated Home EN/FR smoke assertions are in `e2e/builders.smoke.spec.ts` and `e2e/public-discovery.smoke.spec.ts`. A 320/375/768/1280/1536 width/no-overflow matrix now covers EN/FR with axe at 320px; browser smoke was not run because the local URL is blocked by the browser tool policy.
- The browser tool previously denied this local URL under its URL policy. No viewport screenshots of the new UI or keyboard walkthrough have been captured in this checkpoint.
- Reviewed `docs/audit/hub-after-en-1280.png` and its EN/FR companion captures. They show the real seeded Local 777 Hub and are suitable for source review, but the development badge and demo/memory-only warnings make them unsuitable as public product imagery. No Portal capture exists in the audit assets.

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
