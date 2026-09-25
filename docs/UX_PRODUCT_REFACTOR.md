# UnionOps product architecture & UX refactor

Living implementation record for the product-architecture, information-architecture, navigation, layout, interaction-pattern, and user-flow refactor.

**Objective:** Make UnionOps feel like one coherent system — Brand Kit as foundation, Create / Utilities / Learn as parallel destinations powered by that foundation, Platform as the shared hosted operational layer — without weakening auth, privacy, localization, or accessibility boundaries.

**Started:** 2026-09-24  
**Status:** Second pass implemented on PR #119 (parallel Home model, Comms getting started, letter topic engine, deeper Learn separation, circular-link cleanup).

**Brand Kit workspace pass:** [2026-09-24 Brand Kit workspace uplift](audit/plan-2026-09-24-brand-kit-workspace-uplift.md). The three equal desktop cards became a roomy identity editor with an adjacent live preview; local number appears in the first panel, and readiness distinguishes essentials from optional details. The route, stored kit, and canvas export contract remain the same.

**Officer Hub home pass:** [2026-09-25 task-first dashboard](audit/plan-2026-09-25-hub-task-dashboard.md). Authenticated work now starts with assigned tasks/check-ins or platform operations, then role-permitted next steps. Local setup and the full tools catalog are secondary; the Hub nav keeps global wayfinding. The casework and tenant authorization contracts remain unchanged.

---

## Second-pass critique of the first implementation

### Correct and keep

- **Primary nav destinations** Brand Kit · Create · Utilities · Learn · Platform (Start demoted).
- **Create vs Utilities catalog split** with `toolSurface` and `/utilities/:slug` redirects.
- **`/platform` page** as logged-out Hub/Portal explanation (separate from `/join` request form).
- **Brand Kit as foundational copy** (“Set up your local once…”).
- **Auth/privacy/persistence boundaries** left intact.

### Correct direction but incomplete

- **Home** introduced Platform and Utilities but modeled them as **steps 01–05**, implying a forced sequence through all five. Wrong product model.
- **Tool/Learn separation** only collapsed RTW teaching into `<details>`; Meiorin/undue-hardship content and complaint diagrams still live primarily in utilities. Pre-disciplinary was untouched.
- **Circular linking** reduced Start↔nav loops but Home, Platform, and Footer still re-advertise every primary destination.
- **“First-week plan”** was a light rename of jargon, not a product-concept rethink.

### Reconsider

- **Five-step numbered Home workflow** → Brand Kit foundation + **parallel** Create / Utilities / Learn + Platform as hosted layer (not step 5).
- **“First week” / “First-week plan”** → this content is **post–Brand Kit local communications setup** (boards → print → social → website). Visible concept: **Comms getting started**. Keep `/learn/first-week` URL; align page titles and Learn collection labels.
- **Letter-generation deferral (D5)** → repository evidence shows shared formal-letter behaviour (Brand Kit letterhead + body + DOCX) across steward topics, while worksheets keep domain-specific fields. **Implement** Letter Generator topic contexts/presets + handoff from utilities; do **not** merge RTW intake worksheets into one generic form.
- **Platform landing CTAs** back to Brand Kit/Create/Utilities/Learn → remove; Platform’s job is hosted products + join, not rediscovering the public toolkit.
- **Footer mirroring full primary nav** → keep secondary/trust links; drop redundant Brand Kit/Create/Utilities/Learn/Platform repeats (global nav already owns those).

### Fit-gaps that should now be implemented

| ID | Action |
|----|--------|
| FG-04 (revised) | Home parallel destinations, not five-step sequence |
| FG-05 | Retire “First week” visible terminology → Comms getting started |
| FG-06 | Deeper RTW/complaint/pre-disciplinary Learn separation |
| FG-07 | Letter Generator topic-engine consolidation |
| FG-11 | Strip circular Home/Platform/footer cross-links |

---

## Decision log

### D1 — Primary navigation model

**Decision:** Primary nav = Brand Kit, Create, Utilities, Learn, Platform. Start demoted to guided-setup journey.

**Status:** Implemented. **Kept on second pass.**

### D2 — Split Create and Utilities catalogs

**Decision:** Catalog modes filter by `toolSurface`; utility URLs under `/utilities/:slug`.

**Status:** Implemented. **Kept on second pass.**

### D3 — Platform page

**Decision:** `/platform` explains Hub + Portal; `/join` is access CTA.

**Status:** Implemented. **Second pass:** remove bottom toolkit CTA row that re-advertises Brand Kit/Create/Utilities/Learn (circular). Keep join/member-access paths only.

### D4 — First-week / Comms getting started *(revised)*

**Finding (first pass):** Light rename to “First-week plan” preserved historical jargon.

**Evidence:** `guide/social-media-plan` is a channel rollout playbook after Brand Kit (logo → boards → print → social → website), not a calendar “first week on the job.”

**Decision (second pass):** Visible product concept = **Comms getting started** (EN) / clear FR equivalent. Page H1, nav keys, Learn collection, and SEO titles aligned. URL `/learn/first-week` retained for bookmarks; optional alias `/learn/comms-getting-started` → same destination.

**Reasoning:** Officers understand “getting started with communications” without UnionOps history.

**Status:** Implementing second pass.

### D5 — Letter Generator topic-engine consolidation *(revised — implement)*

**Finding:** Formal letters share Brand Kit letterhead + salutation + body + DOCX/PPTX. Topic tools (RTW, complaint, pre-disciplinary) also emit **quick email/verbal scripts** for the meeting — different job from formal letters. Document Generator already owns worksheet packs (`grievance-intake`).

**Evidence:** `LETTER_PRESET_IDS` + `DocumentGeneratorEditor`; `buildRtwScripts` / `buildGrievanceDraftText` / `buildPreDisciplinaryScripts`; InviteEmailPanel for event invites.

**Decision (second pass):** Expand Letter Generator into a **shared formal-letter engine** with context presets (steward follow-up, accommodation/RTW, grievance notice, representation request, meeting follow-up) plus existing welcome/letterhead. Utilities keep worksheets and quick scripts; add **Open formal letter** handoff that seeds Letter Generator body/fields. Do not fold intake worksheets into Letter Generator.

**Reasoning:** Shared behaviour is real for formal output; domain worksheets stay specialized.

**Status:** Implementing second pass (supersedes deferral).

### D6 — Tool/Learn separation *(deepened)*

**Decision (second pass):** Utilities: task warnings, field help, scorecards needed to complete the task. Substantial teaching (Meiorin essay, undue-hardship lecture, discipline ladder courseware) → Learn links only; optional reference stays behind disclosure or is removed from default path. Pre-disciplinary gets the same treatment as RTW.

**Status:** Implementing second pass.

### D7 — Home product model *(new)*

**Finding:** Numbered 01–05 workflow implied users should complete every area in order.

**Decision:** Home presents (1) Brand Kit as foundation, (2) three **parallel** destinations Create / Utilities / Learn, (3) Platform as hosted layer for shared local operations. No forced five-step sequence. Guided setup remains secondary.

**Status:** Implementing second pass.

### D8 — Navigation layering *(new)*

**Decision:** Global nav = primary destinations. Contextual next actions = task-local. Related tools/learning = tool footers + catalog related (curated). Footer = Home + guided setup + trust/growth links — **not** a second primary nav.

**Status:** Implementing second pass.

---

## Fit-gap register

| ID | Issue | Classification |
|----|-------|----------------|
| FG-01 | Create catalog mixed creative + operational tools | Resolved |
| FG-02 | Start competed in primary nav | Resolved |
| FG-03 | Hub/Portal easy to miss when logged out | Resolved |
| FG-04 | Home implied forced multi-step sequence | **Resolved second pass** (parallel destinations) |
| FG-05 | “First week” terminology | **Resolved second pass** → Comms getting started |
| FG-06 | Mini-courses inside operational tools | **Resolved second pass** (RTW/complaint/pre-disciplinary) |
| FG-07 | Letter/email generator consolidation | **Resolved second pass** (formal letter contexts + handoff) |
| FG-08 | Flat Learn catalog after collections | Intentionally unchanged (observe) |
| FG-09 | Brand Kit URL under `/create/` | Intentionally unchanged |
| FG-10 | Org-chart Create vs Utilities | Intentionally unchanged |
| FG-11 | Cross-link circularity | **Resolved second pass** (Home/Platform/footer) |
| FG-12 | FR meaning parity | Ongoing via copy-style guards |

---

## First-pass plan snapshot (historical)

The sections below retain the original inventory hypothesis for agents reading audit history. Prefer the second-pass decisions above when they conflict.

### Product model (current)

```
Brand Kit     → foundation (configure once)
Create        → parallel: finished creative/comms artifacts
Utilities     → parallel: practical union work
Learn         → parallel: understanding / training / reference
Platform      → hosted Officer Hub + Local Portal (shared operations)
```

Secondary: Guided setup (`/start`), What's new, About, Support, Privacy, Security, Accessibility, Feedback, Install, Search.
