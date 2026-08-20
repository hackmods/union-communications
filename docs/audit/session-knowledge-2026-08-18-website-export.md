# Session knowledge — Website Template CMS export (2026-08-18)

**Audience:** future agents + Ryan.  
**Canonical plan:** [`plan-2026-08-18-website-export-wp-squarespace.md`](plan-2026-08-18-website-export-wp-squarespace.md).  
**Rule:** [`.cursor/rules/website-export.mdc`](../../.cursor/rules/website-export.mdc).  
**Spec:** [`../modules/COMMS.md`](../modules/COMMS.md) Website channel.

---

## What happened

Ask: can Website Template export a native WordPress theme (WXR / block-theme zip) or a Squarespace 7.1 developer/template package?

The tool is a **single-page static ZIP** (`generateWebsiteZip`), not a CMS. Layout is fixed HTML in `buildWebsiteHtml()`. Content is a flat `WebsiteTemplateData` form. Page copy is session React state; `unionops-website.json` in both ZIPs round-trips that copy without writing Brand Kit. There is no block tree, no page list, and no forms (contact is `mailto:`).

---

## Decisions

1. **WordPress classic theme ZIP shipped (Phase 1 + usability extras).** Second serializer wrapping today’s HTML/CSS/JS, plus `page.php`, `404.php`, skip link, branded `screenshot.png`, and a Primary menu with Home/About/Officers/Contact fallback. GitHub Pages ZIP stays the default. Copy states UnionOps does **not** support WordPress. WXR and FSE/`theme.json` are **not** shipped.
2. **Squarespace 7.1 theme / developer-mode / template ZIP is a non-option.** 7.1 has no Developer Platform, no page/layout import (Commerce product CSV only), and no site-building API (public APIs are commerce: orders, products, inventory, contacts). Fluid Engine JSON is undocumented. Do not scrape internal editor APIs.
3. **Do not target Squarespace 7.0 Developer Mode** for new locals. New sites are 7.1; 7.0 DM blocks a clean upgrade.
4. **Do not advertise “Squarespace export.”** Squarespace 7.1 does not accept a custom theme ZIP. Steward-facing copy lives on `/guide/website` and `/tools/website-template` (EN/FR). A Code Block paste is not a template. Do not ship a Squarespace handoff kit unless locals explicitly ask.
5. **Do not replace GitHub Pages** as the default export. A WP theme is a second button for locals who already have WordPress hosting. WP adds PHP/update/plugin risk the Website Guide does not teach.
6. **Phase 1 is the classic theme ZIP only.** No WXR, no FSE, no Squarespace. Sequence if later: skip WXR unless needed → never Phase 4 (SS 7.1 theme).

## Where this is said (do not lose it)

| Audience | Where |
|----------|--------|
| Stewards | `/guide/website` Part 2 (WordPress + Squarespace callouts); `/tools/website-template` (WP download + Squarespace “no export” note) |
| Agents | this file, [`plan-2026-08-18-website-export-wp-squarespace.md`](plan-2026-08-18-website-export-wp-squarespace.md), [`.cursor/rules/website-export.mdc`](../../.cursor/rules/website-export.mdc) |
| Spec | [`../modules/COMMS.md`](../modules/COMMS.md), [`../modules/COMMS_BACKLOG.md`](../modules/COMMS_BACKLOG.md) |

Do not put the mapping matrix in `AGENTS.md` or an always-apply rule.

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
| [`src/lib/templates/website/website-config.ts`](../../src/lib/templates/website/website-config.ts) | `unionops-website.json` serialize / parse / ZIP lookup |
| [`src/lib/templates/website/generate-website-zip.ts`](../../src/lib/templates/website/generate-website-zip.ts) | HTML/CSS/JS + GitHub Pages ZIP |
| [`src/lib/templates/website/generate-wordpress-theme-zip.ts`](../../src/lib/templates/website/generate-wordpress-theme-zip.ts) | Classic WP theme ZIP |
| [`src/app/[locale]/tools/website-template/page.tsx`](../../src/app/[locale]/tools/website-template/page.tsx) | Form UI; copy is session state + importable site file |
| [`src/app/[locale]/guide/website/page.tsx`](../../src/app/[locale]/guide/website/page.tsx) | Steward Website Guide (WP + Squarespace callouts) |
