# Implementation status

Updated 2026-10-02. Branch `feat/ui-uplift`, base and prior checkpoint `fd204bb1`. The first implementation checkpoint is pushed, but the full uplift is not complete. The current completion audit identifies presentation and acceptance gaps below. The source and contract recovery is documented in [13_UPLIFT_BASELINE](../product-refactor/13_UPLIFT_BASELINE.md); implementation order is in [07_IMPLEMENTATION_PLAN](07_IMPLEMENTATION_PLAN.md).

## Delivered in this working checkpoint

- Home now leads with concrete outcomes (materials, workplace cases and local operations), an immediate anchor into useful work, and a separate platform path. Supporting copy names grievance preparation, agreement reference, accommodation planning, learning, and separate private/member spaces. Brand Kit is an optional reusable advantage instead of a prerequisite CTA.
- Home presents six direct tasks with canonical links to graphic creation, website templates, grievance preparation, return-to-work accommodation, meeting rules, and Officer Learning.
- Home now shows one actual localized Officer Learning module from the shipped catalog, including its real summary, self-test marker and lesson destination; no fake progress state is shown.
- Home now previews the actual RTW worksheet title, functional-limit prompt and supported accommodation measures, linked to the real tool. The preview shows no case details and its prompt/options come from the existing bilingual tool catalog.
- A prior authenticated Hub capture revealed that the French global navigation wrapped its last links at 1280px. Desktop nav links now prevent wrapping and use tighter horizontal spacing from 1280px; an EN/FR smoke assertion records the expected one-row layout. The EN/FR navigation smoke assertion has passed.
- The Hub and global site bars each have a mobile drawer. Their visible labels now distinguish site navigation (“Menu”) from Hub module/tools navigation (“Tools” / “Outils”); the Hub drawer keeps its full localized accessible name.
- The notice/graphic/flyer preview is stable and visitor-selected, with local Brand Kit colours applied. Copy identifies it as a sample preview rather than a rendered application output. Page-entry motion was removed.
- A ruled two-audience platform section explains private Officer Hub work and member Portal participation. Trust copy distinguishes on-device drafts from role/module-controlled hosted spaces and links Privacy/Security.
- Platform now uses the same two-audience editorial hierarchy. Its copy separates hosted Hub access from public Brand Kit identity according to the brand bridge contract.
- Create/Learn result entries use open ruled groups; search/filter behavior is retained. Shared `PublicHubPanel` surfaces use flat white and a quieter border for Brand Kit and other workspace consumers.
- Local Portal's shared panel and loading shell now use a quiet white operational surface; station, dispatch and fronts entries keep their hit areas and use restrained color-only hover states.
- `ToolEditorLayout` now frames all shared builder forms with a flat, smaller-radius boundary; form spacing, mounted previews and mobile Edit/Preview behavior are unchanged.
- Officer Learning retains its visual theme and module cover art; the catalog card no longer lifts or zooms, and whole-card keyboard focus is visible with reduced-motion support.
- EN/FR Home and Platform copy, responsive/focus assertions, and the affected smoke expectations were updated. No API, authorization, persistence, tenancy or export-renderer change was made.

## Verified evidence

- Previous full unit checkpoint: 538 files, 3,240 passed, 2 skipped and 1 todo. Focused editor, learning-theme, copy and locale checks also passed after their respective changes.
- At commit `abc398ee`: typecheck and production build passed (569 static pages). Lint exits 0 by intentionally skipping ESLint under TypeScript 7; this is not an ESLint pass. Existing Edge-runtime and filesystem-tracing warnings remain.
- Public discovery and mobile-menu suites: 26 passed. Representative Brand Kit, RTW and Graphic Maker checks: 3 passed. Home EN/FR and Brand Kit axe checks: 3 passed. Additional contrast-enabled axe scans found no violations on Home EN/FR, Platform EN/FR and synthetic member Portal.
- Review covered all nine named surfaces: Home, Create, Learn, Brand Kit, Graphic Maker, RTW, Platform, Officer Hub and member Portal. These were representative states, not an exhaustive domain-state audit. Synthetic Hub/Portal captures contain demo warnings and have not been published as marketing images.
- Next development now explicitly allows the exact loopback alias `127.0.0.1`, restoring hydration and search on the local preview. A malformed generated dev types cache was removed with the server stopped; source typecheck then passed.
- The latest focused responsive run passed 5 tests: Home and Platform in both locales at 320, 375, 768, 1280 and 1536px, each also at 320px with the shared text scale set to 2; plus the French first-screen CTA test. These new checks found and drove fixes for long-word wrapping, a nonshrinking preview link, preview labels and the selector layout.
- Doubled text is a text-resize check, not a browser-zoom or assistive-technology audit. Screenshots at 320/1280 and doubled text are emitted into Playwright's ignored `test-results` output.
- After the text-reflow repair, typecheck and the Home preview unit test passed; lint still exits through the existing TypeScript 7 skip.
- After the hosted examples/live Brand Kit diagram: typecheck passed; 46 copy/metadata tests and 34 release-note/public-copy tests passed. Seven browser checks passed, covering EN/FR Home/Platform widths, doubled text, actual image loading/phone-source selection, French CTA and Home axe checks.
- The older catalog width loop covers English at 375, 768, 1280 and 1536px. Dedicated French search/navigation tests passed, but that does not constitute a complete bilingual catalog state/width matrix.

## Completion audit: still required

1. **Visible product evidence — implemented:** Home now publishes real synthetic officer task/check-in and member Circle excerpts in both locales, with phone-specific compositions, alt text, captions and full-size links. A live Brand Kit diagram connects the saved number/palette to verified graphic, letter and website tools. Provenance and regeneration instructions are stored beside the images.
2. **Hero balance — implemented:** heading size now caps at 3.25rem; the reviewed French 1280px composition gives the example and text comparable weight. The immediate CTA and concrete breadth remain intact.
3. **Working-state acceptance:** finish the scoped phone/French editor switching and retained-value checks, catalog no-results/clear/Back, and relevant Brand Kit save/error feedback. Existing domain suites can provide evidence; do not introduce new authorization or persistence behavior.
4. **Accessibility:** verify keyboard operation of the examples and relevant changed controls, actual zoom/reflow, reduced-motion behavior, and readable expanded text. No accessibility conformance or exhaustive screen-reader validation is claimed.
5. **Handoff and gates:** reconcile the implementation plan and direction documents with the final result; record named remaining sibling migrations rather than a generic backlog. Run affected checks after further implementation changes.

The browser-review blocker is resolved. Remaining work is implementation and scoped verification, not a tooling impasse. The goal remains active.
