# Implementation status

Updated 2026-10-02. The visual uplift implementation is complete on `feat/ui-uplift`; the latest implementation checkpoint is pushed to `origin/feat/ui-uplift`. The direction, narrative, visual system, representative adoption and residual scope are described in [00_UI_DIRECTION](00_UI_DIRECTION.md), [01_HOMEPAGE_STRATEGY](01_HOMEPAGE_STRATEGY.md), [02_VISUAL_SYSTEM](02_VISUAL_SYSTEM.md), [03_COMPONENT_PATTERNS](03_COMPONENT_PATTERNS.md) and [06_REMAINING_MIGRATION](06_REMAINING_MIGRATION.md).

## Delivered

- Home is a task-first product landing page. It demonstrates communications, a real localized Officer Learning module, a real return-to-work worksheet excerpt, and separate synthetic Officer Hub and member Portal excerpts. Visitors can reach useful tools before setting up Brand Kit or exploring hosted operations.
- The outcome-led links cover graphics/print, websites, grievance preparation, accommodation work, meetings/governance and steward learning. Create and Learn remain the full discovery catalogs.
- Brand Kit is presented as reusable local identity. The live relationship reads the saved local number and palette and links to verified graphic, letter and website tools without writing configuration or inventing sample output.
- Officer Hub and Local Portal have distinct, substantial presentations. The public excerpts show actual task/check-in and member Circle components from synthetic accounts, with localized phone/desktop compositions, honest captions, useful alternative text and separate full-size previews. Captures and provenance are documented in `public/product-previews/README.md`.
- Trust language distinguishes browser-local preparation from permissioned hosted work and links existing Trust, Privacy and Security material. It makes no absolute security claims.
- Shared public catalogs and workspace surfaces adopt open ruled results and quieter grouping. Shared builder forms, Local Portal panels and Officer Learning cards received high-leverage refinements while preserving their established task patterns and output behavior.
- Home, catalogs, Brand Kit, Graphic Maker, a return-to-work worksheet, Platform, Officer Hub and member Portal were reviewed as representative surfaces. No authorization, tenancy, persistence, API, or export-renderer behavior changed.

## Verification

- `npm run typecheck` passed against a clean generated Next development-types directory.
- `npm run build` passed and generated all 569 static pages. Existing Edge Runtime and dynamic-filesystem tracing warnings remain; the build reports that it uses the development-only fallback auth secret because this local build had no `AUTH_SECRET` configured.
- Final focused Playwright run: 12 passed. It covers English/French Home and Platform at widths 320, 375, 768, 1280 and 1536px; doubled text at 320px; responsive Home examples; keyboard selection of both localized hero examples; bilingual catalog no-results, clear and browser-Back behavior; Home accessibility scans; and the Brand Kit blocked-storage warning.
- Additional focused browser runs passed: 18 checks across Brand Kit persistence and localized/forced-colors/reduced-motion previews, RTW content, Graphic Maker download and Edit/Preview behavior across the 14 supported canvas editors. Seven earlier product-preview checks verified image loading, phone/desktop image selection and the localized first-screen CTA. Contrast-enabled axe scans found no violations on Home and Platform in English and French or on the synthetic member Portal.
- Focused bilingual copy/metadata and release-note checks passed (46 and 34 tests). The full unit suite previously passed with 538 files, 3,240 passed, 2 skipped and 1 todo.
- `npm run lint` exits successfully through the repository's TypeScript 7 compatibility guard, which skips ESLint; this is not an ESLint pass.
- `git diff --check` is part of the final pre-push check.

## Human review still useful

The headless Chromium runner ignores browser zoom keyboard shortcuts, so the 200% browser-zoom condition was not certified. Automated axe and keyboard checks are not a substitute for a human screen-reader review. The responsive matrix and 2× text-size/reflow test passed, but a reviewer should still verify actual browser zoom and screen-reader announcements before making a formal accessibility-conformance claim. This limitation does not leave implementation work blocked.

Hub role/module/MFA gating, Portal membership visibility, builder export failures and worksheet value retention remain governed by their existing domain tests and contracts; the uplift did not alter those behaviors. See [remaining migration](06_REMAINING_MIGRATION.md) for specific follow-up boundaries.
