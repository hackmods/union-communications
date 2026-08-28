# Comms four-width QA matrix — 2026-08-25

**Audience:** launch sign-off + agents.  
**Breakpoints:** 375 · 768 · 1280 · 1536 (per [`tool-editor-ux.mdc`](../../.cursor/rules/tool-editor-ux.mdc)).  
**Method:** Structural review of layout contracts + hardening train changes; manual browser spot-check recommended before public launch comms.

Legend: **✅** intentional at breakpoint · **⚠️** acceptable with known tradeoff · **❌** failure (fix before launch)

---

## Catalog `/tools`

| Width | Status | Notes |
|-------|--------|-------|
| 375 | ⚠️ | Start-here band stacks above four job groups — long scroll before tool links. Acceptable v1; collapse on mobile is a future polish. |
| 768 | ✅ | Two-column catalog grid; tap targets ≥44px on step links. |
| 1280 | ✅ | Sticky Start-here sidebar + 2×2 catalog beside aside (Wave 3). |
| 1536 | ✅ | xl four-column catalog + sidebar. |

---

## Tool matrix (17 routes)

| Tool | 375 | 768 | 1280 | 1536 | Hardening notes |
|------|-----|-----|------|------|-----------------|
| logo-builder | ✅ | ✅ | ✅ | ✅ | TEL + mini dock; reference brand tool. |
| resizer | ✅ | ✅ | ✅ | ✅ | `belowGrid` gallery scrolls inside card; export in previewActions. |
| document-generator | ⚠️ | ✅ | ✅ | ✅ | Preset tile grid still tall on phone; fields/structure collapsed (Wave 3). |
| board-banner | ✅ | ✅ | ✅ | ✅ | **Hardening:** trim preview + banner design collapsed via `ToolFormDetails`. |
| board-notice | ✅ | ✅ | ✅ | ✅ | Standard TEL print tool. |
| solidarity-poster | ✅ | ✅ | ✅ | ✅ | Format seg + preview framing OK. |
| qr-board | ✅ | ✅ | ✅ | ✅ | Slot repeater dense but scroll-contained. |
| org-chart | ✅ | ✅ | ✅ | ✅ | Officer repeater long; preview sticky @ lg+. Added to `@export` fidelity PNG matrix. |
| flyer-maker | ✅ | ✅ | ✅ | ✅ | Demo seed + `max-w-md lg:max-w-lg` preview (Wave 1–2). |
| qr-card | ✅ | ✅ | ✅ | ✅ | Wallet pack reference. |
| action-card | ✅ | ✅ | ✅ | ✅ | Wallet pack. |
| pulse-poll | ✅ | ✅ | ✅ | ✅ | **Hardening:** Hub sign-in Callout in toolbar; duplicate form exports removed; demo seed (Wave 1). |
| graphic-maker | ✅ | ✅ | ✅ | ✅ | Social reference; portrait 9:16 constraint. |
| quote-card | ✅ | ✅ | ✅ | ✅ | Social pack. |
| meeting-background | ✅ | ✅ | ✅ | ✅ | **Hardening:** optional copy + layout/design collapsed; toggles/size already collapsed. |
| website-template | ✅ | ✅ | ✅ | ✅ | **Hardening:** hero/about/contact/bundled links collapsed; neutral office address; ZIP/WordPress in toolbar (export always visible @ lg+). |
| alt-text | ✅ | ✅ | ✅ | ✅ | PageShell exception; reference column collapsed (Wave 3). |

**Pulse Poll catalog:** Hidden for anonymous users by design — not a layout failure.

---

## Export verification

| Gate | Status | Command |
|------|--------|---------|
| Export fidelity `@export` | Run in CI / pre-launch | `npm run test:export` |
| Default smoke | Run pre-launch | `npm run test:smoke` |
| Org Chart preview↔capture | Added 2026-08-25 | `e2e/tools.export.fidelity.spec.ts` pngCases |

Pulse Poll PNG/PDF fidelity remains skipped when Officer Hub is not public (anonymous CI path).

---

## Guides (`/guide/**`) — added 2026-08-27

**Layout:** `GuideLayout` default `readWide` (`max-w-7xl`) + sticky TOC sidebar @ lg+ for playbook tier. Prose stays `max-w-prose` inside article.

| Route tier | 375 | 768 | 1280 | 1536 | Notes |
|------------|-----|-----|------|------|-------|
| `/guide` index | ✅ | ✅ | ✅ | ✅ | `wide` hub — unchanged |
| Playbook (8 routes) | ✅ | ✅ | ✅ | ✅ | TOC rail + mobile `<details>` |
| Gold / channel guides | ✅ | ✅ | ⚠️ | ⚠️ | `readWide` frame; TOC opt-in later |
| Officer Learning | ✅ | ✅ | ✅ | ✅ | Dark shell + ModuleViewer grid |

See [`public-space-composition-audit-2026-08.md`](public-space-composition-audit-2026-08.md) for Hub/Portal matrix.

---

## Hub mobile (`/app/**`) — added 2026-08-27

Covered in [`e2e/hub.mobile.spec.ts`](../../e2e/hub.mobile.spec.ts): grievances, bumping, time, audit, handoff, officers, minutes.

| Module | @mobile overflow | Status |
|--------|------------------|--------|
| grievances / bumping / time | ✅ | UI-002 |
| audit / handoff / officers / minutes | ✅ | UI-006 |
| discussions / tasks / checkins / documents / marketplace / snippets / hybrid / meetings / committees / overdue | ⚠️ | UI-010 — tests added 2026-08-27 |

---

## Portal mobile — added 2026-08-27

| Route | @mobile overflow | Status |
|-------|------------------|--------|
| Together | ✅ | [`e2e/portal.mobile.spec.ts`](../../e2e/portal.mobile.spec.ts) |
| Hall / Bulletin | ✅ | Same spec |

---

## Launch checklist (manual)

1. Browser-resize spot-check any **⚠️** row above at real widths.
2. `npm run lint` + `npm run test:unit -- src/lib/comms/public-copy-style.test.ts`
3. `npm run test:export` green on a machine with dev server or CI artifact.
4. French pass on Pulse Poll Hub Callout + Website section labels.

---

## Related

- [`public-tools-parity-audit-2026-08-25.md`](public-tools-parity-audit-2026-08-25.md)
- [`public-space-composition-audit-2026-08.md`](public-space-composition-audit-2026-08.md)
- [`session-knowledge-2026-08-25-public-tools-parity.md`](session-knowledge-2026-08-25-public-tools-parity.md)
- [`session-knowledge-2026-08-25-comms-relaunch-hardening.md`](session-knowledge-2026-08-25-comms-relaunch-hardening.md)
