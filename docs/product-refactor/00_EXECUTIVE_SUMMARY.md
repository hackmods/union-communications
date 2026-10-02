# UnionOps product-structure and interaction audit

**Current integration note (2026-10-01):** This audit is historical. See [13 — recovered uplift baseline](13_UPLIFT_BASELINE.md) for what is actually integrated and verified. Neither this audit nor the source-worktree pilots prove the entire refactor completed.

Audit date: 2026-09-30. Source baseline: `1cd62917`. Documentation only; no production implementation or visual redesign.

## Verdict

UnionOps does not need fewer capabilities or one universal page template. It needs clearer ownership of its shells, actions, state transitions, and shared interaction behaviours. The application already contains much of the right infrastructure. Consolidation should extend that infrastructure rather than replace it.

The smallest useful model found in this audit is **seven page archetypes**: orientation, discovery, reading/learning, focused task, editor, operational workspace, and configuration/administration. These are behavioural contracts, not seven compulsory layouts. A hosted workspace and a public worksheet can share form controls without sharing persistence, authorization, or navigation.

The most consequential entropy is at the seams:

1. **Operational shell layering.** Every localized surface receives the public header/footer; Hub and Portal add their own navigation. Hub home compresses operational notices, but deeper Hub pages expand them. Tool and Circle sticky offsets also contain independent assumptions about that stack.
2. **Action and outcome drift.** A shared export hook and action row exist, but several editors repeat their own button rows. Resizer renders export errors both in the editor shell and within its form. Native-share cancellation resolves like success, allowing a misleading download message. Hosted boards separately implement nearly identical challenge-and-resume download flows, with observable differences in awaiting download completion and classifying errors.
3. **Uneven state handling.** Portal has reusable loading/retry components; grievance list distinguishes locked/error/empty; other surfaces mix load failures, successful actions, and empty collections. Data Workbench uses one status message for both failure and success and initially represents unloaded datasets as an empty array.
4. **Incomplete behavioural primitives.** The shared modal handles initial focus, Escape, and focus return but contains no focus containment or background inertness. Tabs in editors, Data, and Circles implement different subsets of tab behaviour. These are interaction issues to resolve before styling them anew.
5. **Unclear composition ownership.** PageShell and composition presets exist, yet Data Workbench supplies a second padded frame and a nested `main` inside the localized `main`. Page headers and action locations are still assembled independently in many boards.

These findings are source-confirmed. Their frequency of user harm has not been measured. [The evidence inventory](03_INTERACTION_PATTERN_INVENTORY.md) and [entropy register](04_DUPLICATION_AND_ENTROPY.md) distinguish implementation facts from UX inferences.

## What is already coherent

- Public catalog search, filters, breadcrumbs, canonical URLs, and localized links already share infrastructure. `/utilities` is visibly **Worksheets**, not “Utilities.” Start is Guided setup, not a current primary-nav item.
- Canvas Core and ToolEditorLayout already provide a substantial editor foundation. Canvas capture geometry must survive any shell work.
- Letter Generator and Document Generator already share `DocumentGeneratorEditor`; their separate task entry points are not duplicate engines.
- Guide presets distinguish short reading, playbooks, and indexes. Officer Learning adds real progress and assessment behaviour, so it should remain a specialized reading experience.
- Hub discovery accounts for role, module, tenant, and MFA states. Portal has its own collaboration vocabulary and member-safe views. Neither should be flattened into the public catalog.
- Public-to-Hub draft transfer and Brand Kit baseline application are explicit. They must not become automatic synchronization.

## Recommended sequence

**Foundational:** settle shell/frame ownership, action/state vocabulary, and accessibility behaviour. Pilot those contracts without changing colours, typefaces, or visual identity.

**High-value consolidation:** reuse output actions, challenge presentation, field feedback, retry states, and scoped workspace headers; make task help conditional; preserve safe navigation context. Migrate by representative journey, not directory-wide replacement.

**Optional cleanup:** extract repeated drawer mechanics, decompose large workspaces at domain boundaries, and reconcile related-resource metadata only where the relationship is genuinely the same.

**Defer to UI uplift:** visual hierarchy, token naming/values, typography, spacing scale, surface treatment, and responsive visual tuning against the agreed contracts.

**Do not change:** feature scope, tenant boundaries, security gates, output formats, legacy links, explicit storage choices, Portal naming, or established learning and casework semantics.

The detailed [refactor plan](08_REFACTOR_PLAN.md) assigns evidence, affected code, dependencies, risk, UX benefit, and acceptance criteria to every substantial recommendation. It is a proposed implementation backlog, not authorization to execute it.

## Scope and confidence

The route census found 195 `page.tsx` implementation files: 30 tools, 30 guides, 60 other Hub, 24 Site Admin, 8 Portal, and 43 other public/root pages. Dynamic routes, redirects, and rewrites mean this is **not** a count of unique public URLs or capabilities. Shared components, handlers, state hooks, configuration, representative APIs, locale values, and existing tests were inspected. Ten representative journeys were traced in source in [01](01_CURRENT_PRODUCT_MODEL.md).

No application server or browser session was exercised. Dependencies were absent in this checkout. No lint, application tests, screenshots, assistive-technology assessment, production verification, or usability study is claimed. Documentation integrity checks are recorded in the handoff. Source establishes the structural findings; overlap at specific widths, real task effort, and comprehension remain validation work.

This audit accounts for the existing [September 30 QOL program](../audit/plan-2026-09-30-sitewide-qol-launch-program.md). It does not reopen shipped Data records/impact work, the Hub home uplift, or integrated Managed Documents. Human launch/readiness gates remain in their existing trackers.

## Reading map

For sequential implementation, start with [11 — Ordered enhancement and sprint plan](11_SPRINT_EXECUTION_PLAN.md). It defines individual enhancements, prerequisites, sprint exit gates and a completion tracker. All implementation work remains planned.

| Document | Decision it supports |
|---|---|
| [01 Current product model](01_CURRENT_PRODUCT_MODEL.md) | What exists, where it lives, and how journeys cross boundaries |
| [02 Page archetypes](02_PAGE_ARCHETYPES.md) | Seven reusable behavioural contracts and justified exceptions |
| [03 Interaction inventory](03_INTERACTION_PATTERN_INVENTORY.md) | Actual mechanisms, shared foundations, and source anchors |
| [04 Duplication and entropy](04_DUPLICATION_AND_ENTROPY.md) | Which variation warrants action and which does not |
| [05 Target model](05_TARGET_PRODUCT_MODEL.md) | Shells, workspace types, context, and result semantics |
| [06 Component consolidation](06_COMPONENT_CONSOLIDATION.md) | What to retain, extend, compose, or leave domain-specific |
| [07 Routes and navigation](07_ROUTE_AND_NAVIGATION_FINDINGS.md) | Canonical navigation, coverage, and safe transition rules |
| [08 Refactor plan](08_REFACTOR_PLAN.md) | Staged, bounded implementation proposals |
| [09 Do not change](09_DO_NOT_CHANGE.md) | Explicit preservation contract |
| [10 UI uplift handoff](10_UI_UPLIFT_HANDOFF.md) | Stable structure and remaining design freedom |
