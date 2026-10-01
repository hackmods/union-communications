# Component consolidation

Use composition and narrow behavioural contracts. Do not introduce a universal `Page`, `Tool`, `CRUD`, or workflow configuration engine with dozens of flags. Proposed names below describe responsibilities; final naming can follow repository conventions. Evidence references resolve in [03](03_INTERACTION_PATTERN_INVENTORY.md); implementation packets are in [08](08_REFACTOR_PLAN.md).

## Keep and extend

| Existing foundation | Proposed responsibility | Concrete change / boundary | Packet |
|---|---|---|---|
| Locale providers, Header, HubNav, PortalNav, HubBannerStack | Context-aware shell composition | Select public/task/operational chrome; one owner for main, frame and sticky offset. Preserve independent nav models, providers, safety notices and scope switchers. | R01–R02 |
| PageShell / PAGE_SHELL / ComposedPageLayout | Width and composition | Use outer frame exactly once. Nested pages use nested tiers or internal grids, not another padded main. Do not force all call sites to use component syntax instead of constants. | R02 |
| ToolEditorLayout | Controls/preview structure | Retain slots, mobile panes and capture mounts. Introduce reusable tab behaviour and agreed header/action/feedback ownership. | R03, R06–R07 |
| ToolExportActions + useExportHandler | Local output action set and outcome | Permit caller-selected primary format rather than hardcoded PNG primacy; render from one definition in both locations. Keep Office/ZIP-specific outputs and domain enablement. | R03 |
| Input/Textarea/Select/Checkbox + Callout | Accessible field composition | Add composable label/hint/error relationships and invalid state; no new form schema framework. Existing custom fields may consume a wrapper without losing native types. | R11 |
| Dialog | Modal mechanics | Complete containment, background interaction, scroll/focus restoration and translated naming before expanding use. Consent content stays owned by ConsentModal. | R06 |
| GuideLayout, GuidePlaybookToc, ModuleToc | Reading composition/navigation | Preserve guide presets and module-specific structure; share anchor/offset mechanics only where compatible. | R01, R12 optional |
| RouteStatusPanel / StaleBuildPanel | Route-level failure/recovery | Retain public/Hub/Portal variants and stale-build recovery. Do not route all errors to public Home or sign-out. | R05 |
| PortalPageLoading / PortalRetryCallout / Skeleton / EmptyState | Read-state presentation | Reuse semantics for initial-load failure; allow non-destructive refresh error within a loaded workspace. Do not reuse a page-level retry header inside a small section. | R05 |
| MfaCodeField / MfaJourneyShell | MFA entry/presentation | Share input mechanics with action challenges where code policy matches; preserve enrollment/recovery/challenge distinctions. | R04, R06 |

## Small missing compositions worth introducing

| Proposed contract | Inputs / owned behaviour | Explicitly does not own | First consumers |
|---|---|---|---|
| `WorkspaceHeader` | Title, scope summary, status, allowed action slots, optional return link; responsive order | Authorization, record fetching, visual hero design | DataWorkbench and PollsBoard, then selected Hub boards |
| `ActionFeedback` | Discriminated busy/success/error/uncertain result; live-region semantics; supplied recovery action | Retrying mutations, guessing completion, interpreting arbitrary API strings | Local exports and Data messages as separate adapters |
| `LoadState` composition | Loading vs empty vs no-match vs unavailable; retained-content refresh feedback | Permission rules, persistence or a global request cache | One board plus CircleWorkspace |
| `ActionChallenge` presentation | Operation summary, code input, submit/cancel, failed/limited/unavailable state, focus return | Tokens/grants, code caching, permission verification, common transaction order | Poll and RSVP exports before Data or administration |
| `WorkspaceTabs` behaviour | Tab IDs/panels, arrow/Home/End keys, roving focus, active-panel semantics | URL strategy, domain permissions, Circle shortcut mapping | ToolEditorLayout then Data/Circle adapters |
| `FieldFeedback` | Stable IDs, label/help/error association, aria-invalid, required/optional explanation | Validation schema or business rules | Data custom field form and existing shared input callers |

Each introduction needs at least two compatible consumers or a clear accessibility defect in the existing primitive. These names are not an instruction to add six new layers around every control.

## Share mechanics; keep domain adapters

Hosted download consolidation should have a caller supplying endpoint, frozen request arguments, filename fallback, supported response codes, and localized consequence text. The helper can manage busy state, parse structured outcomes, and await blob delivery. The API retains scope checks, MFA timing, audit ordering, record visibility and supported file formats. It must not cache authorization across operations or infer that all 428 responses mean the same thing without checking the contract.

Do not start by combining publication and download hooks. First extract the compatible Poll/RSVP download pair. Data publication, account-role mutation, provider publication, payroll sending and uncertain writes should initially share only the challenge field/presentation after their domain-specific contracts are documented.

Similarly, public draft storage and hosted mutations should share outcome presentation, not one persistence hook. `useStewardGuideDraft`, the brand store, `useHybridCaseStore`, and hosted adapters have different lifetimes and privacy obligations.

## Decomposition without feature merging

- Split CircleWorkspace by existing Circle tool and load/write state boundary. Keep circleWorkspaceTabs, membership decisions and existing shortcuts centrally coordinated.
- Split GrievanceDetail along intake, workflow, access/sharing, notes, attachments, communications and result sections. Keep current authorized projection and case lifecycle in control; do not turn every section into a new route.
- Split DataWorkbench along dataset creation/upload and selected import review. RecordsPanel and ReportsPanel already exist; reuse them. Do not rebuild them as part of a “workspace framework.”
- Share drawer focus/body-lock logic only after the shell contract is settled. Public, Hub and Portal link composition stays separate.

These are optional/touched-code extractions (R12), not mandatory pre-uplift file-size targets.

## Components that should not converge

CanvasWrapper, OfficePresetMock and WebsitePreviewFrame represent different rendering promises. PublicHubPanel and PortalPanel can later share visual tokens without becoming a single all-purpose panel. GrievanceAccessPanel is not a generic permissions widget. SourcesBlock is not a promotional related-links row. PublicDocumentsAdmin publication is not a generic upload form. HubContextSwitcher and Brand Kit preset selection must never become one “choose union” control.

## Migration rule

Introduce/extend → pilot with unchanged domain behaviour → verify desktop/mobile/EN/FR/failure/role variants → migrate compatible siblings → remove superseded path only after last consumer. Do not leave two competing canonical shells after a packet is declared complete. Preserve intentional exceptions in [09](09_DO_NOT_CHANGE.md) instead of accumulating undocumented component flags.
