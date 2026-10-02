# Recovered baseline for UI uplift

Updated 2026-10-01. This is the current integration record. Documents 00–11 preserve the original audit and proposed contracts; document 12 records experiments in the source worktree, not the contents of this branch.

## Provenance and decision

The requested refactor documents were absent from remote main. They existed only in local worktree `764b`, based on `1cd62917`, alongside uncommitted pilots. On 2026-10-01 Ryan authorized repairing the branch and setup needed to proceed. The uplift branch `feat/ui-uplift` starts from `8be3584f` and carries a copy of the audit plus selected foundations. The original worktree is untouched.

Do not call the entire eight-sprint program complete. The audit itself permits visual work after affected contracts and representative pilots are settled; it does not require every sibling or domain migration first. The seven archetypes and preservation register remain the design constraint. No new product architecture is introduced here.

## Integrated foundations

| Area | Current branch | Boundary |
|---|---|---|
| Contextual public navigation | Header and MobileNavDrawer use public, task, Hub and Portal route contexts | Existing account, role/module and access policy components remain authoritative |
| Sticky measurements | Header, Hub banners, HubNav and PortalNav share `observeStickyHeight`; reading/configuration rails and mobile mini-preview use measured values | Capture roots and output geometry unchanged |
| Editor keyboard tabs | ToolEditorLayout supports arrows, Home/End and roving focus | Preview remains mounted; focus lookup stays within the initiating tablist |
| Modal behavior | Dialog contains focus, makes background siblings inert, restores focus/scroll, and uses the current close callback | Consent content and callers remain unchanged |
| Form associations | Input, Textarea and Select support associated hints/errors and caller descriptions | Validation and persistence stay domain-owned |
| Grievance links | Three navigation actions use ButtonLink | Existing permission gates and destinations unchanged |

Integration repairs: import the tool classifier explicitly; normalize trailing slashes before classifying routes; scope tab focus locally and ignore empty/stale tab sets; put `aria-orientation` on the tablist; correct Dialog's inert boundary to its actual overlay parent; retain window-level Escape handling.

## Not imported from the source worktree

DataWorkbench read-state/tabs/header changes, PollsBoard header changes, CircleWorkspace refresh/tabs changes, WorkspaceHeader and their translation additions remain outside this bounded foundation recovery. Their source was not silently treated as tested or shipped. They are not prerequisites for redesigning Home or using existing task compositions. Revisit only against a concrete need and the applicable domain instructions.

## Validation and remaining evidence

- `npm run typecheck`: passed.
- Focused unit tests: 17 passed across nav-config, tab-keyboard, Dialog and existing UI primitives.
- Update catalog and bilingual public-copy checks: 34 passed (51 focused tests total).
- `npm run lint`: command exits successfully but explicitly skips ESLint due to the repository's TypeScript 7 incompatibility. This is not a passing ESLint run.
- `npm run build`: passed, including compilation, TypeScript and page generation.
- Current browser revalidation: unavailable because the browser tool rejected the local HTTP URL under its URL policy. Do not bypass that denial through another browser/control method. Earlier baseline screenshots describe the old implementation only.
- Full unit/smoke suites and the EN/FR responsive, keyboard, consent and export checks remain required for the completed uplift. No production or human accessibility claim is made.

## Resuming safely

Baseline repair is saved as a checkpoint. Ryan requested a pause before visual implementation to control compute use. Resume only when requested; the homepage redesign and responsive verification have not been completed.

Read this file and the uplift implementation status before interpreting old sprint statuses. Use the current branch and tests as implementation evidence. Do not copy all files from `764b` over newer main, reset another worktree, or reconstruct a missing refactor from prose. Continue visual implementation on these contracts, then validate affected journeys and document precise residual migration.
