# Ordered enhancement and sprint plan

Created 2026-10-01 from the product audit at `1cd62917`. Implementation is underway; current completion and verification evidence is tracked in [12_IMPLEMENTATION_LOG.md](12_IMPLEMENTATION_LOG.md).

This is the execution order for the [refactor recommendations](08_REFACTOR_PLAN.md). That document retains the current implementation, source evidence, risks and rationale for R00–R12. This document divides them into separately reviewable enhancements and sprint completion gates. The [preservation register](09_DO_NOT_CHANGE.md) applies to every enhancement.

## How to follow the plan

1. Start with Sprint 0. Work through enhancements in their listed order; do not start a dependent enhancement until its prerequisite is complete.
2. Before each enhancement, compare the audit against current code and the existing QOL/launch trackers. Record **SKIP** (already satisfied), **NARROW**, **REALIGN**, or **FULL**. SKIP requires evidence; it is not an unverified checkbox.
3. Use one bounded change/PR per enhancement where practical. Split a large migration by consumer family, preserving the enhancement ID with child IDs. Avoid one sprint-sized PR.
4. Retain existing styling during this program. Changes to navigation composition, control semantics and state handling are authorized structural proposals; colours, typography and visual identity remain a separate project.
5. Close each enhancement with changed consumers, tests/evidence, preserved exceptions, remaining limitations and a rollback approach. Complete the sprint gate before advancing.
6. Keep a blocked enhancement pending. Work on independent preparation if useful, but do not silently skip its dependency or describe unrun checks as passing.

Sprints are ordered delivery batches, not promised calendar durations. Team capacity and runtime baseline results should determine their timeboxes. If a sprint is too large, split it into consecutive A/B batches without reversing dependencies.

## Sprint roadmap

| Order | Sprint | Enhancements | Result / exit gate |
|---|---|---|---|
| 0 | Baseline and contracts | ENH-01–03 | Known current state, agreed shell/action/state rules, explicit migration ledger |
| 1 | Accessible interaction foundations | ENH-04–06 | Reliable dialog, tab and navigation-control behaviour |
| 2 | Shells and page structure | ENH-07–09 | Contextual chrome, one frame/main owner, shared measured sticky offsets |
| 3 | Forms and read/action feedback | ENH-10–12 | Associated field errors and distinct loading/empty/refresh/outcome states |
| 4 | Public editors and local results | ENH-13–16 | Truthful downloads, shared output controls, clear local save/reset and conditional guidance |
| 5 | Hosted export interactions | ENH-17–19 | Consistent challenge/resume and download outcomes without changing server security |
| 6 | Workspace recovery and continuity | ENH-20–23 | Safe hosted handoff, contextual navigation restoration, domain-specific mutation recovery |
| 7 | Bounded adoption and uplift handoff | ENH-24–26 | Remaining compatible consumers accounted for; integrated journeys checked; handoff updated |
| 8, optional | Proven maintenance cleanup | ENH-27–29 | Remove verified duplication only where it has maintenance value |
| Separate project | Visual/design-system uplift | V01–V02 in the original plan | Design against the completed structural contracts; not part of this implementation program |

The required path is **Sprint 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7**. Sprint 8 does not block uplift. Visual exploration can begin earlier using stable contracts, but final designs must not assume incomplete behaviours are implemented.

## Sprint 0 — baseline and contracts

**Purpose:** prevent a consistency refactor from rebuilding shipped work or erasing useful variation. No production changes are needed in this sprint.

### ENH-01 — establish current-state and journey baselines

- **References:** R00; all audit findings.
- **Prerequisites:** none.
- **Changes:** recheck source revision, working changes, dependencies and existing tests. Record representative journeys from the audit using synthetic data: public discovery, Brand Kit, Flyer/Resizer, Office/website, guide/Officer Learning, RSVP/MFA, Hub home/casework, Data, Circle and hosted export/account support.
- **Deliverable:** a dated baseline matrix covering route, role/module/tenant context, persistence, outputs, desktop/mobile behaviour, keyboard order and failure recovery. Record runtime checks that cannot yet be performed.
- **Done when:** source-confirmed findings are distinguished from reproduced behaviour and untested hypotheses. No real member data or production changes are needed to obtain the baseline.
- **Size/risk:** medium / low; environment availability may block runtime evidence.

### ENH-02 — settle the shell, action and state contracts

- **References:** R01, R02, R06, R08; target model in document 05.
- **Prerequisites:** ENH-01.
- **Changes:** record the exact route-to-shell mapping; what remains in public, public-task and operational chrome; notice summary/detail rules; main/frame and sticky-offset ownership. Define tab vs link vs value-choice behaviour. Define device save, hosted save, publication, download/handoff, copy, send, reset, failure and uncertain outcome meanings.
- **Deliverable:** concise implementation contracts with annotated structure diagrams or wireframes using existing styles. Explicitly resolve authenticated public-tool visits, login/MFA screens, member Portal-off states and operator navigation.
- **Done when:** implementers can identify which layer owns each navigation region, landmark, action and message. Preserve essential controls/notices; no open decision about removing a capability is disguised as a styling task.
- **Size/risk:** medium / medium; shell decisions affect later work broadly.

### ENH-03 — create the consumer and validation ledger

- **References:** R00 and R12 migration discipline.
- **Prerequisites:** ENH-02.
- **Changes:** enumerate consumers of the affected shells, tabs/dialogs, fields, output helpers, state components and challenge flows. Assign each to **pilot**, **migrate**, **preserve exception**, **already compliant**, or **defer with reason**. Map existing tests to each pilot.
- **Deliverable:** finite adoption checklist used by ENH-24. Every entry has a component/path, owner enhancement, target contract and evidence requirement.
- **Done when:** “migrate remaining pages” has a bounded meaning. Distinct Office, website, canvas and worksheet renderers have explicit exceptions; authorization/persistence changes are excluded.
- **Size/risk:** small / low.

**Sprint 0 gate:** contracts and ledger exist; baseline limitations are explicit. Do not substitute source inspection for pending browser evidence required to accept a later UI change.

## Sprint 1 — accessible interaction foundations

**Purpose:** make shared controls safe to reuse before reorganizing their consumers. Depends on Sprint 0.

### ENH-04 — complete the modal interaction contract

- **References:** R06 / F06.
- **Changes:** extend existing Dialog with focus containment, controlled background interaction, appropriate scroll locking and focus restoration. Preserve Escape/close semantics and translated names. Pilot ConsentModal and the existing RouteStatusPanel dialog.
- **Scope:** `Dialog`, `ConsentModal`, existing dialog callers; no new modal product flow and no automatic conversion of native confirmations.
- **Done when:** keyboard focus stays inside an open modal, background controls cannot activate, closing restores a valid invoking target, and consent content/requirements remain intact. Test long content and viewport/zoom changes.
- **Size/risk:** medium / medium-high; focus and overlay behaviour are the risk.

### ENH-05 — establish shared tab behaviour

- **References:** R06 / F06.
- **Prerequisites:** ENH-04; shell contract from ENH-02, not completed shell implementation.
- **Changes:** introduce or compose linked tab/panel IDs, roving focus and arrow/Home/End behaviour. Pilot ToolEditorLayout, then Data and Circle tabs. Keep SegControl as a value-selection radiogroup; preserve Circle shortcuts without intercepting form typing.
- **Scope:** ToolEditorLayout, DataWorkbench and CircleWorkspace navigation behaviour.
- **Done when:** keyboard/focus/panel relationships are correct; unavailable tabs fall back safely; canvas stays capturable across Edit/Preview/collapsed-mini states. Do not unmount drafts or capture roots merely to hide a panel.
- **Size/risk:** medium / high for editor mounting and state retention.

### ENH-06 — fix navigation-control semantics in pilot surfaces

- **References:** R06 / F06.
- **Prerequisites:** ENH-05.
- **Changes:** replace confirmed Link-wrapped-Button combinations in the grievance pilot with existing ButtonLink semantics. Resolve equivalent defects in the ENH-03 pilot list, without a repository-wide style sweep.
- **Done when:** each action is one interactive element with a clear accessible name; navigation preserves locale, destination and expected browser link behaviour.
- **Size/risk:** small / low.

**Sprint 1 gate:** targeted component tests and manual keyboard checks pass. Record screen-reader assessment status accurately. Recheck these controls within the completed shell in Sprint 2; component success alone does not prove integration.

## Sprint 2 — shells and page structure

**Purpose:** remove competing structural ownership while keeping public and operational experiences distinct. Depends on Sprint 1.

### ENH-07 — implement contextual chrome composition

- **References:** R01 / F01.
- **Changes:** implement the agreed public/task/operational shell modes. Keep shared providers stable; retain product escape, locale, display preferences, account/security access, correct Hub/Portal/operator menus and active scope. Apply the agreed notice summary/detail policy without hiding demo/memory limitations.
- **Scope:** localized layout, Header/Footer, Hub/Portal layout/nav/banner composition. Pilot public Flyer, Hub home/grievance and Portal Circle before expanding the route mapping.
- **Done when:** each context has the intended navigation once; anonymous/officer/member/operator states render correctly; no provider remount loses drafts; current security gates and public destinations remain unchanged.
- **Size/risk:** large / high. Split into mapping/composition and route-family adoption changes if needed.

### ENH-08 — centralize measured sticky offsets

- **References:** R01 / F01.
- **Prerequisites:** ENH-07.
- **Changes:** make shell-owned measured offsets available to sticky editor previews, Circle tabs and reading rails. Replace incompatible fixed assumptions only for the audited consumers. Account for visible notices and text scaling.
- **Done when:** controls, anchor targets and focus are not obscured across shell modes, expanded notices, 320/390/768/1024/1280+ widths and enlarged text/zoom. Verify installed/mobile behaviour where applicable; do not change exported canvas geometry.
- **Size/risk:** medium / medium-high.

### ENH-09 — normalize frame and workspace-header ownership

- **References:** R02 / F02.
- **Prerequisites:** ENH-08.
- **Changes:** remove Data's second main/padded shell, including its unavailable-state branch. Compose a task header with title, scope/status, return and action slots; pilot Data and PollsBoard. Preserve PortalPanel's domain identity rather than replacing it wholesale.
- **Done when:** one main and one outer frame own the page; titles and allowed actions remain understandable in pending/empty/error states; wide tables scroll within their region. Header contains no fetching or authorization policy.
- **Size/risk:** medium / medium.

**Sprint 2 gate:** cross-context navigation, notices, landmarks, focus and sticky behaviour pass the pilot matrix. Existing palette/typefaces and output dimensions remain unchanged. If shell integration breaks Sprint 1 semantics, fix it before continuing.

## Sprint 3 — forms and read/action feedback

**Purpose:** create dependable field and outcome semantics before migrating output/challenge flows. Depends on Sprint 2.

### ENH-10 — consolidate field feedback

- **References:** R11 / F11.
- **Changes:** extend existing Input/Textarea/Select composition with stable label/hint/error associations and invalid state. Fix Data's placeholder-only custom-field control; pilot a compatible Circle/admin form.
- **Done when:** field purpose/error is available without colour or placeholder inference; failed submission retains inputs and identifies the relevant field; IDs remain unique; EN/FR meanings agree. Preserve native input types and domain validation.
- **Size/risk:** medium / medium.

### ENH-11 — distinguish initial loading, empty and read failure

- **References:** R05 / F05.
- **Prerequisites:** ENH-10.
- **Changes:** compose existing Skeleton/EmptyState/Portal loading/retry foundations into explicit read-state handling. Pilot Data initial loading and GrievanceDetail's absent-data branch. Keep locked hybrid, module-disabled and denied/not-found distinctions governed by domain policy.
- **Done when:** slow loading never claims no records; initial failure has appropriate recovery; unauthorized vs nonexistent data does not leak protected existence; localized fallback text is used, including Circle Suspense loading.
- **Size/risk:** medium / medium-high for protected-record states.

### ENH-12 — separate refresh and action feedback

- **References:** R05 / F05.
- **Prerequisites:** ENH-11.
- **Changes:** split Data's success/error message channel; add scoped busy/success/error/uncertain presentation. Make Circle background network failures recoverable without unnecessarily replacing authorized loaded work. Use one board as the second consumer.
- **Done when:** status is attached to the relevant action; no automatic POST/PATCH retries; draft state survives recoverable failure. Scope changes and authorization loss invalidate protected content; retained stale data is never treated as fresh authority.
- **Size/risk:** medium-large / high for scope invalidation. Challenge-specific adapters follow in Sprint 5, not in this enhancement.

**Sprint 3 gate:** slow/empty/failed/refresh/permission-change cases are exercised on pilots. Reusable feedback presentation exists without a new global fetching framework. Domain-specific mutation and handoff reconciliation remains scheduled in Sprint 6.

## Sprint 4 — public editors and local results

**Purpose:** make existing creation tools behave consistently without merging their renderers or outputs. Depends on Sprint 3.

### ENH-13 — report native sharing and file handoff truthfully

- **References:** R03 / F03, R08.
- **Changes:** distinguish cancelled native sharing from handed-off/initiated file delivery in save-blob and the export helper chain. Propagate outcomes to useExportHandler. Inventory indirect consumers before changing the shared return contract.
- **Done when:** cancellation does not display Downloaded or trigger a second save; exceptions reach failure feedback; browser fallback does not claim verified disk persistence. Preserve MIME handling, iOS behaviour and installed-app protections.
- **Size/risk:** medium / high because the helper has many consumers. Pilot one PNG and one non-image output before adopting all affected callers.

### ENH-14 — share editor output definitions and status ownership

- **References:** R03 / F03.
- **Prerequisites:** ENH-13.
- **Changes:** extend ToolExportActions for caller-selected primary format and compatible action sets. Migrate Flyer, Graphic Maker and Resizer; remove Resizer's duplicate error rendering. Preserve both form and mobile preview action locations.
- **Done when:** both locations have identical labels/eligibility/busy behaviour; one outcome is announced; every existing output format and filename remains available. Office's existing shared action renderer remains a specialized adapter.
- **Size/risk:** medium / medium. Verify output dimensions, QR/logo content and preview/file fidelity.

### ENH-15 — clarify device saving and reset consequences

- **References:** R08 / F08.
- **Prerequisites:** ENH-14.
- **Changes:** apply the agreed persistence language to Brand Kit, a persisted worksheet, generator draft and canvas reset pilots. Verify each reset's actual Undo behaviour and exact affected state before choosing confirmation or recovery.
- **Done when:** local vs temporary vs hosted state is clear; blocked storage is never called saved; reset preserves unrelated identity/hosted records; no new compulsory Save step is added to deliberate autosave.
- **Size/risk:** medium / medium. Read both locale values and test refresh/storage failure.

### ENH-16 — reduce repeated setup and task explanation

- **References:** R07 / F07.
- **Prerequisites:** ENH-15.
- **Changes:** condition BrandSetupPrompt on hydrated readiness; retain quiet access to Brand Kit when established. Remove genuinely duplicate task-entry explanation, using the header/help contract. Keep tool-specific, consent, source and workshop guidance.
- **Done when:** new/configured/storage-blocked/demo/deep-link users see relevant guidance; no hydration flash falsely declares setup incomplete; controls and help remain reachable.
- **Size/risk:** small-medium / low-medium.

**Sprint 4 gate:** creator journeys succeed in EN/FR across desktop/mobile panes; cancellation, failure, retained draft and reset behaviours are verified. Run relevant layout, output smoke and export-fidelity coverage; do not infer file quality from a rendered page alone.

## Sprint 5 — hosted export interactions

**Purpose:** reuse compatible client behaviour while preserving each server's authority and audit ordering. Depends on Sprint 4.

### ENH-17 — extract a bounded challenge presentation contract

- **References:** R04 / F04.
- **Changes:** compose the existing MFA field and Sprint 3 feedback into an action challenge showing operation/target, code input, submit/cancel and failed/limited/unavailable states. Freeze pending arguments; clear code state on end/cancel/scope change.
- **Scope:** Poll and RSVP export client contracts first. Read each current endpoint/session note. Do not alter enrollment, grants, verifier, replay/attempt storage or API policy.
- **Done when:** challenge cannot silently change target or format; no code persists or authorizes a different action; callers retain domain-specific error mapping and consequence copy.
- **Size/risk:** medium / high.

### ENH-18 — migrate Poll and RSVP downloads

- **References:** R04 / F04.
- **Prerequisites:** ENH-17 and ENH-13 save-result contract.
- **Changes:** use a shared compatible download/request outcome mechanism for PollsBoard and MeetingEventsBoard, retaining endpoint/payload/format adapters and current inline challenge locations.
- **Done when:** 428/invalid/limited/unavailable/audit/network/cancel/success cases preserve pending operation; delivery is awaited and outcome is truthful; no auto-retry. Existing server scope, fresh MFA and audit tests still pass.
- **Size/risk:** medium / high. This is the extraction proof before sibling rollout.

### ENH-19 — migrate the remaining compatible hosted exports

- **References:** R04 / F04.
- **Prerequisites:** ENH-18.
- **Changes:** migrate Expenses, Travel and Time report exports in separate consumer changes; fix premature expense success. Assess payroll separately: share presentation only if its webhook/delivery semantics differ from file export.
- **Done when:** each consumer's original filter/record/format, permission, POST and audit contracts are preserved; no broad “generic export” policy replaces them. Record any incompatible consumer as an explicit exception with its truthful outcomes.
- **Size/risk:** large / high; split by domain, never combine all sensitive surfaces in one PR.

**Sprint 5 gate:** pilots and migrated peers pass their API and browser matrices, including tenant change and challenge cancellation. No MFA/backend security redesign or automatic retry has entered the abstraction.

## Sprint 6 — workspace recovery and continuity

**Purpose:** apply stable behaviours to consequential work without introducing new workflow features. Depends on Sprint 5.

### ENH-20 — make explicit public-to-Hub transfer recoverable

- **References:** R05 / F05, R08.
- **Changes:** handle rejected network promises and reliably leave busy state in HubDraftSyncPanel. Track what is known about sequential informal-log writes. Distinguish confirmed completion, known partial completion and uncertain result; preserve local source drafts.
- **Done when:** partial/uncertain transfer cannot prompt blind resubmission of the whole batch. Offer review/reconciliation with existing Hub records. If safe identification is unavailable, report uncertainty and stop; separately scope any necessary backend idempotency work rather than invent it inside this refactor.
- **Size/risk:** medium / high for duplicates and accidental disclosure. No automatic background synchronization.

### ENH-21 — align Data and selected admin mutation feedback

- **References:** R04/R05 / F04/F05.
- **Prerequisites:** ENH-20; Sprint 5 presentation contract.
- **Changes:** adapt Data publication and one account-support action to shared field/challenge/feedback presentation only. Preserve each pending decision, domain response code and post-write uncertainty rule. Expand to other administrative actions only after their policy review.
- **Done when:** success, failed verification, audit unavailability and uncertain writes have different safe next actions. An uncertain publication/authority change requires reconciliation/reload as appropriate; no generic Retry causes another consequential write.
- **Size/risk:** large / high; split Data and administration into separate PRs. No domain transaction or authorization consolidation.

### ENH-22 — preserve safe workspace navigation context

- **References:** R10 / F10.
- **Prerequisites:** ENH-21; earlier tab and scope-invalidation contracts.
- **Changes:** implement explicit URL/ephemeral/local-state rules for Data tab/import/page and Circle tab changes; preserve Dispatch deep links. Add list/detail return context only for audited journeys that currently lose it.
- **Done when:** reload, direct link, Back/Forward, locale and local switch behave predictably; restored IDs are reauthorized; no raw member information, draft text or MFA code enters URLs. Hidden/invalid tabs fall back safely.
- **Size/risk:** medium / medium-high. No favourites, recents or new global navigation system.

### ENH-23 — complete operational header/help/state adoption in pilots

- **References:** R02/R05/R07 / F02/F05/F07.
- **Prerequisites:** ENH-22.
- **Changes:** align the chosen case detail, operational board and Circle workspace with title/scope/action ordering and contextual help. Preserve domain sections, collaboration names, permission explanations and existing record lifecycle.
- **Done when:** a user can identify current scope, next valid action and outcome without repeated product explanation; empty/error/locked/read-only states remain distinct. Do not turn every domain section into a new route or card.
- **Size/risk:** medium / medium.

**Sprint 6 gate:** existing work can be resumed or safely reconciled across network failures, scope changes and authentication interruptions. Any unresolved backend requirement is explicitly separated from presentation completion and remains a blocker to claiming the dependent enhancement complete.

## Sprint 7 — bounded adoption and uplift handoff

**Purpose:** avoid stopping at good pilots while leaving two competing conventions indefinitely. Depends on Sprint 6.

### ENH-24 — complete the compatible-consumer migration ledger

- **References:** R01–R08, R10–R11.
- **Changes:** work through the finite ENH-03 ledger by family: public editor actions/help, Hub board/header/state consumers, Portal consumers, then compatible administrative fields/challenges. Each migration uses the established contract; do not introduce new abstractions during rollout without revisiting the contract.
- **Done when:** every listed consumer is migrated, already compliant or a documented justified exception. Deferred items identify concrete remaining behaviour and whether they block the relevant uplift design. Remove superseded paths only after their last consumer moves.
- **Size/risk:** variable / medium-high. Split into consecutive batches if the actual ledger exceeds sprint capacity; no blanket codemod over domains.

### ENH-25 — verify the integrated product journeys

- **References:** R00; original verification policy and handoff matrix.
- **Prerequisites:** ENH-24.
- **Changes:** run the baseline journeys end to end using synthetic fixtures and current EN/FR content. Cover public/task/Hub/Portal/operator contexts, mobile/desktop, keyboard/zoom, local storage failure, downloads, challenge/recovery, disabled modules and unauthorized scopes.
- **Done when:** required lint/typecheck/unit/smoke and applicable export/domain tests pass; failures are resolved or explicitly prevent completion. Human usability and assistive-technology observations are recorded separately from automation. No production readiness claim is inferred.
- **Size/risk:** medium-large / medium; this is integration validation, not another feature sprint.

### ENH-26 — publish the structural handoff and close the program

- **References:** document 10 and preservation register.
- **Prerequisites:** ENH-25.
- **Changes:** update the target/component/handoff documents to describe what actually shipped, adopted consumers and remaining exceptions. Update PROGRESS and applicable module/session notes. Product-facing changes need appropriate EN/FR What's new entries in their implementing changes, not a retrospective claim that all behaviours shipped together.
- **Done when:** designers can identify actual archetypes, shell modes, interaction contracts and permitted variation without relying on unimplemented proposals. List any unassessed human/host evidence and deferred domain work.
- **Size/risk:** small / low.

**Sprint 7 gate:** structural program complete only when required behaviours and checks are complete. The visual uplift can now proceed against the stable implementation; it must not absorb unresolved security, persistence or workflow decisions as “design details.”

## Sprint 8 — optional maintenance cleanup

Run only where current evidence shows benefit. These enhancements do not block visual uplift and may be skipped with a reason.

### ENH-27 — reconcile duplicate relationship metadata

- **References:** R09 / F09. **Prerequisites:** Sprint 7.
- **Changes:** reconcile related-tool/catalog relationships only where they express the same relationship; retain curated exceptions. Add targeted canonical-target/visibility checks if gaps remain.
- **Done when:** canonical and legacy URLs, EN/FR, query/hash and disabled-tool filtering remain intact. No route rename or registry rewrite solely for tidiness.
- **Size/risk:** small / low-medium.

### ENH-28 — extract repeated drawer mechanics

- **References:** R12 / F12. **Prerequisites:** ENH-27 or recorded skip; shell and modal behaviour already stable.
- **Changes:** share proven focus/body-lock/cleanup mechanics across public, Hub and Portal drawers if duplication remains after Sprint 2. Keep their menus and allowed-link computation separate.
- **Done when:** focus/scroll restoration and allowed navigation are identical to the accepted baseline; no coupling of tenant permissions to the shared overlay helper.
- **Size/risk:** medium / medium.

### ENH-29 — decompose remaining large domain components selectively

- **References:** R12 / F12. **Prerequisites:** ENH-28 or recorded skip.
- **Changes:** extract existing domain sections in CircleWorkspace, GrievanceDetail or DataWorkbench only where repeated edits demonstrate maintenance value. Preserve state lifetimes, fetch behaviour and authorization ownership.
- **Done when:** no draft/selection resets, extra requests or permission changes; no generic CRUD engine or new route structure. A file's size alone is insufficient justification.
- **Size/risk:** variable / medium-high; choose one domain per change.

## Definition of done for every enhancement

- Current-state verdict recorded; enhancement scope and original R/F references retained.
- Existing capability, output, canonical/legacy URL, tenant boundary and storage semantics preserved unless an explicit separately reviewed requirement changes them.
- Relevant automated tests pass; required repository checks run for the size/type of change. Add behaviour tests for actual failure risks, not tests that merely mirror markup.
- EN/FR copy reviewed for meaning; keyboard/mobile/zoom checks appropriate to the changed interaction recorded.
- No uncertain hosted mutation presented as safe for automatic retry. No code/token/PII added to URLs or logs.
- Consumer ledger and evidence updated; required PROGRESS/module/What's new notes included.
- Rollback is a bounded revert of the consumer/enhancement, preserving stored data and route compatibility. Do not “roll back” by deleting user drafts or records.

## Dependency clarifications

The original R packets contain contract-level dependencies as well as implementation dependencies. This sprint sequence separates them to prevent circular scheduling:

- R06 needs R01's **agreed shell/focus contract** in Sprint 0; full shell rollout follows the control work in Sprint 2.
- General R05 feedback/read states are built in Sprint 3; challenge-specific and uncertain-mutation adapters follow R04 in Sprints 5–6.
- R11 field semantics are complete before hosted challenge migration.
- R03 save-result propagation is complete before R04 starts reporting file delivery outcomes.
- R10 restoration follows scope invalidation and mutation-outcome contracts; it never introduces a new permission source.

## Traceability to the original recommendations

| Original packet | Ordered enhancements |
|---|---|
| R00 baseline | 01, 03, 25, 26 |
| R01 contextual shell | 02, 07, 08, 24 |
| R02 frame/header | 02, 09, 23, 24 |
| R03 local outputs | 13, 14, 24 |
| R04 hosted challenge/output | 17, 18, 19, 21, 24 |
| R05 state/recovery | 11, 12, 20, 21, 23, 24 |
| R06 controls | 02, 04, 05, 06, 24 |
| R07 guidance | 16, 23, 24 |
| R08 action meaning | 02, 15, 20 |
| R09 metadata hygiene | 27, optional |
| R10 navigation continuity | 22 |
| R11 fields | 10, 24 |
| R12 decomposition | Minimal extraction within owning enhancement; 28–29 optional |
| V01/V02 visual uplift | Separate project after applicable structural gates |

## Execution tracker

All entries start **Planned**. Allowed statuses: Planned, In progress, Blocked, Verified, or Skipped with evidence. Record a commit/PR and validation reference when moving to Verified; document unresolved limitations rather than marking them complete.

| Sprint | Status | Completion evidence |
|---|---|---|
| 0 — Baseline/contracts | Planned | — |
| 1 — Accessible foundations | Planned | — |
| 2 — Shells/structure | Planned | — |
| 3 — Forms/states | Planned | — |
| 4 — Public editors | Planned | — |
| 5 — Hosted exports | Planned | — |
| 6 — Workspace continuity | Planned | — |
| 7 — Adoption/handoff | Planned | — |
| 8 — Optional cleanup | Optional, not scheduled | — |

**First implementation task:** ENH-01. Its output determines the current baseline; it does not authorize skipping straight to a visual redesign or broad shell rewrite.
