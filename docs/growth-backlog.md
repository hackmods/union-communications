# Public UI growth backlog

**Status:** Proposed 2026-09-08 — **awaiting approval before implementation.**  
**Origin:** Gaps noticed during the guide layout standards rollout (`GuideSection` / tip grids / outline primitives).  
**Quality bar (when approved):** reusable guide-ui primitives + Tailwind tokens; no `!important`, no one-off magic pixels, no copy-pasted section chrome, no inline styles.

Related (out-of-scope shells — do not expand this list into them without a product decision):  
[`docs/audit/guide-layout-growth-backlog.md`](audit/guide-layout-growth-backlog.md) (Officer Learning dark shell, legal narrow pages, tool panels, PDF).

Standards: [`.cursor/rules/guide-layout-standards.mdc`](../.cursor/rules/guide-layout-standards.mdc) · barrel: [`src/components/comms/guide-ui.ts`](../src/components/comms/guide-ui.ts).

---

## Proposed items (Phase 1)

| ID | Priority | Area | Gap | Proposed long-term fix |
|----|----------|------|-----|------------------------|
| **GB-001** | P1 | Architecture | Most playbook pages import both `@/components/comms/GuideLayout` and `guide-ui`, inviting drift. | Single import path: migrate all public guides to `guide-ui` barrel only; document in standards. |
| **GB-002** | P1 | Measure / rhythm | Dozens of `Callout … className="… max-w-prose"` (and leftover `li.max-w-prose`) left-pin callouts/lists inside wide article columns. | Add shared measure token + `GuideCallout` (or `Callout` `measure="prose" \| "fill"`) and migrate guide Callouts / remaining tip lists off ad-hoc `max-w-*`. |
| **GB-003** | P1 | Steward-101 | Training phases still use left-pinned `max-w-prose` disc lists and CTA `max-w-2xl` clamps inside `GuideTrainingPhase`. | Finish densification with `GuideTipGrid` / `GuideActionRow` / `GuideProse` inside training modules (keep `GuideTrainingPhase` chrome). |
| **GB-004** | P1 | Workshops hub | `/guide/workshops` uses anonymous `border-l-2` catalog rows (not chapters, not outline steps). | Add `GuideCatalogCard` (or hub grid of accent cards) — fill `sm+` width; keep hub shell. |
| **GB-005** | P1 | A11y / TOC | `GuideToc` supports `activeId` but playbooks never supply scroll-spy; rail never reflects position. | Client `useGuideTocActiveId` (IntersectionObserver + `scroll-mt`) wired from `GuideLayout` / playbook TOC; respect `prefers-reduced-motion`. |
| **GB-006** | P2 | A11y / motion | TOC `smoothScroll` defaults off; hash jumps are abrupt. | Enable smooth scroll from GuideLayout for playbooks; keep reduced-motion → instant. |
| **GB-007** | P2 | API polish | `GuideTipItem` always appends `.` after labels — brittle if copy already has punctuation. | Explicit `punctuation?: "." \| "" \| ":"` (default `"."`) on `GuideTipItem`; no string hacks in pages. |
| **GB-008** | P2 | Regression guard | Nothing stops a future page from reintroducing local `function GuideSection` / `TipItem`. | Vitest (or eslint) guard scanning `src/app/**/guide/**` for forbidden local helper patterns + dual-import smell. |
| **GB-009** | P2 | Workshop demo band | Comms workshop “Demo Path” band is a one-off bordered section. | Extract `GuideSpotlightBand` (kicker + lead + slot + note) reused by workshop (+ optional other playbooks). |
| **GB-010** | P2 | Resources sources | `ResourcesSourcesList` category blocks still hand-rolled accents. | Use `GuideAccentBlock` (or thin `GuideHubCategory`) for category chrome; keep sources data logic. |
| **GB-011** | P3 | Website guide | `/guide/website` still uses bespoke `PartFrame` / glance cards — intentional but undocumented relative to standards. | Document as accepted exception in standards **or** map frames onto `GuideSection` + grid primitives if parity is clean. |
| **GB-012** | P3 | Mobile TOC UX | Mobile TOC is a raw `<details>`; verify focus-visible, open state, and “jump closes” behavior for phone stewards. | Harden shared mobile TOC chrome inside `GuideLayout` (one place), not per-page. |

---

## Explicitly not in this backlog

- Officer Learning dark tip grids / module viewer density  
- `/privacy` `/security` `/accessibility` width changes  
- `AssetPackPanel` / canvas tool chrome  
- PDF spatial layout  

(See audit growth backlog for methodology when those are opened.)

---

## Approval gate

**Phase 2:** Review the table above. Approve all, a subset (by ID), or request edits.  
**Phase 3:** Implement only approved IDs, in priority order (P1 → P2 → P3), with reusable primitives first and page migrations second.
