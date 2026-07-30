# UnionOps Production-Readiness Sweep — 2026-07-29

**Site:** [unionops.org](https://unionops.org)  
**Scope:** Optimization, cleanup, polish only — no new features, no architectural rewrites.  
**Method:** Codebase review (lint/types baseline, static analysis, path-verified findings).  
**Execution:** Work phase-by-phase in Agent mode. Mark items `[x]` when closed.

**Rules of engagement**

1. Do not add new features.
2. Do not initiate massive architectural rewrites.
3. Do not execute all changes at once — one phase (or P-band) per session/PR preferred.
4. Prioritize high-impact, low-effort wins.
5. Before large commits: `npm run lint` + `npm run test:unit` (+ `npm run test:smoke` when UI/routes change).

---

## Verdict

The product is production-capable. Lint and typecheck are clean; heavy export libraries are largely dynamic-imported; SEO and a11y foundations (skip link, `<main>`, metadata helpers, robots/sitemap, JSON-LD, axe smoke) already exist. Remaining work is debt cleanup, bundle/caching polish, and a11y/SEO gaps — not rebuilds.

---

## Already healthy (do not rebuild)

| Area | Evidence |
|------|----------|
| Lint / types | `npm run lint` and typecheck pass; almost no `any` / `@ts-ignore` in `src/` |
| Export libs | `html-to-image`, `jspdf`, `jszip`, `docx`, `exceljs`, `pptxgenjs` use `await import()` in lib layers |
| Fonts | System stack in `src/app/globals.css` — no webfont cost |
| Tracking | No third-party analytics (ADR-006) |
| Landmarks | `src/app/[locale]/layout.tsx` — SkipLink + `<main id="main-content">` + Header/Footer; Hub inherits same `<main>` |
| SEO core | `src/lib/seo/build-page-metadata.ts` (canonical, hreflang, OG/Twitter); `src/app/robots.ts`; `src/app/sitemap.ts`; JSON-LD via `src/components/seo/JsonLd.tsx` |
| Hub noindex | `src/app/[locale]/app/layout.tsx` |
| TOOL-002 / TOOL-004 | Mostly closed; stragglers listed below |
| CSS modules | None — only `globals.css` |
| Source TODOs | No `TODO` / `FIXME` / `HACK` in `src/` |
| graphic-maker duplicate | Stale git status only — single tracked page at `src/app/[locale]/tools/graphic-maker/page.tsx` |

---

## Explicitly deferred (high risk / rewrite-shaped)

Do **not** pull these into a polish PR unless explicitly requested:

- Splitting full i18n catalogs (`messages/en.json` ~194 KB, `fr.json` ~221 KB)
- Removing `SessionProvider` / `AuthProvider` from the public Comms shell
- Enabling Next.js image optimization (`images.unoptimized: true`) without a CapRover/standalone deploy-smoke plan
- Extracting all hydrate/seed hooks across every tool in one mega-PR
- Per-page unique Open Graph images
- Adding labour guides to header nav (product/nav change, not cleanup — pages already sitemap-indexed)

---

## Phase 1: Code Quality & Housekeeping

### P1 — High impact / quick

- [x] **P1-01 — Orphaned `OfficeExportButton` (dead code)**  
  - **Path:** `src/components/tools/OfficeExportButton.tsx`  
  - **Issue:** Zero imports anywhere in the repo. Document Generator inlined its own `run()` wrapper in `src/app/[locale]/tools/document-generator/page.tsx` (~206–216).  
  - **Fix:** Delete the unused component (prefer delete over rewiring).  
  - **Effort:** Quick

- [x] **P1-02 — Website Template ZIP export swallows errors (TOOL-002 gap)**  
  - **Path:** `src/app/[locale]/tools/website-template/page.tsx` (`handleDownload`, ~126–140)  
  - **Issue:** `try/finally` with no `catch` — ZIP/logo failures leave the user with no error state.  
  - **Fix:** Add `catch` + user-visible error, or migrate to `useExportHandler` from `src/hooks/use-export-handler.ts`.  
  - **Effort:** Quick

- [x] **P1-03 — Website Template setState during render**  
  - **Path:** `src/app/[locale]/tools/website-template/page.tsx` (~58–65)  
  - **Issue:** Facebook URL prefill mutates state during render (`if (hydrated && !facebookSeeded) { setFacebookSeeded… }`).  
  - **Fix:** Move into a one-shot `useEffect`.  
  - **Effort:** Quick

### P2 — Medium

- [x] **P1-04 — Orphaned `Tooltip` component**  
  - **Path:** `src/components/tools/Tooltip.tsx`  
  - **Issue:** Documented in `.cursor/rules/tool-editor-ux.mdc` but never imported by app code.  
  - **Fix:** Delete, or wire into icon-only controls that currently lack accessible names. Prefer delete if no consumer is ready.  
  - **Effort:** Quick

- [x] **P1-05 — Duplicate export-error handling (3 patterns)**  
  - **Canonical:** `src/hooks/use-export-handler.ts` (~12 consumers already)  
  - **Stragglers:**  
    - `src/app/[locale]/tools/document-generator/page.tsx` (local `run()`)  
    - `src/app/[locale]/tools/logo-builder/page.tsx` (manual try/catch state)  
    - `src/app/[locale]/tools/resizer/page.tsx` (manual `exportError` state)  
  - **Fix:** Migrate the three pages to `useExportHandler`.  
  - **Effort:** Medium

- [x] **P1-06 — Alt-text clipboard failure is silent**  
  - **Path:** `src/app/[locale]/tools/alt-text/page.tsx` (`handleCopy`, ~56–67)  
  - **Issue:** When `copyToClipboard()` returns false, no user-visible error.  
  - **Fix:** Surface an error/toast string from i18n.  
  - **Effort:** Quick

- [x] **P1-07 — Repeated one-shot hydrate `useEffect` (~10 copies)**  
  - **Paths:** under `src/app/[locale]/tools/` — `action-card`, `board-banner`, `flyer-maker`, `meeting-background`, `pulse-poll`, `qr-board`, `qr-card`, `resizer`, `solidarity-poster`, `document-generator`  
  - **Issue:** Same “hydrate once then seed from Brand Kit” pattern with repeated `eslint-disable-next-line react-hooks/exhaustive-deps`.  
  - **Fix:** Extract `useOneShotBrandSeed()` **only when already editing those pages** — do not drive-by refactor all tools in one PR.  
  - **Effort:** Medium

- [x] **P1-08 — Repeated example deep-link seeding**  
  - **Paths:**  
    - `src/app/[locale]/tools/graphic-maker/page.tsx`  
    - `src/app/[locale]/tools/flyer-maker/page.tsx`  
    - `src/app/[locale]/tools/quote-card/page.tsx`  
  - **Issue:** Copy-pasted example/deep-link seed logic.  
  - **Fix:** Shared `useExamplePostSeed(toolSlug)` when next touching those tools.  
  - **Effort:** Medium

### P3 — Low

- [x] **P1-09 — Dead deprecated exports in brand constants**  
  - **Path:** `src/lib/constants/brand.ts`  
  - **Issue:** Unused `CAAT_OPSEU_COLORS` alias; unused `PLATFORM_FORMATS` re-export (canonical lives in `src/lib/constants/resizer-formats.ts`).  
  - **Fix:** Remove unused aliases after confirming no external/docs imports.  
  - **Effort:** Quick

- [x] **P1-10 — Unnecessary type re-export from logo-builder page**  
  - **Path:** `src/app/[locale]/tools/logo-builder/page.tsx` (line ~28)  
  - **Canonical type:** `src/components/brand/LocalLogoPlate.tsx`  
  - **Fix:** Delete the page-level re-export.  
  - **Effort:** Quick

- [x] **P1-11 — Duplicated `SHAPES` constant**  
  - **Paths:** `src/app/[locale]/tools/logo-builder/page.tsx` (~38), `src/app/[locale]/tools/resizer/page.tsx` (~65)  
  - **Fix:** Move shared constant next to `LocalLogoPlate.tsx`.  
  - **Effort:** Quick

- [x] **P1-12 — `coloursFromBrandKit` helper scoped to one tool**  
  - **Path:** `src/app/[locale]/tools/flyer-maker/page.tsx` (~37–41)  
  - **Fix:** Extract to `src/lib/utils/brand-theme.ts` if a second consumer appears; otherwise leave.  
  - **Effort:** Quick

- [x] **P1-13 — `useExportHandler` has no unit tests**  
  - **Path:** `src/hooks/use-export-handler.ts`  
  - **Fix:** Add Vitest coverage for success/error/exporting states.  
  - **Effort:** Quick

- [x] **P1-14 — `board-banner` inline `html-to-image` import**  
  - **Path:** `src/app/[locale]/tools/board-banner/page.tsx` (~303)  
  - **Issue:** Bypasses shared `src/lib/export/image-export.ts` helpers in at least one path.  
  - **Fix:** Consolidate into `image-export.ts`.  
  - **Effort:** Medium

- [ ] **P1-15 — No automated dead-code detection in CI**  
  - **Path:** `package.json`  
  - **Issue:** Orphans (`OfficeExportButton`, `Tooltip`) slipped through.  
  - **Fix:** Optional later — add `knip` or similar; not required for polish PRs.  
  - **Effort:** Quick (tooling)

- [x] **P1-16 — Stale plan todos (docs noise)**  
  - **Path:** `.cursor/plans/pristine_office_templates.plan.md`  
  - **Fix:** Mark complete or archive; ignore in runtime work.  
  - **Effort:** Quick

### Phase 1 notes

- Labour guides (`guide/dfr`, `guide/seniority-bumping`, `guide/right-to-refuse`) exist and are sitemap-indexed but not in `src/components/layout/nav/nav-config.ts`. Treat as **product decision**, not Phase 1 cleanup.
- All tool routes appear linked in nav + sitemap; hooks under `src/hooks/` are in use.

**Suggested Phase 1 PR band:** P1-01 → P1-03 → P1-06 → P1-09 → P1-04 (delete) → P1-05.

---

## Phase 2: Performance Optimization

### P1 — High impact / quick–medium

- [x] **P2-01 — No long-cache headers on static public assets**  
  - **Paths:** `next.config.ts` (only `/sw.js` has explicit `Cache-Control`); `vercel.json` similarly narrow  
  - **Issue:** `/assets/**`, `/icons/**`, `/demo/**`, `/templates/**` lack long-lived cache headers.  
  - **Fix:** Add `Cache-Control: public, max-age=31536000, immutable` (or equivalent) for those prefixes; keep `/sw.js` as `no-cache`.  
  - **Effort:** Low

- [x] **P2-02 — `qrcode` statically imported (TOOL-004-style)**  
  - **Path:** `src/lib/export/qr.ts` (line 1: `import QRCode from "qrcode"`)  
  - **Pulled into:** `qr-card`, `qr-board`, `action-card`, `pulse-poll`, `solidarity-poster` pages; `src/components/meetings/MeetingEventsBoard.tsx`  
  - **Fix:** `await import("qrcode")` inside `qrDataUrl`.  
  - **Effort:** Low

- [x] **P2-03 — `file-saver` statically imported in shared image export helper**  
  - **Path:** `src/lib/export/image-export.ts` (line 1)  
  - **Issue:** Every canvas tool that imports `image-export` pays for `file-saver` upfront; `pdf-export.ts` already dynamic-imports it.  
  - **Fix:** Dynamic-import `file-saver` inside download helpers.  
  - **Effort:** Low

### P2 — Medium

- [x] **P2-04 — QR regeneration on every keystroke (no debounce)**  
  - **Path:** `src/app/[locale]/tools/qr-card/page.tsx` (~175–187)  
  - **Issue:** `useEffect` calls `qrDataUrl(destination)` on every `state.destination` change.  
  - **Fix:** Debounce (e.g. 200–300 ms) before generating. Mirror pattern on other QR tools if identical.  
  - **Effort:** Low

- [x] **P2-05 — Brand Kit text fields write localStorage on every keystroke**  
  - **Paths:** `src/app/[locale]/brand-kit/page.tsx`; `src/store/brand-store.ts` (`setBrandKit` → immediate `saveBrandKit`)  
  - **Issue:** Text/URL fields trigger full JSON writes per keystroke (colours are draft-protected via ThemePicker).  
  - **Fix:** Debounce persistence for text fields.  
  - **Effort:** Low

- [x] **P2-06 — Union Boards guide large unoptimized demo images**  
  - **Paths:** `src/app/[locale]/guide/union-boards/page.tsx`; assets under `public/demo/union-boards/` (`board-l33-sectioned.png` ~168 KB, `board-w010-branded.png` ~152 KB, `example-dense-board.jpg` ~94 KB)  
  - **Issue:** No lazy loading / `sizes`; compounded by global `images.unoptimized`.  
  - **Fix:** `loading="lazy"`, sensible `sizes`; optionally convert to WebP and keep JPG/PNG fallbacks.  
  - **Effort:** Low–Medium

- [x] **P2-07 — Duplicate 181 KB interlock PNG assets**  
  - **Paths:** `public/assets/unionops/logo-mark-interlock.png`, `public/assets/unionops/source/uo-mark-interlock.png` (both ~181 KB); SVG exists (`logo-mark.svg`)  
  - **Issue:** Identical large rasters duplicated; chrome often uses inline SVG / smaller assets.  
  - **Fix:** Dedupe references; keep one source raster if still needed for export/docs; prefer SVG where safe.  
  - **Effort:** Low

- [x] **P2-08 — Zero `next/dynamic` / `React.lazy` site-wide**  
  - **Paths:** No matches under `src/`; candidates: `src/components/tools/OfficePresetMock.tsx`, `graphic-layouts.tsx`, website ZIP generator  
  - **Issue:** Heavy preview/export subcomponents load eagerly with parent pages.  
  - **Fix:** Lazy-load export panels / heavy mocks on interaction or below fold — only where measurable.  
  - **Effort:** Low–Medium

- [x] **P2-09 — `document-generator` statically imports full `office-export` module**  
  - **Paths:** `src/app/[locale]/tools/document-generator/page.tsx` (~28–39); `src/lib/export/office-export.ts`  
  - **Issue:** Nested libs are dynamic, but the module graph still lands in the initial chunk.  
  - **Fix:** Dynamic-import export entrypoints on click.  
  - **Effort:** Low

- [x] **P2-10 — `website-template` eagerly loads ZIP generator**  
  - **Paths:** `src/app/[locale]/tools/website-template/page.tsx` (~14–17, 23); `src/lib/templates/website/generate-website-zip.ts`  
  - **Issue:** Template strings / `file-saver` load on visit; JSZip inside is already dynamic.  
  - **Fix:** Dynamic-import generator + `file-saver` inside `handleDownload`.  
  - **Effort:** Low

- [x] **P2-11 — `next/image` used for blob/data URLs with no benefit**  
  - **Paths:** `src/components/tools/graphic-layouts.tsx` (`PhotoLayer`); `src/app/[locale]/tools/resizer/page.tsx`  
  - **Issue:** Runtime overhead of `next/image` with zero optimization (data/blob URLs).  
  - **Fix:** Use plain `<img>` (same rationale as `SafeLogoImage`).  
  - **Effort:** Low

### P3 — Higher risk or lower priority

- [ ] **P2-12 — Next.js image optimization globally disabled**  
  - **Path:** `next.config.ts` (`images: { unoptimized: true }`)  
  - **Issue:** Disables WebP/AVIF/srcset for all `next/image` usage.  
  - **Fix:** **Do not flip blindly** — `output: "standalone"` / CapRover may lack the image optimizer. Prefer P2-06/P2-07 first; revisit with deploy smoke if enabling.  
  - **Effort:** Medium + ops validation

- [ ] **P2-13 — Full i18n catalogs hydrated on every page**  
  - **Paths:** `src/app/[locale]/layout.tsx`; `messages/en.json` (~194 KB); `messages/fr.json` (~221 KB)  
  - **Issue:** Complete locale JSON sent to the client on every navigation.  
  - **Fix:** Deferred — high ROI but rewrite-shaped (namespace splitting).  
  - **Effort:** High

- [ ] **P2-14 — `SessionProvider` wraps all public Comms pages**  
  - **Paths:** `src/app/[locale]/layout.tsx` → `src/components/providers/AuthProvider.tsx`  
  - **Issue:** Anonymous tool visitors still mount next-auth session client with default refetch-on-focus.  
  - **Fix:** Deferred — medium effort / tenancy risk.  
  - **Effort:** Medium

- [ ] **P2-15 — Custom logos up to 10 MB base64 in localStorage**  
  - **Paths:** `src/lib/constants/brand.ts` (`MAX_UPLOAD_SIZE_MB = 10`); `src/components/tools/ImageUpload.tsx`; `src/store/brand-store.ts`  
  - **Issue:** Large `customLogoDataUrl` slows writes and risks quota.  
  - **Fix:** Lower cap and/or compress before save — product-sensitive; treat carefully.  
  - **Effort:** Medium

- [x] **P2-16 — Public meetings API has no cache headers**  
  - **Path:** `src/app/api/meetings/public/[slug]/route.ts`  
  - **Issue:** Public PII-free JSON could use short CDN/browser cache.  
  - **Fix:** Add short `Cache-Control` / `s-maxage` if semantics allow.  
  - **Effort:** Low

- [ ] **P2-17 — Home page fully client-rendered despite server shell**  
  - **Paths:** `src/app/[locale]/page.tsx` (server) → `src/components/pages/HomeContent.tsx` (`"use client"`)  
  - **Issue:** Landing pulls Brand Kit client-side for theming.  
  - **Fix:** Optional partial server shell — not a quick win; Brand Kit theming is intentional.  
  - **Effort:** Medium

- [ ] **P2-18 — All canvas tool pages are full `"use client"` roots**  
  - **Paths:** 17 tool routes under `src/app/[locale]/tools/**/page.tsx` (index page is server)  
  - **Issue:** Entire editor tree in route chunk.  
  - **Fix:** Deferred — would require splitting server shells + client editors (rewrite-shaped).  
  - **Effort:** Medium–High

### Phase 2 already good

| Area | Evidence |
|------|----------|
| TOOL-004 export libs | Dynamic in `src/lib/export/` for html-to-image, jspdf, jszip, docx, exceljs, pptxgenjs, pdfjs-dist |
| Fonts | System stack — no FOIT/FOUT |
| No third-party scripts | ADR-006 |
| PWA SW | `public/sw.js` — navigate-only; no-cache header in `next.config.ts` |
| Hub routes | Mostly server components under `src/app/[locale]/app/` |

**Suggested Phase 2 PR band:** P2-01 → P2-02 → P2-03 → P2-04 → P2-05 → P2-06 → P2-07.

---

## Phase 3: Accessibility (a11y) & SEO

### P1 — High impact / low effort

- [x] **P3-01 — Landmark `aria-label`s hardcoded in English**  
  - **Paths:**  
    - `src/components/layout/Header.tsx` — `aria-label="Main"`  
    - `src/components/layout/Footer.tsx` — `aria-label="Footer"`  
    - `src/components/layout/LanguageToggle.tsx` — `aria-label="Language"`  
  - **Issue:** FR screen readers hear English landmark names.  
  - **Fix:** Add keys to `messages/en.json` and `messages/fr.json`; use `useTranslations`.  
  - **Effort:** Low

- [x] **P3-02 — Canvas preview regions mostly unnamed for AT**  
  - **Paths:** `src/components/tools/ToolEditorLayout.tsx` (`previewAccessibleName`); only `board-banner` and `solidarity-poster` pass it today  
  - **Issue:** ~13 other canvas tools leave the preview region unlabeled.  
  - **Fix:** Pass i18n `previewAccessibleName` on remaining tools.  
  - **Effort:** Low–Medium

- [x] **P3-03 — Pulse-poll QR preview uses empty `alt`**  
  - **Path:** `src/app/[locale]/tools/pulse-poll/page.tsx`  
  - **Issue:** Meaningful QR image has `alt=""`.  
  - **Fix:** Descriptive alt (or aria-label on container) in EN/FR.  
  - **Effort:** Low

### P2 — Medium

- [x] **P3-04 — `pulse-poll` missing from axe smoke**  
  - **Path:** `e2e/builders.smoke.spec.ts` (compare `src/app/[locale]/tools/pulse-poll/layout.tsx` which has metadata)  
  - **Fix:** Add route to builders axe list.  
  - **Effort:** Low

- [x] **P3-05 — Hub routes without axe coverage**  
  - **Paths:** `e2e/hub.a11y.spec.ts`, `e2e/hub.org.spec.ts`  
  - **Issue:** marketplace, snippets, handoff lack axe scans.  
  - **Fix:** Add representative pages.  
  - **Effort:** Low

- [x] **P3-06 — Zero French axe smoke**  
  - **Paths:** `e2e/smoke.spec.ts`, `e2e/builders.smoke.spec.ts`, `e2e/hub.a11y.spec.ts` — all `/en/…`  
  - **Fix:** Add at least one FR spot-check (home + one tool).  
  - **Effort:** Low

- [x] **P3-07 — Wrong canonical on dynamic noindex pages**  
  - **Paths:**  
    - `src/app/[locale]/meetings/[slug]/page.tsx` — `path: "/meetings"` instead of slug  
    - `src/app/[locale]/poll/[slug]/page.tsx`  
    - `src/app/[locale]/r/[token]/page.tsx`  
  - **Issue:** Canonical does not match actual URL (pages are noindex, but canonicals should still be correct).  
  - **Fix:** Pass actual slug/token path into `buildPageMetadata`.  
  - **Effort:** Low

- [x] **P3-08 — `BrandLogo` / `SafeLogoImage` default `alt=""`**  
  - **Paths:** `src/components/brand/SafeLogoImage.tsx`, `src/components/brand/BrandLogo.tsx`  
  - **Issue:** Risky in logo-only contexts (logo-builder chrome, auth avatar-adjacent).  
  - **Fix:** Require callers to pass meaningful alt when the logo is informative; keep empty only when decorative + `aria-hidden`.  
  - **Effort:** Low

- [x] **P3-09 — English-only Suspense fallback H1s**  
  - **Paths:**  
    - `src/app/[locale]/tools/graphic-maker/page.tsx`  
    - `src/app/[locale]/tools/flyer-maker/page.tsx`  
    - `src/app/[locale]/tools/quote-card/page.tsx`  
    - `src/app/[locale]/tools/document-generator/page.tsx`  
  - **Fix:** Use i18n loading/title strings.  
  - **Effort:** Low

### P3 — Lower priority / coverage expansion

- [x] **P3-10 — Most public guides lack axe smoke**  
  - **Paths:** `e2e/smoke.spec.ts`, `e2e/builders.smoke.spec.ts`  
  - **Issue:** Only home, guide index, accessibility, brand-kit, print, website, email-broadcast (and builders list) are covered.  
  - **Fix:** Incrementally add guide routes.  
  - **Effort:** Medium

- [ ] **P3-11 — Hub detail/auth pages lack axe**  
  - **Paths:** grievance detail, dashboard, profile, MFA — `e2e/hub.a11y.spec.ts`, `e2e/mfa.setup.spec.ts`  
  - **Fix:** Add representatives carefully (auth fixtures).  
  - **Effort:** Medium

- [x] **P3-12 — SEO E2E only deep-checks ~4 routes**  
  - **Path:** `e2e/seo.smoke.spec.ts`  
  - **Fix:** Expand spot checks for a tool + a guide.  
  - **Effort:** Low

- [x] **P3-13 — Sitemap `lastModified: new Date()` every build**  
  - **Path:** `src/app/sitemap.ts`  
  - **Issue:** Noisy lastmod for crawlers.  
  - **Fix:** Pin stable dates, use git mtime, or omit.  
  - **Effort:** Low

- [x] **P3-14 — Decorative images `alt=""` without `aria-hidden`**  
  - **Paths:** `src/components/tools/graphic-layouts.tsx`, `OfficePresetMock.tsx`, `qr-board/QrBoardCanvas.tsx`, several tool pages  
  - **Fix:** Add `aria-hidden` where decorative.  
  - **Effort:** Low

- [ ] **P3-15 — Double nav landmarks on Hub**  
  - **Paths:** `src/components/layout/Header.tsx` ("Main") + `src/components/hub/HubNav.tsx` ("Hub navigation")  
  - **Issue:** Two navigation landmarks can confuse AT users in Hub.  
  - **Fix:** Clarify labels / structure (e.g. hide public Main nav landmark when on Hub, or rename).  
  - **Effort:** Low

### Phase 3 info / accept as-is

| Item | Notes |
|------|-------|
| Single static OG image | `src/lib/seo/site.ts`, `src/app/opengraph-image.tsx` — acceptable for polish sweep |
| Hub generic browser title | Acceptable with noindex |
| Contrast helpers | `src/lib/utils/ink.ts` already used across canvas tools |
| Skip link E2E | Covered in `e2e/smoke.spec.ts` |
| Metadata coverage tests | `src/lib/seo/public-page-meta.test.ts` |

**Suggested Phase 3 PR band:** P3-01 → P3-03 → P3-02 → P3-04 → P3-05 → P3-06 → P3-07.

---

## Execution checklist (Agent mode)

When executing, say which band to run (examples):

- `Phase 1 P1 only`
- `Phase 2 P1–P2`
- `Phase 3 P1`
- `Close P2-01 and P2-02`

For each closed item:

1. Check the box in this file (`- [ ]` → `- [x]`).
2. Run lint + relevant tests before commit.
3. Prefer conventional commits focused on **why**.
4. Do not amend pushed commits; do not force-push `main`.

---

## Finding ID index

| ID | Phase | Priority | One-line |
|----|-------|----------|----------|
| P1-01 | 1 | P1 | Delete orphaned `OfficeExportButton` |
| P1-02 | 1 | P1 | Website Template export error handling |
| P1-03 | 1 | P1 | Website Template setState-during-render |
| P1-04 | 1 | P2 | Delete or wire orphaned `Tooltip` |
| P1-05 | 1 | P2 | Migrate export handlers to `useExportHandler` |
| P1-06 | 1 | P2 | Alt-text clipboard error UI |
| P1-07 | 1 | P2 | Extract one-shot brand seed hook (opportunistic) |
| P1-08 | 1 | P2 | Extract example post seed hook (opportunistic) |
| P1-09 | 1 | P3 | Remove dead brand aliases |
| P1-10 | 1 | P3 | Remove logo-builder type re-export |
| P1-11 | 1 | P3 | Deduplicate `SHAPES` |
| P1-12 | 1 | P3 | Extract `coloursFromBrandKit` if shared |
| P1-13 | 1 | P3 | Unit test `useExportHandler` |
| P1-14 | 1 | P3 | Consolidate board-banner html-to-image path |
| P1-15 | 1 | P3 | Optional knip/dead-code CI |
| P1-16 | 1 | P3 | Archive stale office-templates plan |
| P2-01 | 2 | P1 | Static asset Cache-Control headers |
| P2-02 | 2 | P1 | Dynamic-import `qrcode` |
| P2-03 | 2 | P1 | Dynamic-import `file-saver` in image-export |
| P2-04 | 2 | P2 | Debounce QR generation |
| P2-05 | 2 | P2 | Debounce Brand Kit localStorage saves |
| P2-06 | 2 | P2 | Lazy/compress union-boards demo images |
| P2-07 | 2 | P2 | Dedupe interlock PNG assets |
| P2-08 | 2 | P2 | Selective `next/dynamic` for heavy panels |
| P2-09 | 2 | P2 | Dynamic-import office-export on click |
| P2-10 | 2 | P2 | Dynamic-import website ZIP on click |
| P2-11 | 2 | P2 | Replace next/image for blob/data URLs |
| P2-12 | 2 | P3 | Revisit `images.unoptimized` with ops plan |
| P2-13 | 2 | P3 | Deferred: split i18n catalogs |
| P2-14 | 2 | P3 | Deferred: AuthProvider scope |
| P2-15 | 2 | P3 | Logo upload size / compress |
| P2-16 | 2 | P3 | Public meetings API cache headers |
| P2-17 | 2 | P3 | Optional home SSR split |
| P2-18 | 2 | P3 | Deferred: tool page server shells |
| P3-01 | 3 | P1 | i18n landmark aria-labels |
| P3-02 | 3 | P1 | `previewAccessibleName` on canvas tools |
| P3-03 | 3 | P1 | Pulse-poll QR alt text |
| P3-04 | 3 | P2 | axe: pulse-poll |
| P3-05 | 3 | P2 | axe: Hub marketplace/snippets/handoff |
| P3-06 | 3 | P2 | axe: French spot-check |
| P3-07 | 3 | P2 | Fix dynamic page canonicals |
| P3-08 | 3 | P2 | BrandLogo/SafeLogoImage alt discipline |
| P3-09 | 3 | P2 | i18n Suspense fallback H1s |
| P3-10 | 3 | P3 | Expand guide axe coverage |
| P3-11 | 3 | P3 | Expand Hub detail/auth axe |
| P3-12 | 3 | P3 | Expand SEO E2E deep checks |
| P3-13 | 3 | P3 | Stabilize sitemap lastModified |
| P3-14 | 3 | P3 | Decorative img `aria-hidden` |
| P3-15 | 3 | P3 | Hub double-nav landmark clarity |

---

*Generated 2026-07-29. Source of truth for the production-readiness polish sweep; prefer this file over stale audit tickets when closing polish items.*
