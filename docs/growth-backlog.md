# Public UI growth backlog

**Status:** Phase 3 complete 2026-09-08 — GB-001–012 shipped.  
**Origin:** Gaps noticed during the guide layout standards rollout (`GuideSection` / tip grids / outline primitives).  
**Quality bar:** reusable guide-ui primitives + Tailwind tokens; no `!important`, no one-off magic pixels, no copy-pasted section chrome, no inline styles.

Related (out-of-scope shells — do not expand this list into them without a product decision):  
[`docs/audit/guide-layout-growth-backlog.md`](audit/guide-layout-growth-backlog.md) (Officer Learning dark shell, legal narrow pages, tool panels, PDF).

Standards: [`.cursor/rules/guide-layout-standards.mdc`](../.cursor/rules/guide-layout-standards.mdc) · barrel: [`src/components/comms/guide-ui.ts`](../src/components/comms/guide-ui.ts).

---

## Items (closed)

| ID | Priority | Area | Status | Notes |
|----|----------|------|--------|-------|
| **GB-001** | P1 | Architecture | **Done** | Public guide pages + land-ack body import from `guide-ui` only. |
| **GB-002** | P1 | Measure / rhythm | **Done** | `Callout` `measure` + `GuideCallout` (prose default); guide pages migrated off ad-hoc `max-w-prose` on callouts. Follow-up 2026-09-08: Blueprint strike promo → `GuideSpotlightBand`; related guides → `GuideLinkCluster` / `GuideLinkList`. |
| **GB-003** | P1 | Steward-101 | **Done** | DFR tips → `GuideBulletList`; callouts → `GuideCallout` inside training phases. |
| **GB-004** | P1 | Workshops hub | **Done** | `/guide/workshops` → `GuideCatalogCard`. |
| **GB-005** | P1 | A11y / TOC | **Done** | `useGuideTocActiveId` + `GuidePlaybookToc` wired from `GuideLayout`. |
| **GB-006** | P2 | A11y / motion | **Done** | Playbook TOC `smoothScroll` on; reduced-motion → instant. |
| **GB-007** | P2 | API polish | **Done** | `GuideTipItem` `punctuation?: "." \| ":" \| ""`. |
| **GB-008** | P2 | Regression guard | **Done** | `src/lib/comms/guide-layout-guards.test.ts`. |
| **GB-009** | P2 | Workshop demo band | **Done** | `GuideSpotlightBand` on comms workshop. |
| **GB-010** | P2 | Resources sources | **Done** | `ResourcesSourcesList` categories → `GuideAccentBlock`. |
| **GB-011** | P3 | Website guide | **Done** | Documented accepted `PartFrame` exception in standards. |
| **GB-012** | P3 | Mobile TOC UX | **Done** | Shared mobile `<details>` focus-visible + close-on-link in `GuidePlaybookToc`. |

---

## Explicitly not in this backlog

- Officer Learning dark tip grids / module viewer density  
- `/privacy` `/security` `/accessibility` width changes  
- `AssetPackPanel` / canvas tool chrome  
- PDF spatial layout  

(See audit growth backlog for methodology when those are opened.)
