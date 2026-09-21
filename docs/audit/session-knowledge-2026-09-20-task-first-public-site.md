# Session knowledge — public-site discovery and navigation (2026-09-20; clarity follow-up 2026-09-21)

**Audience:** future agents + Ryan.
**Related:** [public navigation rule](../../.cursor/rules/comms-public-nav.mdc), [public catalog](../../src/lib/comms/public-catalog.ts), [route migration map](../../src/lib/seo/public-routes.ts), [progress entry](../PROGRESS.md).

---

## What shipped

The initial refactor introduced **Start**, **Create**, and **Learn** as broad public labels. Ryan's follow-up feedback found that Brand Kit still needed a direct primary-navigation link and Home needed a more obvious sequence. The current primary navigation is **Start**, **Brand Kit**, **Create**, **Learn**, and the session-aware **Officer Hub**; the UnionOps wordmark returns Home, and Search remains a separate utility action. Brand Kit is a direct route at `/create/brand-kit`, not only a catalog entry. The shared registry still feeds Create, Learn, Search, breadcrumbs, related links, and sitemap paths. Legacy public URLs permanently redirect to locale-aware canonical URLs; old TSX pages and `next-intl` remain the content implementation. Hub, Portal, APIs, and editor behavior were intentionally left alone.

Home now uses a plain three-step workflow: set up Brand Kit, create materials, then follow a guide. It retains a product preview, a direct Brand Kit action, a plain privacy note, and a separate Guided setup link. `/start` offers communications lead, steward, and local officer checklists; local Brand Kit completion is inferred from browser state and is not a shared union profile. The mobile menu shows its Menu label, and tablet widths use the drawer instead of squeezing five destinations into the header. Catalog filtering and text search are client-local; no analytics or external search service was added.

The follow-up UX implementation adds per-item deliverable descriptions, more precise privacy labels for optional Hub copies, curated task collections, related next steps, bilingual alias search with accent normalization, removable URL-backed filters, and browser-only checklists for the three Start journeys. Verified locally: production build, typecheck, lint (one pre-existing warning in `demo-purge.ts`), 13 public-discovery production browser checks (plus 11 focused regression checks from the initial shell pass). The 2026-09-21 integrated CI unit run passed 2,030 tests / 1 skipped; typecheck, lint, production build, Docker build, and migration smoke passed. The full CI browser smoke (run 35561187193) was still in progress when PR #92 was merged at the owner's direction; do not report that run as fully green. Automated checks still do not substitute for user research or full assistive-technology testing.

### Delivery lesson — localized smoke copy integrity

The `COPY-002` unit guard extracts literal Playwright accessible-name assertions and checks that they appear in the English message catalog. Literal French labels in the shared smoke file therefore produced false failures even though the French catalog was correct. For locale-specific assertions, use a localized-name regular expression or make the checker locale-aware; do not add translated copy to an English-only allowlist. The targeted copy-integrity test passed after the French assertions were changed to regex names.

### Follow-up correction — explicit navigation and sequence (2026-09-21)

- Do not treat abstract verbs as automatically user-centered. In this product, **Start / Create / Learn** hid a high-frequency destination and made people translate labels into product structure.
- Keep the user's preferred **Start / Create / Learn** shell and add **Brand Kit** as a direct primary-nav destination; retain the standard UnionOps wordmark as the Home link.
- Make the Home sequence explicit and ordered: **01 Brand Kit → 02 Create → 03 Learn**. Role-specific checklists remain available from Guided setup instead of competing with this default sequence.
- Use a visible Menu label on compact layouts, and switch to the mobile drawer before five direct destinations and utilities become cramped.
- Preserve canonical routes and catalog ownership: navigation labels change; `/create`, `/learn`, `/start`, and all migrated content paths remain the same.

Automated checks can assert labels, routes, order, and responsive behavior. They still cannot prove that a first-time steward or officer understands the wording; retain the human validation items below.

---

## Lessons to retain

1. **A direct path to setup matters more than forcing every destination into a short nav.** Start / Create / Learn are the product's task-first shell; Brand Kit must appear beside them because it is the setup dependency for most creation tasks. Show the recommended order on Home, use descriptive page headings, and keep Officer Hub distinct because it is an authenticated/hosted product, not another public content category.

2. **Treat route migration as a system, not a page rename.** Redirects, rewrites, locale prefixes, query strings, internal `Link` canonicalization, canonical/hreflang metadata, sitemap paths, breadcrumbs, and workshop/demo links all participate. Keep one tested route map and retain redirects indefinitely. New public links should use canonical destinations even while legacy pages remain the rendering source.

3. **A registry reduces drift only when its metadata is editorially trustworthy.** This implementation adapts existing guide/tool registries and translation namespaces. That was a low-risk migration path, but it means some catalog fields are inferred/defaulted rather than reviewed per item. Do not confuse structural centralization with finished content modeling.

4. **Keep public copy in the existing localized React/i18n system.** A second Markdown content tree would duplicate titles, summaries, route ownership, and EN/FR maintenance. Reuse source pages during the IA transition; add stronger typed/editorial metadata to the registry where discovery actually needs it.

5. **Progressive guidance must respect local state and hydration.** Brand Kit readiness is browser-local. The first render cannot reliably know it before the store hydrates, and a different browser/device has different state. Avoid flashing a false “complete” state and do not imply the local Brand Kit is a shared union profile.

6. **A responsive grid and a guided experience are different achievements.** Three columns at desktop and one on phones solve density and overflow; they do not by themselves help someone choose a first task, understand a sequence, or resume later. Keep journey design as a separate product workstream.

7. **Privacy is part of navigation, not only legal copy.** “On this device,” “Officer Hub,” and “no data stored” help users choose confidently, but only if the distinction accurately describes each item and the card also says what the user gets. Preserve the local-first Comms / hosted Hub boundary in future cross-links.

8. **Automated checks prove mechanics, not comprehension.** Route, translation-key, a11y-axe, and breakpoint tests catch regressions. They cannot tell us whether a first-time steward understands “Create,” whether estimated time is believable, or whether a translated label feels natural. Use voluntary task-based research without adding analytics.

---

## UX gaps and recommended follow-up

These are follow-up opportunities from code/test review, not claims that the current release is broken.

### P1 — Make each catalog card decision-ready — implementation shipped; content review remains

- Catalog items now require a structured localized deliverable key; cards distinguish actual files/worksheets/lesson outcomes from their broad format. Related links cover the main Comms, Steward, Officer, governance, and workplace jobs; they are intentionally curated, not mechanically inferred.
- Storage has a separate optional-Hub-copy state for Bylaw Builder and Proposal Tracker. Copy distinguishes browser-only work/progress, optional Hub copy, hosted Hub work, and read-only content.
- `estimatedMinutes` is still a rough default for many tools/guides (Officer Learning uses module reading time). An editorial/content owner still needs to validate estimates item-by-item; do not present these as measured completion times.

**Guard:** keep deliverable labels required and localized; preserve related-route validation. Update estimates only with content-owner review.

### P1 — Turn Start into a small, genuinely guided first-use journey — implementation shipped; usability validation remains

Start now offers four ordered steps for each audience path, an explicit next step, a manually checkable completion state, a progress indicator, and restoration through a shareable `?path=` selection. Path/completion state is stored only in local browser storage, not on the server or in Officer Hub. Brand Kit completion is inferred from that browser’s existing Brand Kit state; it is not a shared tenant signal.

The checklist lives on `/start` rather than adding a persistent banner to every content/tool page; task testing should establish whether people can find and resume it. Do not add site-wide journey chrome or force a wizard before observing people use the checklist.

Also test first visit, completed Brand Kit, cleared storage, and a second device/browser so the recommendation never overstates what the platform knows.

### P2 — Reduce Learn’s flat-catalog burden — first pass shipped; observe before expanding

Learn now begins with four common task collections; active filters are removable, search terms include bilingual task vocabulary, French accents normalize during matching, and query/filter choices are reflected in the URL so a result set can be restored or shared. The catalog grid remains flat after those entry points. Search remains local substring matching with curated aliases, not typo tolerance or semantic search.

Validate these collections and aliases with people before adding more groups, result ranking, typo tolerance, or a heavier search engine. Keep the catalog local and privacy-preserving.

Search/filter parameters remain public URLs. Preserve `/search` noindex behavior and never put sensitive member or case data in search URLs.

### P2 — Complete accessibility and localization validation

The new browser coverage checks a filtered Learn state with axe, verifies mobile drawer focus entry/trap/return and Escape, and checks locale rendering/viewport overflow. It does not establish screen-reader announcement quality with actual assistive technology, nor real EN/FR editorial quality. Automated key parity is not a translation review.

**Remaining validation:** check announcements with NVDA/VoiceOver on result updates and no-results state; review contrast in hover/focus/selected states; have a fluent French editor review the new labels and card descriptions in context. Run the same task scripts in both locales, not only locale smoke rendering.

### P2 — Validate the task model with people, without analytics

The key unanswered question is whether the four public destinations and the three Start paths match visitors’ language. Run short, moderated sessions with a communications lead, steward, and local officer (including French-speaking participants where possible). Ask each person to:

1. Find the right starting point for a real task without coaching.
2. Decide whether the work stays in their browser or is shared in Officer Hub.
3. Identify the likely output and time before opening a catalog item.
4. Find the next step and return to where they left off.
5. Re-find an old bookmarked guide after the URL change.

Observe completion, wrong turns, questions, and terminology in notes; do not introduce tracking. Use the findings to tune labels and curated paths before adding more navigation.

---

## Guardrails / do not regress

- No public mega-menus, circular launch-link hubs, or icon-only primary navigation.
- Keep Search separate from primary navigation; keep account, display, and language controls as utilities.
- Keep Hub visibility/session/feature gates and disabled-tool visibility derived correctly.
- Keep Start’s Brand Kit check local-state-aware; never imply that it reads tenant-wide shared state.
- Preserve locale, query parameters, fragments where applicable, canonical metadata, hreflang, and permanent legacy redirects.
- Keep EN/FR copy in `messages/*.json`; key parity is not a substitute for language review.
- No analytics, external search, or third-party marketing scripts.
- Keep Hub, Portal, API authorization, editors, and storage behavior out of public-navigation changes unless separately scoped and reviewed.

## Verification for the next UX pass

- Validate rough time estimates item-by-item with a content owner.
- Test that visitors understand each output and privacy label and can resume local progress across browser reloads.
- Exercise first-use and returning paths across a fresh browser, restored browser storage, and a second device/browser.
- Run the moderated task script in EN and FR at phone and desktop widths; record completion and confusion without collecting identity data.
- Keep route/sitemap/metadata and redirect tests; extend keyboard and screen-reader checks to mobile drawer, filter changes, and no-results.
