# Brand Kit workspace uplift plan — 2026-09-24

**Status:** Implemented 2026-09-24. The review findings below describe the pre-change page; the implementation follows the target structure and verification criteria.

**Goal:** Make `/create/brand-kit` feel like the foundation of UnionOps Comms: a clear, spacious setup workspace with immediate feedback, especially on desktop. Keep the existing Brand Kit data, local-first persistence, multi-union presets, and downstream export behavior.

## Review findings

Reviewed the live [English Brand Kit](https://unionops.org/en/create/brand-kit/) at a 1440 × 900 viewport on 2026-09-24 and traced `src/app/[locale]/brand-kit/page.tsx` and its shared components.

1. **The work starts too low.** The heading, Local pack callout, two-column explanation, and completion bar place the first editable panel around **637 px** down the page. The first viewport shows little of the actual work. The “Start setup” link sends a person already in Brand Kit to a separate journey.
2. **Equal cards squeeze unequal jobs.** At desktop widths the page uses `lg:grid-cols-2 xl:grid-cols-3`. At 1440 px, the Union preset, Current settings, and Logo panels are each about **396 px** wide. Collection editing, colour controls, and conditional OPSEU identity galleries need more room than that; the three cards also create an uneven reading order and a tall first row.
3. **Feedback is detached from editing.** Canvas style begins around **1493 px** down the page and its preview sits below a long sequence of style and font controls. Website and membership links begin around **2699 px**. A person cannot readily see the logo, local name, colours, and type choices together while making changes.
4. **The information hierarchy blurs essentials and extras.** The completeness bar calls optional links, canvas style, and signature name “missing,” while the page itself describes them as optional. Display preferences for the browser are presented as another Brand Kit panel at the end, although they affect the site UI rather than the local identity.
5. **Component boundaries reflect accumulation.** The page owns preset selection, profile editing, colour editing, logo mode, canvas style, links, and display settings. `BrandKitCanvasPanel` owns both many controls and the visual preview. `PublicHubPanel` and the canvas `Card` have different surface treatments. Current layout smoke checks overflow and gallery fit, but not first-task visibility or preview adjacency.

These are layout and workflow findings, not evidence that the stored Brand Kit or export engine is broken. The live geometry is a baseline to improve, not a hard pixel requirement across fonts and locales.

## Target experience

### Page structure

1. **Compact page header:** H1, one-sentence purpose, unobtrusive on-device/save status, and utility actions. Put Local pack under a clearly named “Move to another browser” action. Keep Reset to defaults visually secondary and require a clear confirmation before erasing a configured kit.
2. **Setup orientation within the workspace:** a concise readiness summary with a direct link to the next *essential* field. Remove the broad “what you set / what it unlocks” band and circular “Start setup” CTA from the editor. Keep Brand Assets and learning links near the relevant logo/help section or in a short closing row.
3. **Identity first:** union preset and conditional sector/identity pack, local number and collection identity, colours, then logo. Give multi-profile and OPSEU-specific galleries enough horizontal space. Keep campaign badge near the identity or optional campaign subsection, rather than as an always-prominent first-screen field.
4. **Live preview beside editing:** at `xl` and above, use a roughly two-thirds editor / one-third preview composition inside `PAGE_SHELL.wide`. The preview can stick below the site header but must remain bounded by its section and never cover the footer. It shows the actual selected logo, local number/sub-text, colours, and a representative export treatment. At smaller widths, place the preview after the essential identity controls with a direct “View preview” jump; do not hide the only preview behind a tab.
5. **Finishing sections:** Canvas style, website/social links, membership application links, and optional letter signature follow identity in that order. Put browser display preferences in a clearly separate “Display settings” section or link to the existing settings surface. Avoid treating them as Brand Kit completeness criteria.

### Responsive composition

| Width | Composition |
|---|---|
| ~375 px | One column; header utilities wrap; full-width touch targets; preview follows essentials; no horizontal scroll. |
| ~768 px | One main column with simple field pairs where they fit; conditional galleries remain full width. |
| ~1280 px | Two-zone layout only if editor and preview retain usable minimum widths; otherwise stack. Do not force the current three equal cards. |
| ~1536–1920 px | Wide shell, comfortable editor plus sticky preview. Use width for the work, not extra empty margins or more narrow cards. |

The page should use existing `PageShell` / `TOOL_COMPOSITION.editor.shell`, `PublicHubPanel` or a design-system `Card` variant, shared `ButtonLink`, and `PUBLIC_*_TITLE_CLASS` tokens. Align surface, spacing, and type with the current public site design-system rule; do not introduce a new card or CTA dialect.

## Implementation sequence

### 1. Establish the shell and first-task hierarchy

- Refactor `src/app/[locale]/brand-kit/page.tsx` into named sections with stable anchors and logical DOM/tab order. Replace the three equal top cards with an identity workflow that stays roomy at 1280–1920 px.
- Consolidate introductory copy, Local pack, progress, and actions. The first editable identity control should be visible without scrolling at a typical 900 px desktop height.
- Keep status honest during hydration. Autosave remains on-device by default; show storage-blocked feedback and a meaningful save state without implying the configuration is shared across devices.

### 2. Separate preview from canvas controls

- Extract the preview rendering from `BrandKitCanvasPanel` into a reusable, presentational Brand Kit preview component. Keep token resolution, logo display, QR treatment, and surface rendering on the existing canvas helpers; do not fork the export implementation.
- Keep style choices as an editor section. Group style package and typefaces before less common alignment/density/surface controls; retain all existing token choices and defaults. The preview should update as a selection changes and remain legible at its narrower desktop width.
- Check the preview against the real Graphic Maker / board export look so it represents output without promising exact pixel parity for every tool.

### 3. Clarify form groups and readiness

- Rehouse existing `UnionPresetSelect`, `OpseuSectorSelect`, `IdentityPackPicker`, `CollectionProfilesEditor`, `ThemePicker`, `LogoSettings`, `LocalLinksEditor`, and `MembershipUrlsEditor`; preserve their state transitions and preset replacement rules.
- Review the progress language with `brand-kit-completeness.ts`: identify the minimum usable identity separately from optional enhancements, or rename the percentage so optional choices are not presented as blockers. Never suggest that an official logo is bundled for a union unless its licensing and preset permit it.
- Keep colour contrast advice, logo upload safety, low-contrast confirmation, and Local pack migration path visible at the point of use. Confirm Reset to defaults is recoverable through a Local pack export where available; do not silently clear a configured kit.

### 4. Finish navigation, copy, and accessibility

- Provide short in-page section navigation for Identity, Style, Links, and Display when it helps with the long form. Anchors need `scroll-mt-28`, visible focus, and descriptive section headings. Avoid a wizard that hides later controls or makes editing a completed kit harder.
- Update both `messages/en.json` and `messages/fr.json` after reading existing values in both languages. Use the public copy and design-system rules; preserve public route and SEO metadata.
- Ensure all controls can be reached and operated by keyboard. Confirm radiogroup names, selected states, native colour/hex input labels, help-text association, live preview announcement restraint, 200% zoom, high-contrast mode, and reduced motion.

## Acceptance criteria

- At 1440 × 900, an editable essential field and a useful Brand Kit preview are visible in the first viewport; neither is a clipped sliver. At 1280 and 1536, the editor is materially wider than today's ~396 px card columns.
- No horizontal overflow or clipped controls at 375, 768, 1280, 1536, or 1920 px, including long French labels, multi-profile collections, OPSEU identity-pack galleries, and 200% zoom.
- The visual and keyboard order matches the task: choose identity → set local details/colours/logo → see result → adjust style → add optional links. The preview never obscures inputs or footer content.
- Existing Brand Kit JSON/local storage, preset switching, custom logos, collection profiles, membership URLs, canvas tokens, and downstream exports continue to work without migration.
- Progress wording distinguishes usable essentials from optional polish. Screen-reader users receive one clear save/storage status, and reset cannot occur accidentally.
- EN and FR are reviewed in context. A first-time comms user can identify where to enter their local number and logo without leaving the Brand Kit page.

## Verification before shipping

1. Update `e2e/brand-kit.layout.smoke.spec.ts` for the canonical route and the new section/preview structure. Keep the existing OPSEU gallery and membership-audience assertions; add a small, meaningful first-screen and preview-adjacency check rather than brittle full-page coordinates.
2. Exercise fresh kit, saved returning kit, multiple collections, each preset family, custom upload, low-contrast colours, blocked storage, reset, Local pack, and a second browser. Confirm no cross-browser/shared-profile claim.
3. Visual review at 375 / 768 / 1280 / 1536 / 1920, EN/FR, default and enlarged text. Use keyboard and an actual screen reader for the long-form flow; axe and no-overflow checks are supporting evidence.
4. Run lint, typecheck, focused Brand Kit unit/layout smoke, then the repo's unit and smoke suites for this multi-file change. Verify Graphic Maker and one print export consume the same configured identity. Add the steward-facing `/updates` note and update `docs/PROGRESS.md` when implemented.

## Implementation verification — 2026-09-24

- At 1440 × 900, the local number field and live preview are visible together; a 1280 × 800 check also keeps both in the first viewport. Checked widths 320, 375, 640, 1280, 1536, and 1920 with no horizontal page overflow; French was checked at 375.
- The complete desktop and mobile Brand Kit browser suite passed (10/10), including first-screen geometry, live preview updates, reset confirmation, OPSEU identity galleries, membership audiences, and mobile overflow.
- Follow-up checks cover a saved kit after reload and a fresh second browser, Local pack routing, French keyboard access to the preview, 720/320 CSS-pixel reflow, forced colours, reduced motion, and serious/critical axe findings. The returning-kit check revealed and fixed a missing saved marker after reload.
- Nearby Graphic Maker PNG and Flyer Maker PDF export smoke checks passed (2/2).
- Typecheck and lint passed (lint has two existing warnings in unrelated files). The final full unit suite passed (2451 passed, 1 skipped); focused completeness/copy/update and store checks also passed.
- The broad smoke suite was attempted. An unrelated document-generator route test failed repeatedly; a second run excluding it encountered unrelated grievance and Portal casework failures. The Brand Kit browser suite remains green. Actual screen-reader and browser-zoom review remain manual acceptance checks; the narrower CSS-pixel and axe checks above cover automated reflow and structure.

## Scope guardrails

- Do not change Brand Kit storage schema or introduce a Hub sync workflow in this UI pass.
- Do not alter union preset data, OPSEU licensing rules, canvas export math, or other tools' layouts to solve this page's density.
- Keep the canonical `/create/brand-kit` route and local-first Comms promise. Any follow-up to shared brand profiles needs a separate product/security decision.
