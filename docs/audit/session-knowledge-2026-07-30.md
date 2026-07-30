# Session knowledge — 2026-07-30

**Audience:** future agents + Ryan.  
**Companion:** [`current-ground-truth.md`](current-ground-truth.md), [`external-links-audit-plan.md`](external-links-audit-plan.md).  
**Backlog:** [`LINK-001`](execution-backlog.md) — **closed** same day (core remediation).  
**PR:** [#24](https://github.com/hackmods/union-communications/pull/24) on branch `cursor/external-links-audit-a334`.

---

## What happened

Stewards reported **broken bibliography links** (starting with OPSEU graphics/letterhead deep URL `…/12263`). Investigation showed:

1. **Root cause is upstream** — the reference tenant’s national union **reorganized their public website** and retired many deep CMS URLs. UnionOps did not break those links; citations were stale after their deploy.
2. **Do not treat reports as toolbox regressions** by default — confirm whether the national/government host moved content before debugging UnionOps routes or exports.
3. **Automated link checks lie for `opseu.org`** — Cloudflare often returns **403** to HEAD/curl/cloud agents even when browsers work. **Browser verification is authoritative** for Tier A national URLs.
4. **Product already mirrors branding** — logos and swatches on `/[locale]/assets` and `public/assets/caat-opseu/` so stewards are not blocked when a national download page 404s.

Ryan confirmed explicitly: national site update caused the rot — **not UnionOps**.

---

## What shipped

| Slice | Outcome |
|-------|---------|
| Audit playbook | `docs/audit/external-links-audit-plan.md` — tiers, replace-vs-remove, inventory, acceptance criteria |
| Backlog ticket | **`LINK-001`** — open → closed (core) |
| Agent rules | `.cursor/rules/external-links.mdc`; cross-refs in `comms-module.mdc`, `opseu-branding.mdc`, `.cursorrules`, `AGENTS.md` |
| Registry fix | `opseu-branding` → `https://opseu.org/about/` (About hub → Download graphics); `lastVerified` optional on `CommsSource` |
| Deduplication | `/assets` reads `COMMS_SOURCES["opseu-branding"]` — no second hardcoded href |
| Website ZIP | `getOpseuWebsiteFooterSources()` + ids `opseu-home`, `opseu-contact` |
| Steward copy | `messages/en.json` + `fr.json` — `sources.intro` explains national sites change URLs; use `/assets` mirrors |
| Tests | `comms-sources.test.ts`, `generate-website-zip.test.ts` |

---

## Hard lessons (do not re-learn)

### 1. Single registry for citations

All Tier A national/government bibliography URLs live in **`src/lib/constants/comms-sources.ts`**. Guides/tools use `SourcesBlock` + `PAGE_SOURCE_IDS`. Never add new hardcoded `https://` union citations in page TSX.

### 2. Replace, don’t remove authority links

When a national URL dies, **replace** with a hub page or point stewards to in-product mirrors. Do not delete the citation without replacement copy — it documents alignment with national brand guidelines.

### 3. ZIP export must follow registry

Reference-tenant website footers use **`OPSEU_WEBSITE_FOOTER_SOURCE_IDS`** / `getOpseuWebsiteFooterSources()`. When national URLs change, update registry once.

### 4. Steward-facing tone

Sources footers should acknowledge **external link rot** without blaming volunteers or UnionOps. EN/FR `sources.intro` is the user-visible pattern.

### 5. Deferred (non-blocking)

- **`hub03.opseu.org`** membership URLs in `seed/reference-tenant-opseu-caat.json` — steward confirmation when reported dead
- Optional **lychee** scheduled link check (403 allowlist) — audit plan Phase 5

---

## File map (agents)

| Concern | Path |
|---------|------|
| Canonical URLs | `src/lib/constants/comms-sources.ts` |
| UI bibliography | `src/components/comms/SourcesBlock.tsx` |
| Full list page | `src/app/[locale]/guide/resources/page.tsx` |
| Asset pack + guidelines link | `src/app/[locale]/assets/page.tsx` |
| Exported local site footers | `src/lib/templates/website/generate-website-zip.ts` |
| Human table | `docs/SOURCES.md` |
| Playbook | `docs/audit/external-links-audit-plan.md` |
| Cursor rule | `.cursor/rules/external-links.mdc` |

---

## Decision log (branding)

| Was | Now | Why |
|-----|-----|-----|
| `https://opseu.org/information/opseu-graphics-logos-and-letterhead-templates/12263` | `https://opseu.org/about/` | National site retired deep link; About page hosts “Download graphics” |

Re-check in a normal browser after future national CMS changes.
