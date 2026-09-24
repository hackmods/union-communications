# UnionOps product architecture & UX refactor

Living implementation record for the product-architecture, information-architecture, navigation, layout, interaction-pattern, and user-flow refactor.

**Objective:** Make UnionOps feel like one coherent system — Brand Kit as foundation, Create / Utilities / Learn as distinct intents, Platform (Officer Hub + Local Portal) discoverable for logged-out visitors — without weakening auth, privacy, localization, or accessibility boundaries.

**Started:** 2026-09-24  
**Status:** Core IA shipped (PR #119). Follow-ups remain in the fit-gap register (broader tool/Learn separation, letter-engine consolidation, CI infra for 0s push failures).

---

## Repository-backed plan (starting hypothesis)

### Current information architecture (as-built before this refactor)

| Surface | Canonical URL | Role |
|--------|---------------|------|
| Home | `/` | Value prop + Brand Kit → Create → Learn workflow + Guided setup |
| Start | `/start` | Role checklists (comms / steward / officer) — **in primary nav** |
| Brand Kit | `/create/brand-kit` | On-device local identity (also primary nav) |
| Create | `/create` | Flat catalog of **all** tools (creative + operational) |
| Learn | `/learn` | Guides, playbooks, Officer Learning, workshops, libraries |
| Join | `/join` | Hosted product beta pitch + access request |
| Officer Hub / Portal | `/app`, `/portal` | Gated; Hub only in header when signed in or `NEXT_PUBLIC_OFFICER_HUB_PUBLIC` |

Evidence: `src/components/layout/nav/nav-config.ts`, `src/lib/comms/public-catalog.ts`, `src/lib/seo/public-routes.ts`, `docs/audit/session-knowledge-2026-09-20-task-first-public-site.md`, `.cursor/rules/comms-public-nav.mdc`.

### Problems discovered

1. **Create mixes intents** — graphic makers and steward worksheets share one catalog; “What do you want to make?” and “What do you need to get done?” compete.
2. **Start in primary nav** — Guided setup is valuable but competes with Brand Kit / Create / Learn; circular feel with Home workflow + Start + catalog cross-links.
3. **Platform under-discoverable** — Hub/Portal explanation lives on `/join` and gated header links; a president can browse Comms without understanding hosted products.
4. **Brand Kit nested under Create URL** — Product-correct as a nav item, but catalog and home still imply “another tool.”
5. **Historical terminology** — “First week,” “Start,” “tools,” and dual Create/utility grouping labels lag the current product model.
6. **Tool ↔ Learn fusion risk** — Topic tools (RTW, complaint-vs-grievance, etc.) may carry mini-course content that belongs in Learn with a contextual link back.
7. **Flat catalogs** — Create/Learn grids are filterable but weak hierarchical progressive disclosure (known P2 from prior session knowledge).

### Proposed information architecture

```
Brand Kit          → configure local once (/create/brand-kit, URL preserved)
Create             → creative / communication artifacts (/create)
Utilities          → practical union workspaces (/utilities)
Learn              → guides, playbooks, courses, workshops, reference (/learn)
Platform           → Officer Hub + Local Portal explanation (/platform → join CTA)
Sign in            → existing account control (not a primary product category)
```

Secondary (footer / utilities): Start (guided setup), What's new, About (`/manifesto`), Support, Privacy, Security, Accessibility, Feedback, Install, Search.

### Navigation changes

- Primary: **Brand Kit · Create · Utilities · Learn · Platform**
- Remove **Start** from primary nav; keep `/start` linked from Home “Guided setup” and footer/secondary where useful.
- Keep Search, language, display, account as utilities.
- Keep session/env-gated Officer Hub and Local Portal links when applicable (operational shortcuts), distinct from Platform marketing.

### Terminology changes

| Legacy | Direction |
|--------|-----------|
| Start (primary) | Demote to “Guided setup” journey; keep URL `/start` |
| Create | Keep; narrow to creative outputs |
| Utilities / Workspaces | Public label **Utilities**; “workspaces” reserved for Hub/Portal ops language |
| First week | Visible label → **First-week plan** (URL `/learn/first-week` unchanged) |
| Tools | Internal/legacy path segment; public language Create / Utilities |
| Platform | New public product area for Hub + Portal |
| Guides | Remain a Learn content type; catalog title stays Learn-forward |

### Tool classifications

**Create** (finished communication / creative artifact):

- letter-generator, document-generator, graphic-maker, flyer-maker, board-banner, board-notice, solidarity-poster, qr-board, qr-card, action-card, quote-card, meeting-background, org-chart, logo-builder, website-template

**Utilities** (accomplish union work):

- rtw-accommodation, grievance-form-builder, ca-snippets, steward-quick-log, pre-disciplinary-log, complaint-vs-grievance, bylaw-builder, proposal-tracker, rules-of-order, local-pack, resizer, alt-text, pulse-poll

Brand Kit remains a first-class setup destination, not a peer catalog card competing with makers.

### Learning classifications

Retain registry kinds: guide · playbook · course · workshop · library. Curated Learn collections stay; strengthen hierarchy over flat equivalence. Officer Learning = structured courses; steward playbooks = job playbooks; First-week plan = onboarding path; workshops = facilitator-led.

### Tool / learning separation opportunities

| Tool | Opportunity |
|------|-------------|
| rtw-accommodation | Keep worksheet UX; move long instructional blocks to Learn (human-rights / accommodation playbook) with contextual link |
| complaint-vs-grievance | Decision sheet stays; deeper grievance process education → `/learn/grievance-process` |
| grievance-form-builder | Builder focused; link grievance playbook |
| pre-disciplinary-log | Log focused; link progressive discipline / OL module |
| rules-of-order | Cheat sheet is reference-utility; already pairs with running-meetings guide |

### Reusable capability / consolidation opportunities

| Opportunity | Decision |
|-------------|----------|
| Letter / notice generation across topics | **Document; defer** full engine merge — letter-generator already topic-capable; do not force RTW/grievance into one form without safety review |
| Shared catalog explorer modes | **Implement** — create / utilities / learn / search |
| Product-area landing chrome | **Implement** shared patterns where Create/Utilities/Learn/Platform repeat |
| Brand status prompt | Strengthen reuse of `BrandSetupPrompt` / home readiness |

### Component changes

- `PUBLIC_PRIMARY_NAV` + active-state helpers
- `PublicCatalogExplorer` mode `utilities`
- New `/utilities` page + rewrite; `/platform` marketing page
- Home workflow steps (Brand Kit → Create & Utilities → Learn → Platform)
- Footer secondary set
- `comms-public-nav.mdc` + session-knowledge update at milestone end

### Route compatibility

| Concern | Approach |
|---------|----------|
| `/create/:utility-slug` bookmarks | Permanent redirect → `/utilities/:slug` |
| `/tools/:slug` | Continue redirect; utilities map to `/utilities/:slug` |
| Brand Kit `/create/brand-kit` | **Keep** (avoid second URL churn); nav treats it as Brand Kit, not Create child |
| `/start` | Keep; demote from primary nav |
| `/join` | Keep as access-request CTA from Platform |

### Brand Kit opportunities

- Home and Platform copy: “Set up your local once. Use UnionOps everywhere.”
- Do not invent competing config systems
- Surface readiness where tools already use `BrandSetupPrompt`

### Responsive / accessibility

- Preserve mobile drawer a11y (focus trap, Escape, Menu label)
- Five primary destinations: drawer before xl (existing pattern)
- No icon-only primary nav; maintain semantic headings on new Platform / Utilities landings

### Platform discoverability

- Always-visible **Platform** primary nav → `/platform`
- Explain Officer Hub vs Local Portal with repository-backed capabilities only
- CTA to `/join` / sign-in; do not invent pricing or roadmap

### Likely fit gaps (pre-implementation)

- Letter-generator topic presets vs separate tools
- Whether org-chart belongs in Create vs Utilities
- Whether pulse-poll should stay utilities-only when Hub-gated
- Depth of educational content inside RTW tool (needs page audit)
- French claim parity for all new copy

---

## Decision log

### D1 — Primary navigation model

**Finding:** Start + Brand Kit + Create + Learn mixed guided onboarding with product areas; Utilities buried inside Create; Platform absent from primary nav.

**Evidence:** `PUBLIC_PRIMARY_NAV` in `nav-config.ts`; Home three-step workflow; Hub gated via `OfficerHubNavLink`.

**Decision:** Primary nav = Brand Kit, Create, Utilities, Learn, Platform. Start demoted to guided-setup journey.

**Reasoning:** Matches user intents in the product model; reduces circular Start↔Home↔Create linking; makes hosted platform impossible to miss.

**Tradeoffs:** One more primary destination (five). Tablet continues to use drawer. Returning users who bookmarked mental model “Start” use Home CTA or `/start` URL.

**Status:** Implemented (nav + pages + catalog modes).

### D2 — Split Create and Utilities catalogs

**Finding:** `toolGroups` already had creation vs utility rows, but Create catalog showed every tool.

**Evidence:** `PublicCatalogExplorer` `mode === "create" && item.kind !== "tool"`; `toolGroups` in `nav-config.ts`.

**Decision:** Reclassify tools into Create vs Utilities groups; catalog modes filter by `toolSurface`; canonical utility URLs under `/utilities/:slug` with redirects from `/create/:slug` and `/tools/:slug`.

**Reasoning:** “What do you want to make?” vs “What do you need to get done?” must be navigable without filters.

**Tradeoffs:** Utility URL migration requires redirects/tests; Brand Kit stays at `/create/brand-kit` for compatibility.

**Status:** Implemented.

### D3 — Platform page

**Finding:** `/join` mixes access request with brief Hub/Portal blurbs; not in primary nav.

**Evidence:** `src/app/[locale]/join/page.tsx`; footer omits Join/Platform.

**Decision:** Add `/platform` explanation page; Join remains the invitation CTA; primary nav Platform → `/platform`.

**Reasoning:** Separates understanding the product from requesting access; presidents can evaluate without filling a form first.

**Tradeoffs:** Two related URLs (`/platform`, `/join`); keep copy factual to shipped Hub/Portal modules only.

**Status:** Implemented.

### D4 — First-week label

**Finding:** “First week” is historical onboarding jargon for the social/comms week-one plan.

**Evidence:** `nav.firstWeek` / `nav.socialMediaPlan`; URL `/learn/first-week`.

**Decision:** Visible EN/FR label → “First-week plan” / equivalent FR; URL unchanged.

**Reasoning:** Plain language; preserves bookmarks and sitemap.

**Tradeoffs:** Slight longer label in collections.

**Status:** Implemented.

### D5 — Letter-generator consolidation

**Finding:** Multiple topic tools could theoretically share email/letter generation.

**Evidence:** `letter-generator` tool; RTW and grievance tools produce different structured worksheets.

**Decision:** **Defer** merging into one generic communication engine. Prefer shared capability only where behaviour is genuinely shared.

**Reasoning:** Safety warnings, fields, and outputs differ by subject; forced merge risks policy/product errors.

**Tradeoffs:** Some duplicated chrome remains across tools.

**Status:** Future product decision.

### D6 — Tool/Learn separation (RTW + complaint diagnostic)

**Finding:** RTW embedded Meiorin/undue-hardship teaching before the worksheet; complaint tool already had OL links but used legacy “module” wording.

**Evidence:** `tools/rtw-accommodation/page.tsx`, `tools/complaint-vs-grievance/page.tsx`.

**Decision:** Keep task-critical primacy + privacy warnings inline; collapse optional legal diagrams into a disclosure; rename links to plain “Learn about…” and add grievance playbook links.

**Reasoning:** Utilities accomplish work; Learn teaches — bidirectional links without mini-courses blocking the form.

**Tradeoffs:** Diagrams remain in the tool for quick reference rather than a full content migration to Learn pages.

**Status:** Partially implemented (priority tools); broader steward-guide audit remains follow-up.

---

## Fit-gap register

| ID | Issue | Classification |
|----|-------|----------------|
| FG-01 | Create catalog mixed creative + operational tools | Resolved during refactor |
| FG-02 | Start competed in primary nav | Resolved during refactor |
| FG-03 | Hub/Portal easy to miss when logged out | Resolved during refactor (`/platform` + nav) |
| FG-04 | Home workflow omitted Utilities and Platform | Resolved during refactor |
| FG-05 | “First week” terminology | Partially resolved (label; deeper content rename deferred) |
| FG-06 | Mini-courses inside operational tools | Partially resolved (RTW disclosure + Learn links; other steward guides follow-up) |
| FG-07 | Letter/email generator consolidation | Future product decision |
| FG-08 | Flat Learn catalog after collections | Intentionally unchanged (observe before expanding — prior P2) |
| FG-09 | Brand Kit URL under `/create/` | Intentionally unchanged (compatibility) |
| FG-10 | Org-chart Create vs Utilities ambiguity | Intentionally unchanged (kept Create — roster/website artifact) |
| FG-11 | Cross-link circularity on catalog cards | Partially resolved via nav hierarchy; related links curated not removed |
| FG-12 | FR meaning parity for new Platform/Utilities copy | Track in implementation tests / copy-style guards |

---

## Implementation slices

1. Inventory + this document
2. Nav + routes + Create/Utilities split + Platform page + Home/Footer
3. Terminology + Brand Kit messaging + catalog hierarchy UX
4. Tool/Learn separation pass on priority tools
5. Shared product-area UI polish + verification (lint/unit/smoke) + PROGRESS / What's new
