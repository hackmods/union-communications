# Handoff to the future UI/design-system project

**Current baseline:** [13 — recovered uplift baseline](13_UPLIFT_BASELINE.md) records the integrated foundations, repairs, validation and remaining work. The contracts below remain applicable; proposed components are not automatically shipped components.

## Architecture to design against

UnionOps has **seven behavioural page archetypes**:

1. Orientation: explain and direct.
2. Discovery: find and choose.
3. Reading/learning: understand, reference and assess.
4. Focused task: complete one bounded operation.
5. Editor: iteratively author and inspect an artifact/draft.
6. Operational workspace: act on ongoing scoped records or collaboration.
7. Configuration/administration: change values, scope, defaults or policy with clear consequences.

Use [02](02_PAGE_ARCHETYPES.md) for each archetype's structure, actions, navigation, help, responsive contract, states and exceptions. These are not seven visual templates that every page must resemble.

The workspace compositions are artifact editor, structured worksheet, record list/detail, operational board, review workbench, collaboration space and configuration workspace. Their shell context is public task, Officer Hub, Local Portal or Site Admin. A page can contain a small form without adopting the focused-form composition for its whole workspace.

## Canonical interaction contracts

| Contract | What design can rely on after structural pilots |
|---|---|
| Contextual shell | One main/frame owner and one measured sticky stack; public discovery and operational navigation are selectively composed, not blindly stacked |
| Header | Title, scope/status, return path and primary/secondary action slots; orientation may include fuller narrative |
| Actions | Same output definitions across form and mobile preview; consequence-specific Save/Apply/Publish/Download/Copy/Send/Reset meanings |
| Forms | Associated label, hint, error and invalid state; retained values after failure; domain validation remains authoritative |
| Preview | Renderer declares canvas-fidelity, illustrative Office, interactive website or structured text/data result; no universal fidelity promise |
| Navigation | Canonical paths retained; tab/link/value selection behave differently and accessibly; safe history context is explicit |
| Help | Necessary guidance at point of decision, optional supporting content in disclosure/related region, full explanation on orientation/learning pages |
| Read states | Initial loading, loaded-empty, no matches, refreshing, read failure and authorization/locked states are separate |
| Action states | Busy, confirmed success, failed, challenge-required and uncertain outcome; no blind retries of consequential operations |
| Security challenge | Same target/action remains visible and stable; codes are not persisted; domain MFA/audit policy remains on server |

Refer to [05](05_TARGET_PRODUCT_MODEL.md) for complete semantics. Copy must report what the system actually knows. “Downloaded” must not imply external delivery or verified filesystem persistence. “Saved” must identify device vs hosted scope where ambiguous.

## Shared components the design system should support

**Existing foundations:** PageShell/PAGE_SHELL, ComposedPageLayout, GuideLayout, ToolEditorLayout, CanvasWrapper/LogoContainer, MobilePreviewStage, ToolFormDetails, ToolExportActions/useExportHandler, PublicCatalogExplorer/Breadcrumbs, PortalPanel, PublicHubPanel, standard UI controls/Callout/EmptyState/Skeleton/Dialog, RouteStatusPanel, MFA field/journey components.

**Narrow proposed compositions:** WorkspaceHeader, FieldFeedback, ActionFeedback, LoadState, WorkspaceTabs behaviour, ActionChallenge presentation. These are semantic/behavioural contracts, not a requirement for six new visual containers. [06](06_COMPONENT_CONSOLIDATION.md) defines ownership and first consumers.

**Remain domain-owned:** case lifecycle/access, Circle tools/membership, Data import/publication, public document publication, brand baseline application, hosted export authorization/audit, local draft storage, hybrid encryption/unlock and each output renderer.

## Structural work that precedes visual lock-in

| Must be settled first | Why design depends on it |
|---|---|
| R01 shell modes, notice placement and sticky-stack contract | Determines available task area and number of navigation layers |
| R02 frame/header ownership | Prevents designing new components inside competing padded wrappers |
| R06 dialog/tab/navigation semantics | Styling cannot repair focus, panel relationships or nested interactive elements |
| R08 save/reset/result vocabulary | Different outcomes must not receive misleadingly identical controls |
| R03/R04 representative action and challenge flows | Determines output locations, pending-action context and completion states |
| R05/R11 representative state/field recovery | Design must include failure/uncertainty, not only populated happy paths |
| R07 guidance conditions and R10 safe restoration policy | Determines when explanations appear and what navigation must preserve |

The gate is **contract plus representative proof**, not a demand to finish all sibling migrations before any visual exploration. All remaining exceptions should be listed rather than disguised as temporary styling variants. Optional R09/R12 cleanup does not block uplift absent a specific dependency.

## Intentional design variation

- Public pages may explain and persuade; operational tasks should foreground work, scope and consequence.
- Guides use reading measure, catalogs scan across items, editors pair controls/results, and Data comparisons may need a scrolling table.
- Officer Learning has progress, assessment and module navigation; it need not look like a legal document.
- Portal has solidarity vocabulary and Circle navigation, not Officer Hub's confidential casework model.
- Brand Kit is an autosaving local configuration workspace; host administration often requires explicit save, challenge or publication.
- Fixed-size export surfaces may use explicit pixels/colours/fonts. They are designed artifacts, not ordinary responsive application chrome.
- Mobile may reorder control/preview regions or use drawers, but must preserve semantic order, focus, actions and essential context.

The full [do-not-change register](09_DO_NOT_CHANGE.md) is part of the handoff, not optional background reading.

## What visual design should not attempt to solve

Do not use visual changes to redefine tenant membership, permissions, storage, autosave, publication, security verification, audit ordering or output fidelity. Do not remove capability to make pages fit a layout. Do not move routes or rename Portal concepts merely to match navigation aesthetics. Do not add dashboards, notifications, AI, recents, favourites or tours to cover discovery uncertainty. Do not claim readiness, accessibility conformance, legal approval, durable hosting or backup verification from a polished interface.

Existing operational launch blockers remain in [LAUNCH_TRUST_LEGAL_REFACTOR](../LAUNCH_TRUST_LEGAL_REFACTOR.md) and the [QOL program](../audit/plan-2026-09-30-sitewide-qol-launch-program.md). This audit does not replace them or grant production deployment authorization.

## Representative design and evaluation set

| Fixture | Required variants |
|---|---|
| Home / Platform | Anonymous, hosted availability gated; clear public vs hosted choice |
| Create / Worksheets catalog | Default, URL-filtered, no matches, disabled item absent, Back restoration |
| Brand Kit | Unhydrated, new, configured, storage blocked, baseline available, reset consequence |
| Flyer / Resizer | No source where applicable, editing, mini/full preview, busy, error, output complete, consent dialog |
| Office / Website generator | Illustrative vs interactive preview, supported format set, draft restoration/export error |
| Running-meetings guide / Officer module | Short vs long outline, sources, quiz result, progress state, translated long content |
| RSVP / MFA | Valid, invalid/expired where applicable, validation error, busy, success, accessible focus |
| Hub home / grievance | Member/operator/officer, modules off, MFA required, tenant pending, locked hybrid, no records, restricted/read-only, record mutation |
| Data review | Initial load, no datasets, selected import, dirty mapping, accepted/excluded rows, impact, challenge, failure/uncertainty, published result |
| Portal Circle | Hall vs committee tabs, viewer/member/admin, selected tab link, failed refresh, preserved draft, membership loss |
| Hosted output / account support | Frozen target, challenge error/limit/unavailable, cancellation, audit failure, confirmed vs uncertain outcome |

Evaluate at representative phone/tablet/desktop widths, text-size preferences, zoom, reduced motion/high contrast, keyboard and assistive technology, with EN/FR content and synthetic records. Include narrow views of wide data tables rather than hiding columns without review.

## Measures of coherence

Use observable task results instead of invented adoption or speed claims:

- A returning creator reaches controls without repeating irrelevant setup instructions.
- A user can predict where the current task's primary action and result will appear.
- A download failure is announced once and does not discard edits.
- A fresh challenge names and resumes the same operation; cancelling does not trigger it.
- A failed read is distinguishable from an empty record list; a lost permission never exposes stale protected content.
- A user knows whether a draft is temporary, retained locally or saved to Officer Hub.
- A keyboard user can navigate tabs and leave/return from dialogs without focus loss.
- Existing formats, content, roles, localized meaning and canonical/legacy entry points remain available.

Conduct bounded moderated tasks with a communications volunteer, steward, officer and Portal member; include French-language review. These are validation roles, not requirements to add new personas or product features. Compare confusion/errors and recovery against recorded baseline; do not invent percentage improvements.

## Audit verification record and limits

- Repository inventory and representative source traces completed against `1cd62917` on 2026-09-30.
- Current EN/FR values inspected for primary navigation and common output/reset states; literal English Circle loading fallback confirmed. No full translation-quality audit claimed.
- Eleven requested planning documents created under `docs/product-refactor/`; production code, message catalogs, routes and styles were not modified.
- Relative Markdown file targets checked for existence; document count and whitespace/diff scope checked after writing.
- No application runtime, tests, visual screenshots, screen-reader session or production account/host checks run. `node_modules` was absent. Existing test files were inspected as validation assets, not reported as passing.
- Existing untracked `.codex/` workspace content was present at the start and left untouched. No commit, push, PR or deployment was performed.

The audit is complete as a source-grounded structure and interaction plan. Its proposals remain unimplemented, and browser/human evidence is a gate for the later refactor and uplift—not a result of this audit.
