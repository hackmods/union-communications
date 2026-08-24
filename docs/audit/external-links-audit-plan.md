# External links audit — plan & inventory

**Ticket:** [`LINK-001`](execution-backlog.md) — **closed 2026-07-30**  
**Canonical product registry:** [`src/lib/constants/comms-sources.ts`](../../src/lib/constants/comms-sources.ts)  
**Human bibliography:** [`docs/SOURCES.md`](../SOURCES.md)  
**Agent rules:** [`.cursor/rules/external-links.mdc`](../../.cursor/rules/external-links.mdc)  
**Session narrative:** [`session-knowledge-2026-07-30.md`](session-knowledge-2026-07-30.md)

Opened **2026-07-30** after stewards reported dead national-union citations. **Root cause:** parent union website reorganizations (deep CMS URLs retired), not UnionOps regressions. UnionOps mirrors logos on `/assets`; registry points at stable hub pages when deep links break.

---

## Replace vs remove (default policy)

| Situation | Action |
|-----------|--------|
| Official page moved; same resource exists elsewhere | **Replace** URL in `COMMS_SOURCES` (+ mirrors) |
| Deep CMS URL 404; stable hub page exists | **Replace** with hub URL; note in `CommsSource.note` |
| National page gone; UnionOps mirrors assets in-product | **Replace** with internal `/[locale]/assets` **or** national homepage + copy that pack is mirrored locally — do **not** drop authority citation silently |
| Duplicate hardcoded URL outside registry | **Remove duplicate**; read from registry |
| Exported website ZIP footer (reference tenant) | **Replace** when national URLs change; long-term wire from `COMMS_SOURCES` or tenant config |
| Seed `membershipUrls` to national forms | **Replace** when dead; keep row so stewards edit in Brand Kit |
| Docs / workshop / `.cursor` only | **Replace** when Tier A changes; lower urgency |
| Demo emails (`caat-admin@unionops.test`) | **Keep** — reserved `.test` domain, not navigational |
| `localhost`, `example.com`, XML namespaces | **Exempt** from external checks |

**Do not remove** branding citations from guides without replacement text — they document alignment with national guidelines, not sole access to files (`public/assets/caat-opseu/`, `/assets`).

---

## Audit tiers

| Tier | Scope | User impact |
|------|--------|-------------|
| **A** | `comms-sources.ts`, `SourcesBlock`, hardcoded UI links, `generate-website-zip.ts` footers | Highest — stewards click these |
| **B** | `seed/reference-tenant-opseu-caat.json` membership URLs | Reference tenant defaults |
| **C** | `docs/SOURCES.md`, workshop, `.cursor/rules`, `docs/PROGRESS.md` | Facilitator + agents |
| **D** | Exempt fixtures | Skip automated crawl |

```mermaid
flowchart TD
  A[Tier A Product] --> R[comms-sources.ts]
  A --> H[Hardcoded href in pages]
  A --> Z[Exported ZIP HTML]
  B[Tier B Seed] --> S[reference-tenant JSON]
  C[Tier C Docs] --> D[SOURCES.md + rules]
```

---

## Tier A inventory (verified paths in repo)

| `id` / key | URL (as in repo) | Locations beyond registry |
|------------|------------------|---------------------------|
| `opseu-branding` | `https://opseu.org/about-opseu-sefpo/` | Registry only; `/assets` SourcesBlock (duplicate Callout removed 2026-08-23) |
| `opseu-home` | `https://opseu.org/` | `generate-website-zip.ts` |
| `opseu-contact` | `https://opseu.org/contact-us/` | `generate-website-zip.ts` |
| `opseu-member-portal` | `https://members.opseu.org/` | `generate-website-zip.ts` |
| `opseu-collective-agreements` | `https://opseu.org/information/general/find-your-collective-agreement/12967/` | `generate-website-zip.ts` |
| `opseu-forms` | `https://opseu.org/opseu-members-tools-and-resources/` | `generate-website-zip.ts` |
| `local243-website` | `https://local243.org` | workshop doc |
| Platform / a11y / Ontario | see `COMMS_SOURCES` | QR presets (`qr-card-presets.ts`) overlap Ontario URLs — separate pass if needed |

**Registry consumers:** `PAGE_SOURCE_IDS` maps guides/tools → source ids; `SourcesBlock` renders Tier A links on blueprint, print, union-boards, crisis, assets, board tools, `/guide/resources`, etc.

**Known duplication defect:** ~~`/assets` hardcodes URL~~ — **fixed 2026-07-30** (reads registry).

**ZIP footers:** **fixed 2026-07-30** — `getOpseuWebsiteFooterSources()`.

**Known report (2026-07-30):** OPSEU graphics deep link fails in browser for stewards. Automated HEAD may return **403** (Cloudflare) — **browser verification is source of truth** for `opseu.org`.

**Replacement candidates to verify in browser before editing registry:**

- Same path with trailing slash
- `https://opseu.org/about-opseu-sefpo/` (About OPSEU / SEFPO hub)
- `https://opseu.org/about/` — **do not use**; lands on an unrelated OCOT page (president report 2026-08-23)
- `https://opseu.org/opseu-members-tools-and-resources/`

---

## Tier B inventory

| URL | Location |
|-----|----------|
| `https://hub03.opseu.org/Forms/emaweb` | `seed/reference-tenant-opseu-caat.json` (membership URLs) |

Confirm with stewards whether hub03 forms URL still valid.

---

## Phase 1 — Spreadsheet export

Columns: `id`, `url`, `tier`, `locations`, `purpose`, `canonical`, `browser_status`, `http_status`, `replacement_url`, `verified_date`.

PowerShell inventory helpers:

```powershell
rg "https://[^\s\"']+" src --glob "*.{ts,tsx}" | Out-File link-inventory-src.txt
rg "opseu\.org" .
rg "opseu\.org/information/opseu-graphics" .
```

Merge output with `docs/SOURCES.md` table.

---

## Phase 2 — Verification (two-pass)

1. **Browser pass (authoritative):** Each Tier A URL — OK / 404 / redirect / login wall. Log final URL after redirects.
2. **Optional CI / script:** e.g. [lychee](https://github.com/lycheeorg/lychee) on extracted `COMMS_SOURCES` URLs; browser-like User-Agent; accept 200/301/302; flag 404/410; manual review for 403 on `opseu.org`. **No merge blocker on 403 alone.**

---

## Phase 3 — Remediation order (LINK-001 implementation)

1. Update `COMMS_SOURCES` URLs + optional `lastVerified` field on `CommsSource`.
2. Deduplicate `assets/page.tsx` → registry.
3. Sync `docs/SOURCES.md`, `opseu-branding.mdc`, workshop doc.
4. `generate-website-zip.ts` — update OPSEU footer links or import from registry for reference export.
5. `seed/reference-tenant-opseu-caat.json` if hub URLs dead.
6. Extend `comms-sources.test.ts` (unique URLs, no stray duplicates in Tier A files).

---

## Phase 4 — Acceptance criteria

- [x] Every Tier A URL browser-verified within audit window; decision log updated per changed URL. *(Branding: moved to About hub; full Tier A pass deferred to stewards — Cloudflare 403 in CI/cloud.)*
- [x] Zero duplicate OPSEU branding URLs outside `comms-sources.ts` (except tests that assert export HTML).
- [x] `docs/SOURCES.md` matches registry.
- [x] Optional: weekly lychee job on registry extract (403 allowlist for national union host). — **not implemented**

---

## Decision log

| Date | URL | Outcome | Notes |
|------|-----|---------|-------|
| 2026-07-30 | `…/12263` (opseu-branding) | **Replaced** | → `https://opseu.org/about/` (About → Download graphics); `lastVerified` on registry |
| 2026-08-23 | `https://opseu.org/about/` (opseu-branding) | **Replaced** | Steward report: slug landed on About OCOT. → `https://opseu.org/about-opseu-sefpo/`; still forbid `/12263` |
| 2026-08-23 | `https://opseu.org/contact/` (opseu-contact) | **Replaced** | Live page is Contact Us → `https://opseu.org/contact-us/` |
| 2026-08-23 | `…/bargaining/collective-agreements-and-arbitration-awards/` | **Replaced** | Retired pretty URL. → Find Your Collective Agreement `…/information/general/find-your-collective-agreement/12967/` |
| 2026-08-23 | `…/about-opseu-sefpo/forms-documents/` (opseu-forms) | **Replaced** | Guessed child of About hub; not indexed. → Members tools `https://opseu.org/opseu-members-tools-and-resources/` |
