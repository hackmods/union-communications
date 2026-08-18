# Session knowledge — Website Template CMS export (2026-08-18)

**Audience:** future agents + Ryan.  
**Canonical plan:** [`plan-2026-08-18-website-export-wp-squarespace.md`](plan-2026-08-18-website-export-wp-squarespace.md).  
**Rule:** [`.cursor/rules/website-export.mdc`](../../.cursor/rules/website-export.mdc).  
**Spec:** [`../modules/COMMS.md`](../modules/COMMS.md) Website channel.

---

## What happened

Ask: can Website Template export a native WordPress theme (WXR / block-theme zip) or a Squarespace 7.1 developer/template package?

The tool is a **single-page static ZIP** (`generateWebsiteZip`), not a CMS. Layout is fixed HTML in `buildWebsiteHtml()`. Content is a flat `WebsiteTemplateData` form. Page copy is ephemeral React state. There is no block tree, no page list, and no forms (contact is `mailto:`).

---

## Decisions

1. **WordPress is feasible.** Best path is a **classic PHP theme ZIP** that wraps today’s HTML/CSS/JS (second JSZip serializer). WXR-only is weaker (no styles; media needs hosted URLs — conflicts with ADR-001). Full Site Editing / `theme.json` block themes are **Large** and not worth it until we invent a block model we do not have.
2. **Squarespace 7.1 theme / developer-mode / template ZIP is a non-option.** 7.1 has no Developer Platform, no page/layout import (Commerce product CSV only), and no site-building API (public APIs are commerce: orders, products, inventory, contacts). Fluid Engine JSON is undocumented. Do not scrape internal editor APIs.
3. **Do not target Squarespace 7.0 Developer Mode** for new locals. New sites are 7.1; 7.0 DM blocks a clean upgrade.
4. **Do not advertise “Squarespace export.”** A Code Block paste or Custom CSS dump is not a template. Optional consolation (Phase 5) is a **handoff markdown** in the existing ZIP — documentation, not an integration.
5. **Do not replace GitHub Pages** as the default export. A WP theme is a second button for locals who already have WordPress hosting. WP adds PHP/update/plugin risk the Website Guide does not teach.
6. **Phase 0 is docs only.** No Website Template code until demand is proven. Sequence if later: Phase 1 classic theme → skip WXR unless needed → never Phase 4 (SS 7.1 theme).

---

## Do not

- Rebuild Website Template as a block CMS in order to “support Squarespace.”
- Promise WXR as a complete WordPress site (it is one unstyled page without bundled media).
- Ship unofficial Squarespace editor automation.
- Put the mapping matrix in `AGENTS.md` or an always-apply rule.

---

## Key files (as-built, not a CMS)

| File | Role |
|------|------|
| [`src/types/website-template.ts`](../../src/types/website-template.ts) | Flat `WebsiteTemplateData` |
| [`src/lib/templates/website/generate-website-zip.ts`](../../src/lib/templates/website/generate-website-zip.ts) | HTML/CSS/JS + GitHub Pages ZIP |
| [`src/app/[locale]/tools/website-template/page.tsx`](../../src/app/[locale]/tools/website-template/page.tsx) | Form UI; copy not persisted |
