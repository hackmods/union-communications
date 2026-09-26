# Viewport Lab follow-ups — related tools, Hub/Portal audit, Local 404

**Date:** 2026-09-26  
**Context:** Deferred non-goals from the Viewport Lab responsive + UX pass (`26d1b198`). Public responsive S1 + generator recovery shipped separately.  
**Ground truth:** Prefer this plan over the audit's implied “gate crashed tools” / “add full marketing chrome to 404” readings — both need the product-aligned scopes below.

---

## Program order

| Order | Track | Why first |
|------:|-------|-----------|
| 1 | Related-tools gating (`VL-REL-*`) | Small code surface; fixes a real disable-list hole for `/create/*` hrefs |
| 2 | Hub/Portal deep responsive audit (`VL-HUB-*`) | Large inventory; Playwright-only (Viewport Lab cannot frame Hub/Portal) |
| 3 | Local 404 chrome (`VL-404-*`) | Product decision first; most locale chrome already exists |

Do **not** implement crash-time “health probes” that hide Related Tools when a route throws — generators are treated healthy on `main` after undo/hydrate + error-boundary recovery. Gating stays **Site Admin public-tool disable lists**.

---

## Track 1 — Related-tools health gating (`VL-REL`)

### Problem

`ToolRelatedFooter` already filters via `useDisabledPublicTools()` → `GET /api/public-tools/visibility`, but `slugFromToolHref` only matches `/tools/:slug`:

```ts
// src/lib/public-tools/visibility.ts
export function slugFromToolHref(href: string): string | null {
  const match = href.match(/^\/tools\/([^/?#]+)/);
  return match?.[1] ?? null;
}
```

`RELATED_BY_TOOL` cross-links for Letter ↔ Document Generator use `/create/...`, so **disabled generators still appear** in Related footers. Utility peers often still use legacy `/tools/document-generator` (those *would* filter). Guides and Brand Kit links are intentionally not tool-gated.

### Chosen approach

1. **Extend** `slugFromToolHref` (and tests) to accept `/create/:slug` and `/utilities/:slug` (same rewrite targets as `next.config.ts`).
2. **Normalize** `RELATED_BY_TOOL` hrefs to canonical public destinations (`/create/` for Create tools, `/utilities/` for utilities) so filter + UX match the catalog.
3. **Document** that guides / Brand Kit / Hub deep links stay visible when a peer tool is disabled.
4. **Do not** add runtime crash health or “tool down” flags — disable lists + smoke coverage remain the contract.

### Tickets

| ID | Work |
|----|------|
| `VL-REL-1` | Parse `/create` + `/utilities` in `slugFromToolHref`; unit tests in `visibility.test.ts` |
| `VL-REL-2` | Hygiene pass on `RELATED_BY_TOOL` hrefs in `RelatedToolsStrip.tsx` |
| `VL-REL-3` | Smoke or unit: disabled slug hides footer link for both `/tools` and `/create` forms |

### Verify

`npm run test:unit -- src/lib/public-tools/visibility.test.ts`  
Optional: Site Admin disable document-generator → Related footer on letter-generator / proposal-tracker hides the link.

### Files

- [`src/lib/public-tools/visibility.ts`](../../src/lib/public-tools/visibility.ts)
- [`src/lib/public-tools/visibility.test.ts`](../../src/lib/public-tools/visibility.test.ts)
- [`src/components/tools/RelatedToolsStrip.tsx`](../../src/components/tools/RelatedToolsStrip.tsx)
- [`src/components/tools/ToolRelatedFooter.tsx`](../../src/components/tools/ToolRelatedFooter.tsx)

---

## Track 2 — Hub/Portal deep responsive audit (`VL-HUB`)

### Problem

Viewport Lab **cannot** audit authenticated surfaces: `frame-ancestors 'none'` / `X-Frame-Options: DENY` for `/app` and `/portal` ([`framing-policy.ts`](../../src/lib/security/framing-policy.ts), [`VIEWPORT_LAB.md`](../guides/VIEWPORT_LAB.md)). The public audit correctly marked Hub/Portal **blocked**.

Partial coverage already exists (`e2e/hub.mobile.spec.ts`, `portal.mobile.spec.ts`, `hub.a11y.spec.ts` smoke subset). Stale ❌ rows in older composition audits must be re-baselined (UI-010 closed 2026-08-27).

### Chosen approach

Run a **Playwright + human** four-width matrix (375 / 768 / 1280 / 1536), **not** Viewport Lab.

1. **Inventory** Hub (~70 `page.tsx` under `app/[locale]/app`) + Portal (8 routes) + high-traffic detail/`[id]` paths.
2. **Automate** overflow checks by extending `hub.mobile` / `portal.mobile` for modules missing coverage (bylaws, proposals, data workbench, portal proposals/dispatch, site-admin if in scope).
3. **Composition sign-off** at 1280 against [`responsive-layouts.mdc`](../../.cursor/rules/responsive-layouts.mdc) hard rejects (CTA wrap, unbounded measure, stretched mobile shell).
4. **Human follow-ups** from hub-dashboard session knowledge: screen reader + 200% zoom; FR Hub nav at 1536.

### Tickets

| ID | Work |
|----|------|
| `VL-HUB-0` | Route checklist + matrix doc (refresh composition/four-width notes; mark Viewport Lab N/A) |
| `VL-HUB-1` | Extend mobile overflow specs for uncovered modules |
| `VL-HUB-2` | 1280 composition pass (dashboard, grievance detail, one Portal circle) — findings → fix backlog |
| `VL-HUB-3` | Optional axe smoke widen (keep MFA serial); do not block default CI on full `hub.a11y` |
| `VL-HUB-4` | Document SR/zoom human results in session-knowledge |

### Auth / fixtures

- Hub: `loginAsDemoOfficer` (and elevated where needed)
- Portal: `loginAsMember`
- Capture module-off / MFA-gated empty states where layout differs

### Verify

`npx playwright test e2e/hub.mobile.spec.ts e2e/portal.mobile.spec.ts e2e/viewport-lab.smoke.spec.ts` (lab still asserts Hub/Portal stay unframeable).

---

## Track 3 — Local 404 chrome (`VL-404`)

### Problem

Audit F18 called locale 404 “bare.” Product reality:

| Surface | Chrome today |
|---------|----------------|
| `[locale]/not-found.tsx` | Locale layout **Header + Footer** + focused `RouteStatusPanel` (tools / home / feedback) |
| Root `app/not-found.tsx` | **Intentionally bare** `RouteStatusStatic` (EN tools + EN/FR home) — no intl, no Header |
| Hub / Portal not-found | Nested in Hub/Portal nav shells |

Session knowledge ([`session-knowledge-2026-08-09-local-404.md`](session-knowledge-2026-08-09-local-404.md)) locks solidarity recovery card + eggs — **not** a second marketing Home.

### Chosen approach

1. **Keep** focused `RouteStatusPanel` / `RouteStatusStatic` as the primary recovery UI (no hero rebuild).
2. **Enrich locale panel wayfinding** with compact Create / Utilities / Learn links (reuse existing `routeUi` or small new keys) — addresses “only 3 links” without duplicating the full Header job.
3. **Root misses:** redirect (or soft-link) into `/en/...` locale shell when safe, so stewards land on Header + i18n CTAs; keep `global-error` free of next-intl.
4. **Do not** add marketing hero, stats, or duplicate primary CTAs on 404.

### Tickets

| ID | Work |
|----|------|
| `VL-404-1` | Amend session-knowledge with this decision (panel enrich + root→locale) |
| `VL-404-2` | Locale panel wayfinding links + EN/FR |
| `VL-404-3` | Root not-found → locale redirect or equivalent; regression in `seo.smoke` |
| `VL-404-4` | Confirm Hub/Portal nested 404s unchanged |

### Verify

`npx playwright test e2e/seo.smoke.spec.ts` (Local 404 not Next stock; Header present on `/en/missing-path`; root path behavior as designed).

---

## Explicit non-goals

- Runtime crash/health API for public tools
- Framing Hub/Portal inside Viewport Lab
- Replacing solidarity 404 with a full Home/marketing composition
- Card-stack redesign of Proposal Tracker (already fixed via scrollport)

---

## Milestone exit

- All `VL-REL-*` closed with unit coverage
- `VL-HUB-0` + `VL-HUB-1` closed; `VL-HUB-2` findings filed or fixed
- `VL-404-1`–`3` closed; session-knowledge updated
- Short `docs/PROGRESS.md` note per track when each ships
