# Staged refactor plan

**Execution order:** follow [11 — Ordered enhancement and sprint plan](11_SPRINT_EXECUTION_PLAN.md), which breaks these recommendations into 29 enhancements across eight required sprints (0–7) and one optional cleanup sprint. This document remains the evidence/rationale reference for each R packet.

Proposed work only. This audit implements none of it. Re-read current code and the [existing September 30 program](../audit/plan-2026-09-30-sitewide-qol-launch-program.md) before each packet; use its SKIP/NARROW/REALIGN/FULL alignment gate to avoid rebuilding shipped work. Evidence identifiers resolve in [03](03_INTERACTION_PATTERN_INVENTORY.md); findings in [04](04_DUPLICATION_AND_ENTROPY.md).

## Sequence and decision gates

| Stage | Packets | Gate to leave stage |
|---|---|---|
| FOUNDATIONAL | R00 contracts/baseline; R01 shell; R02 frame/header; R06 controls; R08 action meanings | Agreed boundaries plus representative implementations with unchanged appearance and domain policies |
| HIGH-VALUE CONSOLIDATION | R03 local output; R04 hosted challenge/output; R05 read/action states; R07 contextual help; R10 navigation state; R11 fields | Representative journeys pass failure, accessibility, locale, mobile and authorization checks; migrate compatible siblings incrementally |
| OPTIONAL CLEANUP | R09 registry/route hygiene; R12 decomposition/drawer mechanics | Only undertake when a touched area benefits or drift is demonstrated |
| DEFER UNTIL UI UPLIFT | V01 typography/tokens/surfaces/density; V02 visual responsive refinement | Design against stable contracts; do not change storage/security/route semantics |
| DO NOT CHANGE | Preservation contracts in [09](09_DO_NOT_CHANGE.md) | No capability removal or boundary weakening hidden inside consolidation |

“Before UI uplift” means before locking the affected pattern's visual design. It does not require finishing every migration before visual exploration can begin. Settle contracts and pilot implementations first; avoid a whole-product rewrite gate. Estimated size below is relative complexity, not a delivery-date promise.

## FOUNDATIONAL

### R00 — establish contract fixtures and ownership

- **Current implementation:** existing layout/export/navigation/E2E suites test many specific behaviours, while historical notes can lag source (current nav, Managed Documents, Data records).
- **Evidence:** E02, E13, E19; current QOL program and [01](01_CURRENT_PRODUCT_MODEL.md).
- **Problem:** implementation work can repeat closed initiatives or treat a stale observation as an architectural requirement.
- **Canonical pattern:** use this audit's archetypes, state/action contracts and exception register; establish source-and-browser fixtures for one page per archetype plus distinct editor preview families.
- **Affected routes/components:** Home, Create, running-meetings guide, RSVP, Flyer, Data, Brand Kit; add representative Hub/Circle/admin variants to existing suites, not a new testing framework.
- **Dependencies:** none; available local dependencies and authorized synthetic fixtures for runtime checks. Read applicable session notes before touching governed code.
- **Risk:** low; do not capture real personal data or treat synthetic access as production proof.
- **UX benefit:** makes preservation and migration review concrete.
- **Before uplift:** yes, contract/fixture definition; human validation remains explicitly outstanding until performed.
- **Acceptance:** baseline records route, shell, roles/modules, persistence, outputs, keyboard order, failure recovery and justified exceptions. Every later packet links to a baseline and states what it changes. Size: small.

### R01 — assign contextual shell and sticky-stack ownership (F01)

- **Current implementation:** locale layout always renders Header/Footer; Hub and Portal add nav and notices. Header and Hub banner publish measured heights; editor/Circle/reading rails use other offsets. Hub notices are compact only on `/app`.
- **Evidence:** E01, E03, E05, E15; Header, HubBannerStack, ToolEditorLayout, ComposedPageLayout and CircleWorkspace.
- **Problem:** operational work retains public-discovery chrome and multiple independently positioned layers. Deeper work can be louder than home.
- **Canonical pattern:** public, public-task and operational shell modes sharing providers and essential controls. One measured occluding-stack contract; contextual menus remain separate. Consistent summary/detail notice policy outside home where safe.
- **Affected routes/components:** `[locale]/layout`, `/app/*`, `/portal/*`, public editors, Header/Footer/HubNav/PortalNav, banner stack, sticky previews/TOCs/tabs.
- **Dependencies:** R00; preserve skip link, locale/display/account access, local switcher, auth/enrollment wrappers and warning content. Re-read current Hub dashboard/Portal/MFA lessons.
- **Risk:** high: hydration, navigation visibility, sticky offsets, scroll/focus and provider lifetimes. Avoid moving authentication policy into shell detection.
- **UX benefit:** less repeated navigation/explanation and more usable task area; no quantified gain claimed.
- **Before uplift:** yes, mode and offset contracts plus representative pilots. Broad rollout can follow incrementally.
- **Acceptance:** one main landmark; correct navigation for anonymous/officer/member/operator states; no lost notice or context switch; keyboard/focus clear at 320/390/768/1024/1280+ widths, enlarged text and zoom. No palette/typeface redesign. Size: large; pilot one public editor and one Hub/Circle workspace.

### R02 — one frame owner and composable task headers (F02)

- **Current implementation:** PageShell/nested tiers exist; DataWorkbench renders its own padded max-width main within Hub's padded body and locale main. Board headers combine title/actions differently.
- **Evidence:** E03, E12–E15.
- **Problem:** local spacing/landmark decisions accumulate and equivalent workspaces lack a stable title/scope/action hierarchy.
- **Canonical pattern:** shell owns outer frame/main; page owns one WorkspaceHeader with title, scope/status, return and action slots, then domain composition. Public orientation retains its narrative header.
- **Affected routes/components:** DataWorkbench and Data page error branch first; PollsBoard and selected peers; PortalPanel can adapt header slots without losing its identity.
- **Dependencies:** R00 and R01 ownership decision, R06 navigation semantics.
- **Risk:** medium: changed widths may affect wide tables or existing browser assertions. A common header must not fetch or authorize data.
- **UX benefit:** predictable location for task identity and actions, fewer nested spacing constraints.
- **Before uplift:** yes for contract/pilot; complete sibling migration only where duplication affects layout ownership.
- **Acceptance:** no nested main or double shell padding in pilot; title and authorized actions survive all loading/empty/error states; responsive reading order matches DOM order. Keep dense table overflow within its region. Size: medium.

### R06 — complete shared keyboard, dialog and tab behaviour (F06)

- **Current implementation:** Dialog handles initial/return focus and Escape only; drawers independently handle Tab containment. ToolEditorLayout has tab-panel IDs but no roving arrow handling. Data/Circle tablists lack linked panels; Circle also has number shortcuts. Grievance links wrap Button.
- **Evidence:** E05, E12, E13, E15, E18.
- **Problem:** apparently equivalent controls make different promises to keyboard and assistive users. Re-skinning would preserve the inconsistency.
- **Canonical pattern:** modal focus containment/background interaction/return; shared tab semantics with linked panels and keyboard model; SegControl remains a radiogroup for values; ButtonLink for navigation.
- **Affected routes/components:** Dialog/ConsentModal/RouteStatusPanel dialog; ToolEditorLayout then Data/Circle; touched Link/Button combinations.
- **Dependencies:** R00; R01 for focus origin and layered overlays. Preserve consent content and canvas capture lifecycle.
- **Risk:** medium-high: trapping focus incorrectly is worse than cosmetic drift; hidden/unmounted panels can break capture. Numeric shortcuts must not override form editing.
- **UX benefit:** transferable keyboard behaviour and reliable focus recovery.
- **Before uplift:** yes, before these primitives are expanded or restyled.
- **Acceptance:** keyboard traversal stays in modal until close, restores invoking focus, and prevents background activation; tabs support expected focus/selection/panel relationships; active hidden tabs fall back safely; editor exports still work in Edit, Preview and mini-collapsed states. Automated tests plus manual keyboard/screen-reader checks; do not claim conformance from axe alone. Size: medium.

### R08 — agree save/reset/handoff meanings (F08)

- **Current implementation:** Brand Kit autosaves with local toast; worksheets retain local drafts; some canvas state is component history; hosted copy explicitly posts new records. Reset behaviours are delegated and confirmation varies.
- **Evidence:** E06–E09, E18; brand store, useStewardGuideDraft, UndoRedoBar, HubDraftSyncPanel.
- **Problem:** uniform buttons can conceal materially different retention or replacement effects; one generic Save would increase confusion.
- **Canonical pattern:** explicit device/hosted/publication/output meanings from [05](05_TARGET_PRODUCT_MODEL.md). Retain autosave where intentional. Reset names affected scope; confirmation depends on irreversible loss, not component fashion.
- **Affected routes/components:** Brand Kit, persisted worksheets, Flyer/Graphic reset, generator draft import, HubDraftSyncPanel; existing EN/FR namespaces.
- **Dependencies:** R00; inspect each reset's undo stack before deciding it is reversible. Read both locale values; no blanket translation substitution.
- **Risk:** medium: copy changes may misstate adapter mode or imply all public drafts persist. Never silently switch adapters or upload content.
- **UX benefit:** users understand what survives navigation, what is on-device, and what has been transferred.
- **Before uplift:** yes, semantic contract and scope disclosures; optional toast placement/animation stays with design.
- **Acceptance:** refresh/storage-blocked tests match claims; reset leaves unrelated identity/hosted data intact; replacement warning identifies target; hosted-copy label does not imply two-way sync. Size: small-medium.

## HIGH-VALUE CONSOLIDATION

### R03 — single output definition and feedback owner per editor (F03)

- **Current implementation:** Flyer/Graphic/Resizer repeat buttons in form and preview; Resizer renders the same export error twice. ToolExportActions is used by four pages; generator already reuses renderDownloadActions. saveBlob resolves cancelled native sharing as well as successful sharing; runExport announces success for either resolved result.
- **Evidence:** E06 and E09.
- **Problem:** labels, busy state, disabled conditions, output ordering and feedback drift while solving the same problem.
- **Canonical pattern:** typed/local action set supplying form and mobile preview locations, caller-selected primary output, one action outcome region. Extend existing ToolExportActions/useExportHandler rather than create another export shell. Propagate cancelled vs handed-off outcomes from the save helper; browser fallback only establishes initiation, not verified disk persistence.
- **Affected routes/components:** `/create/flyer-maker`, graphic-maker, resizer, existing ToolExportActions consumers, save-blob/image-export result propagation; Office generator kept as a specialized adapter.
- **Dependencies:** R06 tab/capture preservation, R08 outcome meanings; Canvas Core spec and export safety lessons before touching capture-adjacent code.
- **Risk:** medium: capture nodes and format-specific eligibility can be accidentally lost. Do not rewrite export engines or filenames.
- **UX benefit:** predictable output options and one clear success/failure message across form and preview.
- **Before uplift:** yes, settle actions/status before styling editor controls; migrate peers incrementally.
- **Acceptance:** supported file types, dimensions, filenames, QR/logo presence and preview/output fidelity unchanged; same disabled/busy state in both action locations; one error announcement; failure preserves edits; cancelling native share does not announce a successful download or trigger an unwanted second save. Preserve iOS/PWA handoff behaviour. Run relevant layout/export smoke and fidelity suites serially where repository guidance requires. Size: medium.

### R04 — share hosted download and challenge presentation safely (F04)

- **Current implementation:** Poll/Expense/RSVP/Travel/Time each track pending output, MFA code, busy and error. Expense does not await delivery helper; domain error branches vary. Administration and publication have additional side effects.
- **Evidence:** E14 and E17; Poll export route traces actual server ordering.
- **Problem:** repeated client state machines diverge; a premature success can obscure download failure. A broad security abstraction would be dangerous.
- **Canonical pattern:** first share Poll/RSVP request/outcome and ActionChallenge presentation with frozen target/format. Await delivery and consume the truthful cancelled/handoff result established by R03; awaiting alone does not fix native-share cancellation reporting. Then adapt compatible exports. Share only presentation with publication/admin until their uncertain-write contracts are individually reviewed.
- **Affected routes/components:** PollsBoard, MeetingEventsBoard, ExpensesBoard, TravelBoard, TimeDashboard; later Data publish and account support fields. Server API policy remains unchanged.
- **Dependencies:** R03 save-result contract, R06, R08, R11; read each existing export/step-up session note and API before migrating. Preserve domain response codes, replay/attempt limits and audit ordering.
- **Risk:** high: code reuse could accidentally replay a privileged action, persist codes, bypass challenge or report an uncertain write as safe to retry.
- **UX benefit:** same code-entry/recovery mechanics while clearly naming the pending operation and its consequence.
- **Before uplift:** yes for contract and two compatible download pilots; complete other sensitive migrations as independently reviewed packets.
- **Acceptance:** initial success, challenge required, invalid/limited/unavailable, audit failure, network failure, cancelled save, cancel challenge and tenant/target change. Each export remains POST as applicable, same filters/record/format resume, codes cleared, no automatic retry, no broader access. Run domain route tests and role/MFA fixtures as well as browser checks. Size: large, split by domain.

### R05 — separate initial load, refresh and action outcomes (F05)

- **Current implementation:** Data empty arrays precede fetch; its message mixes failures/success. Circle refresh failure replaces retained workspace. Grievance detail conflates absent data in a not-found paragraph. HubDraftSyncPanel has no outer network-rejection recovery and sequential writes can partially succeed.
- **Evidence:** E08, E12–E15, E20.
- **Problem:** no-data, not-yet-loaded, failed and uncertain states lead to different user actions but are not consistently distinguished.
- **Canonical pattern:** LoadState and ActionFeedback contracts from [05](05_TARGET_PRODUCT_MODEL.md), supplied with domain decisions. Retry reads; reconcile uncertain writes; preserve draft inputs and current scope.
- **Affected routes/components:** DataWorkbench, CircleWorkspace, GrievanceDetail, one operational board, HubDraftSyncPanel. Use Portal loading/retry components as reference rather than another status shell.
- **Dependencies:** R02 and R08; R04 for challenge outcomes. For sequential handoff, establish record identification/idempotency from receiving APIs before offering resume; if absent, stop and show partial/uncertain status with a Hub review path rather than blind retry.
- **Risk:** high for stale sensitive content and partial writes, medium for state presentation. Authorization loss must clear protected data; tenant switches must invalidate previous scope.
- **UX benefit:** correct next action, fewer false empty states and safer recovery without lost work.
- **Before uplift:** yes for selected state contracts/pilots; domain-specific idempotency changes, if required, are separately scoped before implementation.
- **Acceptance:** simulated slow load, empty, no match, failed initial read, failed refresh, authorization loss, locked hybrid slice, thrown network mutation and partial transfer. No falsely successful state; no repeat POST on retry without reconciliation; one relevant recovery action; all locale fallbacks translated. Size: large, split by state family.

### R07 — make guidance conditional and task-local (F07)

- **Current implementation:** BrandSetupPrompt always renders a warning, even when themeEstablished only changes its href. Several canvas pages mount it unconditionally; Office generator omits it after setup. Breadcrumb/back/title/subtitle/purpose can stack.
- **Evidence:** E04, E06, E07, E09.
- **Problem:** returning tool users receive onboarding-like guidance while already doing the task.
- **Canonical pattern:** missing identity gets setup prompt; established identity gets a quiet existing Brand Kit access path. Task header states job once; necessary field help remains inline; optional reference below/alongside task.
- **Affected routes/components:** BrandSetupPrompt callers, ToolEditorLayout header/toolbar, public catalog breadcrumb usage. Preserve public orientation pages and workshop-specific demo context.
- **Dependencies:** R01–R02, R08; brand hydration must be resolved before classifying readiness.
- **Risk:** low-medium: hiding necessary setup too early or removing consent/source/legal caveats. Do not delete content solely to meet a word count.
- **UX benefit:** shorter path from task entry to controls without losing help.
- **Before uplift:** yes, content priority/conditions; final spacing/emphasis deferred.
- **Acceptance:** first visit, hydrated configured kit, storage-blocked kit, workshop demo and direct deep link all have appropriate guidance. Controls and related resources remain reachable; no false setup flash. Size: small-medium.

### R10 — define restorable workspace navigation (F10)

- **Current implementation:** public catalog retains URL state; Circle tabs write replaceState; Data tabs and selected import reset with component state. Existing MFA return helpers and Dispatch links already carry task context.
- **Evidence:** E02, E13, E15.
- **Problem:** users moving between related views cannot consistently predict Back/reload/return behaviour.
- **Canonical pattern:** document URL vs local-draft vs ephemeral state per workspace. Preserve safe tab/filter/selection context where useful; reauthorize all restored identifiers. Keep sensitive payloads and codes out of URLs and new global stores.
- **Affected routes/components:** DataWorkbench selected tab/import/page; Circle selection/navigation synchronization; touched Hub list/detail return links. Preserve public catalog behaviour.
- **Dependencies:** R05 scope invalidation, R06 tab semantics, existing query helpers and safe internal return-path functions.
- **Risk:** medium: browser history spam, restored unauthorized IDs, accidental leakage in query strings. Do not make broad API changes for a tab switch.
- **UX benefit:** predictable continuation of existing tasks, without a new recents/favourites system.
- **Before uplift:** yes for selected navigation decisions; sibling adoption can follow later.
- **Acceptance:** direct link, reload, Back/Forward, locale change and active-local change; invalid/hidden tab safe fallback; no raw member/draft data in URL; editing does not generate a history entry per keystroke. Size: medium.

### R11 — reusable accessible field feedback (F11)

- **Current implementation:** shared controls handle labels and IDs, but hint/error composition remains caller-owned; raw fields in Data/Circle repeat styling and semantics. Data's custom-field label input has only placeholder text.
- **Evidence:** E13, E15, E17, E18.
- **Problem:** field labels, invalid state and remedial guidance are inconsistently associated with the control.
- **Canonical pattern:** extend control composition with hint/error IDs, invalid state and clear required/optional naming; preserve native form semantics, types and domain validation.
- **Affected routes/components:** Input/Textarea/Select, Data dataset/custom field forms first, then compatible Circle/admin forms. Do not retrofit every form in one commit.
- **Dependencies:** R06 focus conventions; R08 localization semantics; callers pass translated labels and domain errors.
- **Risk:** medium: nested labels, duplicate IDs, validation timing or server error mapping can regress. Native elements are not inherently inferior to shared components.
- **UX benefit:** error recovery and field purpose are understandable without inferring from placeholders or colour.
- **Before uplift:** yes, field contract and pilot; visual field styles remain unchanged.
- **Acceptance:** stable label/hint/error association, focusable invalid input after failed submit, values retained, busy prevents duplicate action, bilingual messages agree in meaning. Test keyboard and screen-reader pilot. Size: medium.

## OPTIONAL CLEANUP

### R09 — reconcile metadata only where it models the same relationship (F09)

- **Current implementation/evidence:** route aliases are intentional; locale Link canonicalizes strings. RELATED_BY_TOOL and public catalog relatedItemIds independently model next steps. E02/E04.
- **Problem:** potential editorial drift; not confirmed broken navigation or duplicate capability.
- **Canonical pattern:** reuse canonical IDs/paths for identical relationships; preserve task-specific editorial links. Add integrity checks for valid targets, disabled-tool filtering and localized titles where gaps are demonstrated.
- **Affected routes/components:** public-catalog, related strips, public-routes/Next rewrites and nav-config tests; no planned route renames.
- **Dependencies:** current catalog/visibility and i18n rules; R00 baseline.
- **Risk:** low-medium; “deduplication” can erase useful curated relationships or aliases.
- **UX benefit:** reliable destinations and matching task language where drift is real.
- **Before uplift:** no broad cleanup required; fix proven broken links independently.
- **Acceptance:** canonical/legacy EN/FR routes preserve query/hash; disabled entries remain filtered; no change to workshop presets or source scope. Size: small, demand-driven.

### R12 — reduce maintenance duplication at proven boundaries (F12)

- **Current implementation/evidence:** repeated focus/body-lock logic in three drawers; large Circle/Grievance/Data components own multiple sections and request states. E12/E13/E15/E18.
- **Problem:** repeated fixes and difficult review; size alone is insufficient justification.
- **Canonical pattern:** extract shared overlay behaviour without shared menus; extract domain sections/request outcome adapters when the affected packet needs them. Preserve domain policy ownership.
- **Affected routes/components:** MobileNavDrawer/HubNavDrawer/PortalNavDrawer; CircleWorkspace, GrievanceDetail, DataWorkbench; no universal CRUD abstraction.
- **Dependencies:** R01, R05, R06 contracts; domain permission tests.
- **Risk:** medium-high if moving state changes remount/reset behaviour or request lifecycle.
- **UX benefit:** indirect: subsequent interaction fixes propagate reliably, without feature changes.
- **Before uplift:** no, except the minimum extraction needed for a foundational/high-value packet.
- **Acceptance:** identical allowed links, focus/scroll restoration, retained drafts and selected record; no new fetch duplication or visibility broadened; remove old code after adoption. Size: variable; keep bounded.

## DEFER UNTIL UI UPLIFT

### V01 — tokens, typography, surfaces and density

**Current/evidence:** global CSS, public type constants, guide classes, PortalPanel/PublicHubPanel and olTheme expose several styling vocabularies (E03/E04/E10/E15). **Problem:** visual variation cannot be usefully judged or solved by a structural audit alone. **Target:** a shared visual vocabulary applied to these stable archetypes, preserving deliberate public/operational emphasis. **Affected:** shared primitives and shell/reading/editor/workspace skins. **Dependencies:** R01/R02/R06/R08 and representative state fixtures. **Risk:** contrast, text scaling and canvas export contamination. **Benefit:** coherent visual hierarchy after behaviour is stable. **Before uplift:** no; this is uplift work. Rename legacy colour tokens only with compatibility and capture regression checks; do not infer tenant bias from aliases.

### V02 — visual responsive composition

**Current/evidence:** shared tiers coexist with task-specific grids, mobile previews, drawers and scrollable tables (E01/E03/E05/E13/E15). **Problem:** visual density/order requires rendered evaluation after shell ownership is fixed. **Target:** refine spacing and responsive composition by archetype while preserving keyboard order, task access and preview geometry. **Affected:** representative archetype layouts before siblings. **Dependencies:** R01/R02/R06; EN/FR, zoom and display-preference fixtures. **Risk:** clipped controls, hidden focus, changed captured output. **Benefit:** calmer, readable layouts across devices. **Before uplift:** only behavioural defects such as focus/occlusion are earlier work; cosmetic breakpoint tuning belongs here.

## DO NOT CHANGE

Do not combine public and hosted storage, weaken MFA/tenant/audit checks, replace Canvas Core, drop outputs, remove direct Letter/Brand Kit entry points, rename Portal vocabulary wholesale, remove compatibility redirects, or add speculative SaaS features. See the complete [preservation register](09_DO_NOT_CHANGE.md).

## Verification and completion policy

Use existing targeted suites from [03](03_INTERACTION_PATTERN_INVENTORY.md), then required lint/unit/smoke checks appropriate to the actual implementation change. For large/multi-file implementation, follow AGENTS testing requirements; include typecheck for route/component changes. Export changes additionally require actual file/fidelity checks. Authentication-sensitive UI needs API denial/MFA/tenant fixtures, not just screenshots.

Every packet must demonstrate: preserved capabilities, unchanged authorized scope, unchanged output availability, correct EN/FR meaning, correct mobile/keyboard order, truthful pending/error/success and recovery, and removed superseded behaviour for its migrated consumers. Record intentionally unassessed human/host checks as such. Runtime verification and deployment are not part of this documentation-only audit.
