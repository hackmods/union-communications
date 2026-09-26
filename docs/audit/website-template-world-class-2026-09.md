# Website Template — world-class local site system (2026-09)

**Status:** living design / fit-gap / decision log  
**Audience:** agents + Ryan  
**Product URL:** `/create/website-template` (rewrite → `tools/website-template`)  
**As-built rule:** [`.cursor/rules/website-export.mdc`](../../.cursor/rules/website-export.mdc)  
**Prior lessons:** [`session-knowledge-2026-08-18-website-export.md`](session-knowledge-2026-08-18-website-export.md)

Update this file as phases ship. Mark intentional deferrals explicitly so they are not mistaken for missed work.

---

## 1. Current state (as-built, 2026-09 review)

UnionOps Website Template is a **form-driven, single-page static site generator**:

| Layer | Implementation |
|-------|----------------|
| Builder | Monolithic [`src/app/[locale]/tools/website-template/page.tsx`](../../src/app/[locale]/tools/website-template/page.tsx) inside `ToolEditorLayout` |
| Draft | `WebsiteDraft` v1 in localStorage via `DataAdapter` (`unionops-website-draft`) |
| Compose | `composeWebsiteTemplateData()` — Brand Kit + Public Roster + draft + import overlay |
| Preview | `buildPreviewHtml()` → iframe `WebsitePreviewFrame` (`srcdoc`) |
| Static export | `generateWebsiteZip()` — GitHub Pages ZIP (default) |
| WP export | `generateWordpressThemeZip()` — classic PHP wrap of same HTML/CSS |
| Portable config | `unionops-website.json` kind `unionops-website` **version 1** |

**Sections today:** Home (hero), About, Officers (flat grid), Contact, footer (office / membership / optional OPSEU / rights & partners).

**Customization today:** copy fields, hero pattern/photo, officers (or Org Chart), Brand Kit colours/logo/links/fonts/canvas (partial). No layout picker, no device preview toggle, no multi-page output.

**Generated chrome:** English-only (`lang="en"`), hardcoded nav/CTA strings, description meta only (no Open Graph), skip-link on WordPress only (not static ZIP), no `prefers-reduced-motion`, canvas `grain`/`duotone` unused in CSS.

---

## 2. Strengths worth preserving

1. **Portability** — local owns the site; GitHub Pages ZIP is first-class; `unionops-website.json` round-trips.
2. **Brand Kit as identity source** — colours, logo, links, fonts flow without re-entry.
3. **Org Chart → officers** — Public Roster `showOnWebsite` avoids duplicate name entry.
4. **Simplicity** — volunteer can fill fields and download; companion `/guide/website` owns deploy complexity.
5. **Security posture** — HTML escape, http(s)-only links, safe asset names, no `javascript:` in config.
6. **Shared media packing** — static + WP exporters reuse `addWebsiteMediaToZip` / `prepareWebsiteExportData`.
7. **No SaaS lock-in** — no hosted CMS, analytics, or third-party form dependency (`mailto:` only).
8. **Local Pack** already carries `websiteDraft` for handoff.

Do **not** replace GitHub Pages as default. Do **not** invent a block CMS to chase Squarespace. Do **not** reduce existing ZIP/WP/JSON paths.

---

## 3. UX / product fit gaps

| Gap | Impact |
|-----|--------|
| One visual design for every local | Sites look like clones aside from colour |
| Collapsed form sections hide the path | New volunteers may never open Hero / About |
| No visual layout comparison | Cannot pick a personality confidently |
| Preview is one width | Hard to judge mobile/desktop before download |
| Brand colours/links edited elsewhere only | Correct product rule, but builder feels incomplete without clear “Design” mode |
| Import overlay rules are expert | Documented but not guided |
| Hardcoded English in exported site | FR UnionOps users still get EN chrome |

---

## 4. Generated-site fit gaps

| Gap | Severity |
|-----|----------|
| No skip link on static ZIP | A11y |
| No `:focus-visible` system / reduced-motion | A11y |
| No Open Graph / Twitter / canonical | SEO / sharing |
| Officers always “Executive Committee” | Content fidelity (stewards/committees ignored) |
| No phone / hours | Common local need |
| `websiteUrl` unused | Brand Kit field orphan |
| Privacy/accessibility stub missing | Trust |
| `grain` / `duotone` canvas unused | Brand Kit incomplete |
| Accent colour unused | Brand Kit incomplete |
| Multi-page not supported | Optional; see §6 |

---

## 5. Architecture limitations

- `buildWebsiteHtml` / `buildWebsiteCss` are a **single layout fork** (~736 lines). Adding a second design by copy-paste would fork maintenance.
- Flat `WebsiteTemplateData` mixes content + presentation hints; no `layoutId`.
- Config v1 has no migration story beyond Zod reject of wrong version.
- WordPress exporter string-splits HTML body — layout diversity must keep a stable body contract or improve the splitter.
- Preview cannot select device chrome independently of editor shell.

---

## 6. Multi-page decision (product)

**Question:** Is it worth adding multi-page HTML for different templates?

**Decision: Not required for layout diversity. Architect for it; do not force it.**

- **Ship diversity as single-page layouts** with different hero/nav/section hierarchy/density/typography. That is enough for locals to stop looking identical.
- **Multi-page** (separate `about.html`, `leadership.html`, …) adds nav complexity, duplicate chrome, WP theme friction, and volunteer cognitive load. Most locals want a bookmarkable brochure, not a CMS.
- **Architecture:** `renderWebsiteSite()` returns `WebsiteRenderedPage[]`. Today every layout emits one `index` page (plus optional `privacy.html` stub). A future layout *may* emit more pages without changing content schema.
- **Intentional deferral:** multi-page as a first-class builder toggle and additional HTML files beyond privacy — **deferred** unless a later layout proves it is essential.

---

## 7. Opportunities for meaningful layout diversity

Abstraction choice: **curated layouts** (not freeform themes, not a section marketplace).

| Layout id | Personality | Traits |
|-----------|-------------|--------|
| `solidarity` | Current local243-inspired default | Centred hero, colour band officers, classic nav |
| `bulletin` | Editorial / campaign | Strong type, left-aligned story, dense link rail, accent rules |
| `hall` | Institutional / trustworthy | Quieter hero, split leadership bands, restrained chrome |

Same content + Brand Kit → switch layout without recreating copy. Layout owns section order, chrome recipes, and CSS. Content owns copy, contacts, officers, links, hero media.

Composable **sections** are shared (`header`, `hero`, `about`, `leadership`, `stewards`, `resources`, `contact`, `footer`, `privacy`). Layouts compose sections; they do not fork exporters.

---

## 8. Opportunities for stronger UnionOps integration

| Priority | Integration | Notes |
|----------|-------------|-------|
| P0 | Roster `group` / `committeeName` / `unit` | Split leadership vs stewards vs committees |
| P0 | `accentColor`, `local.subText`, `websiteUrl` | Brand Kit already has them |
| P0 | Phone + office hours on draft | Common brochure fields |
| P1 | Optional QR PNG in ZIP targeting `websiteUrl` | Cross-tool with QR Card story |
| P1 | Exported site locale (EN/FR chrome strings) | Follow UnionOps locale or draft override |
| P1 | Optional static events + `calendar.ics` | Steward-entered; not Hub sync |
| P2 | Hub `LocalParameters` phone/hotline | Optional one-way; not hosted sync |
| Defer | Live Hub meetings / documents CMS | Conflicts with static ownership model |

---

## 9. Recommended target experience

1. **Excellent default:** Brand Kit set → open Website Template → credible preview in seconds (seeded copy + solidarity layout).
2. **Visual layout picker** with miniature previews; switching never wipes content.
3. **Progressive builder modes:** Design (layout + hero) → Content → People → Publish (export/import).
4. **Device preview** (phone / tablet / desktop widths) on the iframe.
5. **Richer brochure content** without becoming a CMS: phone, hours, stewards, committees, privacy page, editable CTA.
6. **Production-quality static output:** a11y, SEO/OG, reduced-motion, focus styles, lightweight HTML/CSS/JS.
7. **Same ZIP / WP / JSON / Local Pack** contracts, versioned forward.

Credibility bar: “I could actually replace our local’s website with this.”

---

## 10. Proposed architecture

```
Brand Kit + Roster + WebsiteDraft (+ overlay)
        │
        ▼
composeWebsiteTemplateData()  →  WebsiteTemplateData (content + layoutId + brand)
        │
        ▼
renderWebsiteSite(data, options)  →  { pages[], css, js, strings }
        │
        ├── buildPreviewHtml
        ├── generateWebsiteZip
        └── generateWordpressThemeZip
```

**Separation:**

| Concern | Module area |
|---------|-------------|
| Content / draft | `website-draft.ts`, compose, config envelope |
| Layout definitions | `layouts/registry.ts` + per-layout recipes |
| Section HTML | `sections/*.ts` |
| Site chrome strings | `site-strings.ts` (EN/FR) |
| CSS tokens per layout | layout CSS fragments + shared base |
| Export packaging | existing ZIP generators (thin) |

**Config versioning:** bump `WEBSITE_CONFIG_VERSION` to **2**; accept v1 imports via migrate → v2 (default `layoutId: "solidarity"`, empty new fields). Draft version bumps similarly.

---

## 11. Phased implementation plan

| Phase | Scope | Exit criteria |
|-------|-------|---------------|
| **0** | This living document | Decisions recorded |
| **1** | Render split + quality baseline (skip link, focus, reduced-motion, OG, grain/duotone/accent, device preview scaffolding) | Existing tests green; static site a11y improved |
| **2** | Content model enrichment (phone, hours, CTA, tagline, websiteUrl, roster groups, privacy.html) | Config v2 + migration tests |
| **3** | Three layouts + visual picker | Switching preserves content; ZIP/WP both honour layoutId |
| **4** | Builder progressive modes + guided defaults | EN/FR builder copy; smoke/axe pass |
| **5** | Integrations (QR in ZIP, optional events/ICS, FR export chrome) | Documented; tests for new files |
| **6** | Docs (guide, PROGRESS, what's new), residual polish | Demo-ready |

---

## 12. Compatibility / migration

- v1 JSON/ZIP imports continue to work; migrate to v2 in memory on parse.
- Missing `layoutId` → `solidarity` (visual parity with pre-change sites).
- WordPress theme continues to wrap rendered body; privacy page included when present.
- Hero photo remains session-only (not Local Pack) — unchanged.
- Squarespace export remains a non-option.

---

## 13. Testing requirements

- Unit: compose precedence, config v1→v2 migrate, each layout HTML markers, section roster split, strings locale, XSS/url sanitization regression.
- ZIP: files list includes privacy when enabled; QR/ICS when opted in; fonts/media unchanged.
- WP: theme still installs structurally; skip-link + layout class present.
- E2E: builder loads, layout picker, device preview, download buttons, axe on builder page.
- Manual: three layouts with same Brand Kit look intentionally different; import old ZIP regenerates.

---

## Decision log

| Date | Decision |
|------|----------|
| 2026-09-25 | Full roadmap (quality + content + 3 layouts + builder UX + integrations). |
| 2026-09-25 | **Multi-page not required** for template diversity; privacy stub OK; further multi-page deferred. |
| 2026-09-25 | Diversity = curated **layouts**, not a block CMS or per-local CSS playground. |
| 2026-09-25 | GitHub Pages ZIP remains default; WP second; no Squarespace. |
| 2026-09-25 | Config/draft version bump to 2 with v1 migrate. |

---

## Intentional deferrals (not missed)

- Multi-page site builder / page tree UI
- Hosted Hub→site live sync
- Per-officer public email field (roster schema change)
- Squarespace / WXR / FSE
- Drag-and-drop section reorder marketplace
- In-iframe click-to-edit WYSIWYG

---

## Implementation progress

| Phase | Status |
|-------|--------|
| 0 Document | Done |
| 1 Architecture + quality | Done |
| 2 Content model | Done |
| 3 Layouts | Done (solidarity / bulletin / hall) |
| 4 Builder UX | Done (modes + device preview + visual picker) |
| 5 Integrations | Done (QR opt-in, events/ICS, FR chrome) |
| 6 Docs / ship | Done |

### Shipped notes (2026-09-26)

- Renderer split: `build-website-html.ts` + layout registry; exporters thin.
- Config/draft v2; v1 import migrates to `layoutId: solidarity`.
- Multi-page beyond `privacy.html` remains deferred (decision §6).
