# Public space & composition audit — 2026-08-27

**Audience:** launch sign-off, agents, Ryan.  
**Program:** UnionOps UX uplift — space, composition, and QOL before growth.  
**Breakpoints:** 375 · 768 · 1280 · 1536 (per [`.cursor/rules/responsive-layouts.mdc`](../../.cursor/rules/responsive-layouts.mdc)).

Legend: **✅** intentional · **⚠️** acceptable tradeoff · **❌** fix before Hub advertise · **🔧** shipped this pass

---

## Executive summary

| Priority | Count | Theme |
|----------|-------|-------|
| **P0** | 0 | No launch blockers after Phase 1 guide layout |
| **P1** | 1 | Hub module mobile matrix gaps (Phase 3) |
| **P2** | 2 | Tools catalog secondary visual band; Portal mobile matrix |
| **P3** | 2 | Channel guide copy depth; OL dark-shell token polish |

**Phase 1 shipped:** `readWide` shell + flexible `GuideLayout` presets — playbooks opt into TOC sidebar; channel/legal stay `narrow`; tools stay on `ToolEditorLayout`.

---

## Composition model (flexibility)

Shell width (`PAGE_SHELL`) and layout pattern (`page-composition.ts`) are **separate**:

| Area | Default | Opt-in |
|------|---------|--------|
| Channel / legal guides | `GuideLayout preset="narrow"` | — |
| Playbook guides | `preset="playbook"` + `toc` | `aside`, `composition` override |
| Guide index | `preset="hub"` | — |
| Canvas tools | `ToolEditorLayout` (`workspace`) | document-generator / alt-text exceptions |
| Catalog | Custom wide page + start-here sidebar | `ComposedPageLayout` if reused |
| Officer Learning | Dark shell (exception) | Shared `GuideToc` only |

Do **not** default all guides to `readWide` — only playbooks with TOC. Mobile nav stays in-page after header; desktop rail is lg+ via [`ComposedPageLayout`](../../src/components/layout/ComposedPageLayout.tsx).

---

## Ranked backlog

| Rank | ID | Surface | Finding | Layer | Effort | Priority |
|------|-----|---------|---------|-------|--------|----------|
| 1 | UI-008 | Guide chapters | Single `read` column (~768px) on desktop — stretched mobile shell | shell | M | **🔧 P1 fixed** |
| 2 | UI-010 | Hub `/app/**` | discussions, tasks, checkins, documents, marketplace, snippets, hybrid, meetings, committees, overdue — no `@mobile` overflow matrix | composition | M | P1 |
| 3 | UI-010 | Portal `/portal/**` | Functional smoke only; no `@mobile` overflow at 375 | composition | S | P2 |
| 4 | UI-009 | `/tools` catalog | Labour playbook strip + ComposedPageLayout + mobile Start-here collapse | marketing | L | **🔧 P2 closed** |
| 5 | UI-011 | Officer Learning | Dark shell stays; shared `GuideToc` primitive converged | shell | S | **🔧 P2 partial** |
| 6 | COPY-006 | print, email-broadcast | Channel-tier by design — deepen on steward demand only | copy | M | P3 |

---

## Marketing shell

| Route | 375 | 768 | 1280 | 1536 | Notes |
|-------|-----|-----|------|------|-------|
| `/` Home | ✅ | ✅ | ✅ | ✅ | COPY-001 two-zone hero |
| `/manifesto` | ✅ | ✅ | ✅ | ✅ | `focus` tier intentional |
| `/updates` | ✅ | ✅ | ✅ | ✅ | List + cards |
| `/privacy` | ✅ | ✅ | ⚠️ | ⚠️ | `read` tier — legal narrow OK |
| `/security` | ✅ | ✅ | ⚠️ | ⚠️ | `read` via GuideLayout |
| `/accessibility` | ✅ | ✅ | ⚠️ | ⚠️ | `read` via GuideLayout |

---

## Guides (`/guide/**`)

| Route | 375 | 768 | 1280 | 1536 | Notes |
|-------|-----|-----|------|------|-------|
| `/guide` index | ✅ | ✅ | ✅ | ✅ | `wide` + sidebar TOC + path grid |
| Playbook tier (all TOC guides) | ✅ | ✅ | **🔧** | **🔧** | `readWide` + TOC rail (Phases A1–A3) |
| Gold / channel (12) | ✅ | ✅ | **🔧** | **🔧** | Playbook layout + TOC (Phase A2–A3) |
| `/guide/resources` | ✅ | ✅ | ✅ | ✅ | `hub` + two-column path grids |
| `/guide/officer-learning` | ✅ | ✅ | ✅ | ✅ | Dark `max-w-7xl` exception |
| OL module viewer | ✅ | ✅ | ✅ | ✅ | Sidebar grid reference |

**Playbook tier (Phases A1–A3):** all labour, gold, and channel guides with section TOCs.

---

## Marketing utilities (Phase C)

| Route | 375 | 768 | 1280 | 1536 | Notes |
|-------|-----|-----|------|------|-------|
| `/examples` | ✅ | ✅ | **🔧** | **🔧** | Filter rail @ lg+; masonry fills wide |
| `/assets` | ✅ | ✅ | ✅ | ✅ | Wide hub + AssetPackPanel grid |
| `/captions` | ✅ | ✅ | ✅ | ✅ | Wide composed header + card grid |
| `/manifesto` | ✅ | ✅ | ✅ | ✅ | `focus` tier intentional |
| `/support` | ✅ | ✅ | ✅ | ✅ | `focus` form stack |
| `/install` | ✅ | ✅ | ✅ | ✅ | `focus` PWA steps |
| `/feedback` | ✅ | ✅ | ✅ | ✅ | `focus` form |
| `/onboarding` | ✅ | ✅ | ✅ | ✅ | `focus` wizard cards |

---

## Tools

See [`comms-four-width-qa-matrix-2026-08-25.md`](comms-four-width-qa-matrix-2026-08-25.md) — catalog + 17 tool routes matrixed.

| Finding | Status |
|---------|--------|
| P2-CATALOG Start-here sidebar @ lg+ | ✅ Shipped 2026-08-25 |
| ComposedPageLayout refactor | ✅ Shipped 2026-08-27 (Phase B1) |
| Mobile Start-here `<details>` collapse | ✅ Shipped 2026-08-27 |
| Secondary visual band @ 1280+ | ✅ Labour playbook strip (Phase B1) |
| 375 long scroll before tool links | ⚠️ Mitigated via collapsible Start-here |

---

## Hub (`/app/**`)

| Module | @mobile overflow test | 1280 composition | Notes |
|--------|----------------------|------------------|-------|
| grievances | ✅ UI-002 | ✅ | Reference dashboard |
| bumping | ✅ | ✅ | |
| time | ✅ | ✅ | |
| audit | ✅ UI-006 | ✅ | Card stack @ mobile |
| handoff | ✅ | ✅ | |
| officers | ✅ | ✅ | |
| minutes | ✅ | ✅ | |
| discussions | ❌ | ⚠️ | UI-010 |
| tasks | ❌ | ⚠️ | UI-010 |
| checkins | ❌ | ⚠️ | UI-010 |
| documents | ❌ | ⚠️ | UI-010 |
| marketplace | ❌ | ⚠️ | UI-010 |
| snippets | ❌ | ⚠️ | UI-010 |
| hybrid | ❌ | ⚠️ | UI-010 |
| meetings | ❌ | ⚠️ | UI-010 |
| committees | ❌ | ⚠️ | UI-010 |
| overdue | ❌ | ⚠️ | UI-010 |

---

## Portal (`/portal/**`)

| Route | @mobile overflow | Notes |
|-------|------------------|-------|
| Together | ❌ | UI-010 — add portal.mobile.spec.ts |
| Circle / Hall | ❌ | Tab + bulletin writer |
| Bulletin composer | ❌ | |

---

## Audit criteria (reference)

From [`.cursor/rules/responsive-layouts.mdc`](../../.cursor/rules/responsive-layouts.mdc):

- Shell tier matches use (`read` / `readWide` / `wide` / `focus`)
- lg+ fills or constrains with counterweight (sidebar, grid, visual rail)
- Body copy ≤~65–75ch; diagrams via `GuideWideFigure`
- No orphan empty cards or stretched mobile shell on wide viewports

---

## Related tickets

| Ticket | Phase | Status |
|--------|-------|--------|
| UI-007 | 0 | This audit doc |
| UI-008 | 1 | Guide layout v2 |
| UI-009 | 2 | Catalog ComposedPageLayout + labour strip — **closed 2026-08-27** |
| UI-012 | A1 | Remaining labour playbooks — **closed 2026-08-27** |
| UI-013 | A2 | Gold facilitator guides — **closed 2026-08-27** |
| UI-014 | A3 | Channel guides layout — **closed 2026-08-27** |
| UI-015 | A4 | Resources hub grids — **closed 2026-08-27** |
| UI-017 | B2 | Tool shell regression sweep — **closed 2026-08-27** (parity holds) |
| UI-019 | C1 | Examples/assets/captions composition — **closed 2026-08-27** |
| UI-020 | C2 | Focus pages verify — **closed 2026-08-27** |
| UI-010 | 3 | Hub + Portal mobile matrix |
| UI-011 | 4 | OL `GuideToc` convergence |
| COPY-006 | 5 | Demand-driven guide copy |

---

## Session companions

- [`comms-four-width-qa-matrix-2026-08-25.md`](comms-four-width-qa-matrix-2026-08-25.md)
- [`guides-qol-2026-08.md`](guides-qol-2026-08.md)
- [`session-knowledge-2026-08-27-labour-guides-chrome.md`](session-knowledge-2026-08-27-labour-guides-chrome.md)
- [`public-tools-parity-audit-2026-08-25.md`](public-tools-parity-audit-2026-08-25.md)
