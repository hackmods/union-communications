# Duplication and entropy register

Classification: **I** intentional variation; **H** harmless implementation variation; **U** UX inconsistency; **D** architectural duplication; **T** technical debt worth addressing before visual uplift. A finding can have more than one classification. Priority describes structural value, not security severity. Evidence identifiers link to [03](03_INTERACTION_PATTERN_INVENTORY.md).

## Actionable findings

| ID / class | Source-confirmed implementation | Product consequence and confidence | Disposition |
|---|---|---|---|
| F01 — U/T, high | Public Header/Footer wrap Hub and Portal. HubBannerStack compresses notices only on home. ToolEditorLayout and Circle tabs have independent fixed sticky offsets. [E01, E05, E15] | Operational navigation competes with discovery and notices; offset complexity is real. Actual occlusion at a width/zoom remains untested. | Define public, task, and operational chrome responsibilities; shared measured top stack; retain safety notices. R01 |
| F02 — D/T, high | PageShell/nested tiers coexist with DataWorkbench's padded `main` inside locale main and Hub wide frame. Headers are independently assembled. [E03, E12, E13] | Double spacing and nested landmark ownership are confirmed; exact visual impact needs browser check. | One outer frame and main owner; header slots; pilot Data and one board. R02 |
| F03 — D/U, high | ToolExportActions exists but Flyer/Graphic/Resizer repeat output buttons; Resizer repeats exportError. saveBlob resolves native-share cancellation like success; runExport then announces Downloaded. Office editor already reuses renderDownloadActions. [E06, E09] | Duplicate maintenance, possible double error announcements and misleading completion after cancellation; duplicated action placements themselves are useful on mobile. | Share action definitions and one truthful feedback owner, preserve both locations and native share behaviour. R03 |
| F04 — D/U/T, high | Poll, Expense, Meeting and peer exports implement challenge/resume separately; expense does not await downloadBlob; code validation/error classification differ. [E14] | Inconsistent completion/error experience; extraction risks weakening security if it absorbs server policy. | Shared client download/challenge presentation after behaviour contract; keep domain handlers. R04 |
| F05 — U/T, high | Data uses one message channel for error/success and empty arrays during initial load. Circle replaces loaded UI on refresh failure. Grievance detail has sparse early returns. HubDraftSyncPanel lacks fetch rejection/partial-completion recovery. [E08, E12–E15] | Users may see empty before loaded, lose visible context, or lack a safe next action. Failure paths are confirmed; incident frequency is unknown. | Typed action/load states, explicit retry/reconcile, preserve drafts; no blind mutation retries. R05 |
| F06 — U/T, high | Dialog has no focus containment/inert background. ToolEditorLayout tabs lack arrow handling; Data/Circle tab buttons lack linked tabpanel contract. Circle number shortcuts exist. Link wrapping Button occurs in grievance navigation. [E05, E12, E13, E15, E18] | Keyboard/assistive expectations differ across equivalent controls. This is source evidence, not a conformance verdict. | Fix interaction primitives before reusing/restyling; use ButtonLink for navigation. R06 |
| F07 — U, medium | BrandSetupPrompt always returns warning; Flyer/Graphic/Resizer mount it with established themes; generator hides it once established. Tool title/description/purpose plus catalog back/breadcrumb can stack. [E04, E06, E07, E09] | Returning users repeatedly encounter setup explanation. Help needs differ by task and readiness. | Conditional guidance and concise task header; retain important consent/privacy/domain guidance. R07 |
| F08 — U/T, medium | Local edit history, persisted worksheets, Brand Kit autosave, and explicit hosted copy use different feedback. UndoRedoBar does not specify reset consequence; Hub sync creates hosted records rather than general two-way sync. [E07–E09, E18] | Similar verbs can conceal different retention and replacement effects. Different persistence is intentional. | Adopt consequence-based action vocabulary and storage disclosures; verify reset recoverability per tool. R08 |
| F09 — H/D, low | Canonical public paths intentionally differ from implementation folders. Route maps and rewrites are coordinated; locale Link normalizes string hrefs. RelatedToolsStrip and public catalog separately describe relationships. [E02, E04] | Legacy folder names are harmless. Relationship drift is a maintenance risk, not a proven duplicate feature. | Keep routes. Optional reconciliation of identical relationships and metadata checks. R09 |
| F10 — U/T, medium | Catalog filters have URL/history handling; Circle tabs use replaceState and deep-link mapping; Data tab/import selection is React-local. [E02, E13, E15] | Reload/back/return behaviour differs for recurring work. Not every state belongs in URL. | Explicit per-workspace restoration contract; only non-sensitive navigation state. R10 |
| F11 — D/U, medium | Shared labeled inputs exist; Data/Circle and admin surfaces assemble hints, errors, validation, and disabled states locally. Data custom-field label uses placeholder-only input. [E13, E15, E17, E18] | Repeated field plumbing causes semantic omissions, not just different borders. | Extend accessible field composition; migrate targeted omissions; retain validation schemas. R11 |
| F12 — D, medium/optional | CircleWorkspace, GrievanceDetail, DataWorkbench and tool pages combine many domains, fetches, state variables and JSX. Three drawers repeat interaction mechanics. [E12, E13, E15, E18] | Changes to one interaction require repeated careful editing. File length alone does not prove user harm. | Extract domain sections/request outcomes at touched boundaries; drawer behaviour separately from menus. R12 |

Every proposed implementation above is specified in [08](08_REFACTOR_PLAN.md). No undocumented broad “consistency sweep” is implied.

## Variation that should survive

| Apparent duplication | Classification | Why normalization would be harmful |
|---|---|---|
| Flyer, Graphic Maker, Board Notice | I | Different output purposes, dimensions, presets and print constraints. Share editor chrome; preserve capability choices. |
| Letter Generator and Document Generator | I; implementation already consolidated | Shared editor with focused variant. Removing a discoverable task entry point produces no engineering gain. |
| Public bylaw/proposal worksheets and Hub bylaws/proposals | I | Private drafting vs scoped records, review, and member-safe publication. Explicit handoff proves intentional relationship. |
| Brand Kit, union brand, host brand, tenant settings | I | Presentation defaults, scoped organizational configuration and authority are not equivalent. |
| Officer Learning and ordinary guides | I | Assessment/progress/sequence differ from reference reading. Share TOC mechanics selectively. |
| Portal Actions and Hub Tasks | I | Circle participants vs operational/case-related tasks. No evidence supports merging their records or permissions. |
| Public RSVP/poll responses and authenticated Portal | I | Token participation does not establish membership. |
| DOM canvas, Office mock, website iframe, data preview table | I | Different fidelity and interaction needs; one visual preview engine would be misleading. |
| Separate Hub/Portal/public error recovery destinations | I | User must return to the relevant context; RouteStatusPanel already shares presentation. |
| PAGE_SHELL constants vs PageShell component | H | Equivalent frame class ownership can be sound; do not migrate merely to change syntax. |
| Local fieldset vs Card vs PublicHubPanel vs PortalPanel | H/I until consequence shown | Semantics and grouping matter; border/radius differences are visual design work. |
| Old `opseu-*` CSS token names | H/T for later naming cleanup | Their values are platform variables; renaming broadly is not evidence-backed product consolidation. |

## Abandoned, duplicate, or inaccessible functionality

- **Confirmed retired entry points:** Share Kit redirects to Graphic Maker; Keep Learning redirects to Learn. Do not resurrect either as a feature or treat compatibility routes as abandonment debt.
- **No additional feature deletion recommended.** Neither similar titles nor similar card layouts establish duplicate purpose.
- **Conditional access is intentional:** module-disabled, role-restricted, MFA-required, invite-only and unpublished states do not establish inaccessible functionality. A menu entry is not authority to read a record.
- **Unverified discoverability questions:** Hub “Other” grouping for leftover links, member understanding of Portal labels, and return-context loss merit bounded task testing. They do not justify renaming all sections or adding a command palette.
- **Known unavailable work:** Data async jobs/saved custom reports and operational readiness remain in existing domain trackers. Their absence is not a reason to advertise planned features in the current navigation.

## Evidence threshold for future changes

Before merging two patterns, show that they solve the same user problem, have compatible lifecycle/authority/storage semantics, and can share behaviour without condition-heavy branching. Before deleting an entry point, demonstrate equivalent reachability, preserved deep links and no lost output. If only class names or borders differ, defer to visual design.
