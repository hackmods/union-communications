# Interaction pattern inventory and evidence

Source baseline `1cd62917`. “Observed” means inspected implementation, not browser-observed behaviour. File links below are repository-relative; symbol names identify the relevant implementation without pretending that source line numbers are permanent.

## Inventory

| Problem being solved | Existing solutions and observed behaviour | Canonical disposition |
|---|---|---|
| Global context | Locale Header/Footer; HubNav + HubBannerStack; PortalNav + notices [E01] | Three contextual shell modes sharing providers and account/locale controls; retain distinct menus |
| Page width/composition | PAGE_SHELL, PageShell, ComposedPageLayout, GuideLayout, ToolEditorLayout; local max-width/padding in Data [E03, E13] | One frame owner; archetype owns internal composition |
| Heading/action placement | Editor h1/subtitle/purpose/toolbar; guide header; PortalPanel header/actions; manual board headers [E05, E11, E14, E15] | Shared header slots, distinct orientation/task content; no mandatory hero |
| Discovering tasks | PublicCatalogExplorer, HubOfficerToolsCatalog, module registry, operator catalog [E02, E11] | Shared discovery semantics, separate public availability and authenticated authorization |
| Route normalization | public-routes map, Next redirects/rewrites, locale Link canonicalization [E02] | Retain existing ownership and permanent compatibility routes |
| In-page navigation | Guide TOCs, ModuleToc, editor tablist, Data tabs, Circle tabs/number shortcuts [E05, E10, E13, E15] | Separate link navigation, tabs, and value selection; share keyboard/panel contracts |
| Small mutually exclusive choices | SegControl radiogroup; ordinary select; custom preset buttons [E18] | Radio/segmented choice for values, not tabs; native select for larger lists where appropriate |
| Editing history | useUndoRedo + UndoRedoBar; draft hooks; domain-specific revision histories [E06, E08] | Keep local edit history distinct from durable record history |
| Reset/clear | Brand Kit native confirm; UndoRedoBar delegates reset; worksheet storage clear; import replacement confirms [E07, E08, E18] | Consequence-based policy; define exactly what resets and whether Undo can recover it |
| Save | Brand Kit autosave toast; local worksheet save-failed banner; explicit Hub mutations; apply/publish settings [E07, E08, E13, E17] | Four meanings: in-memory edit, device save, hosted save, publication. Never one unqualified “Saved” contract |
| Field composition | Shared Input/Textarea/Select; hand-built labels/inputs in Data and Circle forms [E13, E15, E18] | Shared label/hint/error linkage; keep domain schemas and validation rules local |
| Optional controls/help | ToolFormDetails, GuideExpandSection, native details, inline hints, purposeHint [E04, E05, E10] | Inline necessary help; disclosure for supporting material; guides retain long-form content |
| Brand setup | BrandSetupPrompt takes themeEstablished but always renders a warning; generator conditionally omits it [E06, E07, E09] | Unset identity prompt; established identity gets quiet access to settings |
| Preview | DOM capture canvas, MobilePreviewStage; OfficePresetMock; WebsitePreviewFrame; worksheet result [E05, E08, E09] | Share framing, never promise identical fidelity across renderers |
| Local output | useExportHandler; ToolExportActions; custom per-tool buttons; DocumentGenerator renderDownloadActions [E06, E09] | One action definition per output set; keep specialized formats |
| Hosted output | Poll/Expense/Meeting/Time/Travel challenge-and-resume code [E14] | Shared client request/feedback contract; domain API retains authorization and audit |
| Copy vs send | Alt Text clipboard state; InviteEmailPanel; hosted reminder/broadcast operations [E06, E09, E20] | Copy is not sending; retain separate external side-effect confirmation/outcome semantics |
| Fresh verification | Inline export code forms; Data publish form; Site Admin role and lifecycle forms; dedicated MFA journeys [E13, E14, E17] | Share field and challenge presentation; no shared privileged session or automatic replay |
| Initial loading | Route-level fallback, skeletons, plain paragraphs, PortalPageLoading [E12, E15, E19] | Archetype-compatible pending state with stable title/context where possible |
| Background refresh | useHubPoll; Circle whole-page retry on error; task refresh leaves data with error [E15, E20] | Distinguish initial failure from refresh failure; stale display only while authority remains valid |
| Empty result | EmptyState; inline empty paragraphs; Data empty arrays before initial load resolves [E12, E13, E14] | Distinguish no data, no matches, no selection, unavailable, locked, and denied |
| Mutation feedback | Callout; plain role=status/alert paragraphs; Data shared message; timed local save/output status [E07, E13, E14] | Action-scoped success/error/busy; persistent recoverable error and explicit uncertain outcome |
| Dialog/drawer | Dialog initial/return focus and Escape; three drawers separately trap Tab and lock body [E18] | Shared modal behaviour after fixing base contract; separate content and navigation models |
| Source/help relationships | SourcesBlock, GuideRelatedLinkList, ToolRelatedFooter, catalog related IDs [E04, E10] | Preserve source attribution; reconcile identical relationships, retain task-specific recommendations |
| Responsive strategy | Wide/read/focus tiers; mobile editor panes; nav drawer at xl; scrollable Circle strip and Data table [E01, E03, E05, E13, E15] | Contract by content/job, not universal breakpoint substitution |
| Error/not-found routing | RouteStatusPanel, stale-build recovery, localized Hub/Portal boundaries; inline detail fallbacks [E12, E19] | Shared result semantics with context-specific recovery destinations |

## Representative error/state differences

| Surface | Implementation fact | Implication / proposed verification |
|---|---|---|
| Image Resizer | `exportError` passed to ToolEditorLayout and rendered again inside form | Same event can render twice; keep one owner and verify one announcement |
| Mobile file handoff | `saveBlob` resolves both a shared and cancelled native share attempt; `useExportHandler` treats resolved completion as `Downloaded!` | Cancellation and delivered output are not distinguishable to this caller; preserve native sharing but make outcome reporting truthful |
| Expense output | `void downloadBlob(...)` before success; Poll output awaits it | Asynchronous save failure may bypass the expense handler; await before claiming its defined result |
| Data Workbench | `message` stores both caught errors and success, rendered `role="status"` in one treatment | Error needs its own semantic outcome and recovery; no confirmed-empty copy while loading |
| HubDraftSyncPanel | No surrounding catch/finally; informal logs posted sequentially | Network rejection can leave busy state; partial completion needs safe reconciliation before retry |
| Grievance detail | `if (loading)` paragraph; `if (!data)` not-found paragraph | Source does not establish why data is absent; review safe distinction among failure, scope denial, and missing record |
| CircleWorkspace | `if (error)` precedes rendering retained detail | Background failure hides loaded workspace; classify refresh failure without retaining newly unauthorized content |
| Circle route | Suspense fallback contains literal English `Loading…` | Confirmed localized-state inconsistency, not a wholesale translation audit |
| Dialog | No Tab containment/inertness in component | Fix before broader adoption; consent currently uses this component |

## Evidence index

### E01 — layered application shells

[Locale layout](../../src/app/[locale]/layout.tsx), [Hub layout](../../src/app/[locale]/app/layout.tsx), [Portal layout](../../src/app/[locale]/portal/layout.tsx), [Header](../../src/components/layout/Header.tsx), [Footer](../../src/components/layout/Footer.tsx), [HubNav](../../src/components/hub/HubNav.tsx), [HubBannerStack](../../src/components/hub/HubBannerStack.tsx).

Anchors: LocaleLayout's unconditional Header/main/Footer; Header's `--site-header-height`; AppLayout's PAGE_SHELL.wide; HubBannerStack's `dashboard` conditional; HubNav's measured sticky offset. Portal performs its own `requirePortalPage` check.

### E02 — canonical routes and discovery

[Route map](../../src/lib/seo/public-routes.ts), [Next configuration](../../next.config.ts), [locale navigation](../../src/i18n/navigation.tsx), [public nav](../../src/components/layout/nav/nav-config.ts), [HomeContent](../../src/components/pages/HomeContent.tsx), [catalog](../../src/lib/comms/public-catalog.ts), [explorer](../../src/components/comms/PublicCatalogExplorer.tsx), [query model](../../src/lib/comms/public-catalog-query.ts).

Anchors: canonicalPublicPath/canonicalizePublicHref; rewrites; Link wrapper only normalizes string hrefs; PUBLIC_PRIMARY_NAV; catalogState/writeStateToLocation and result filtering. A legacy string href is not by itself a broken link.

### E03 — composition and styling infrastructure

[PageShell](../../src/components/layout/PageShell.tsx), [shell constants](../../src/lib/constants/page-shell.ts), [ComposedPageLayout](../../src/components/layout/ComposedPageLayout.tsx), [composition presets](../../src/lib/constants/page-composition.ts), [global CSS](../../src/app/globals.css), [public type](../../src/lib/constants/public-type.ts).

Anchors: shell tiers and nested tiers; desktop rail/mobile placement contract; global text scaling, high contrast, reduced motion, and legacy `opseu-*` CSS aliases that currently map to platform colours. Token names alone do not prove privileged tenant behaviour.

### E04 — guide and tool context

[GuideLayout](../../src/components/comms/GuideLayout.tsx), [PublicCatalogItemLayout](../../src/components/comms/PublicCatalogItemLayout.tsx), [breadcrumbs](../../src/components/comms/PublicCatalogBreadcrumbs.tsx), [ToolRelatedFooter](../../src/components/tools/ToolRelatedFooter.tsx), [RelatedToolsStrip](../../src/components/tools/RelatedToolsStrip.tsx), [PublicHubPanel](../../src/components/comms/PublicHubPanel.tsx).

Anchors: GuideLayout preset resolution; breadcrumb plus `showBack`; RELATED_BY_TOOL and disabled-tool filtering. Catalog also has its own relatedItemIds: inspect intended relationship before combining.

### E05 — common editor and canvas

[ToolEditorLayout](../../src/components/tools/ToolEditorLayout.tsx), [MobilePreviewStage](../../src/components/tools/MobilePreviewStage.tsx), [Canvas Core exports](../../src/components/tools/canvas/index.tsx), [capture](../../src/lib/export/capture.ts), [Canvas Core spec](../modules/CANVAS_CORE.md).

Anchors: form/preview/previewSecondary/previewActions; isLg=1024; mobile tab IDs and panel relationships; no arrow-key handler on its two tab buttons; mini preview `top-14` and desktop `lg:top-4`. Canvas internals were inspected as a dependency boundary, not retested or re-audited for output fidelity.

### E06 — local editor outputs and examples

[Flyer](../../src/app/[locale]/tools/flyer-maker/page.tsx), [Graphic Maker](../../src/app/[locale]/tools/graphic-maker/page.tsx), [Resizer](../../src/app/[locale]/tools/resizer/page.tsx), [export hook](../../src/hooks/use-export-handler.ts), [output actions](../../src/components/tools/ToolExportActions.tsx), [image export](../../src/lib/export/image-export.ts), [saveBlob](../../src/lib/export/save-blob.ts), [Alt Text](../../src/app/[locale]/tools/alt-text/page.tsx).

Anchors: duplicated form/preview buttons; Resizer's two exportError render sites; runExport's boolean outcome and 3500 ms status; ToolExportActions fixed PNG-primary ordering; handleCopy's boolean clipboard result; saveBlob's shared-or-cancelled early return and installed-app protection against opening a new tab. Search found four page consumers of ToolExportActions (Board Notice, Quote Card, Pulse Poll, Org Chart); this is a source adoption count, not a behavioural defect count.

### E07 — Brand Kit and setup

[Brand Kit page](../../src/app/[locale]/brand-kit/page.tsx), [brand store](../../src/store/brand-store.ts), [save banner](../../src/components/brand/BrandKitSaveBanner.tsx), [setup prompt](../../src/components/tools/BrandSetupPrompt.tsx), [one-shot seed](../../src/hooks/use-one-shot-brand-seed.ts), [bridge lessons](../audit/session-knowledge-2026-09-25-union-brand-bridge.md), [latest customization disposition](../audit/session-knowledge-2026-09-30-wave-d-f-jk-fitgap.md).

Anchors: confirmReset, setBrandKit, applyUnionPresetId, storageBlocked/hasStoredBrandKit, 2200 ms successful-save status. BrandSetupPrompt always returns a warning Callout; themeEstablished changes its link destination.

### E08 — worksheets and explicit handoff

[RTW worksheet](../../src/app/[locale]/tools/rtw-accommodation/page.tsx), [draft hook](../../src/hooks/use-steward-guide-draft.ts), [HubDraftSyncPanel](../../src/components/tools/HubDraftSyncPanel.tsx), [Proposal Tracker](../../src/app/[locale]/tools/proposal-tracker/page.tsx), [governance specification](../modules/BYLAWS_PROPOSALS.md).

Anchors: useStewardGuideDraft hydration/debounce/saveFailed/clear; handleSync's per-kind endpoint and sequential informal-log loop; conditional session/module/role/local discovery. Source confirms the recovery gap, not an observed duplicate record incident.

### E09 — Office and website preview differences

[Document page](../../src/app/[locale]/tools/document-generator/page.tsx), [Letter page](../../src/app/[locale]/tools/letter-generator/page.tsx), [shared editor](../../src/components/tools/DocumentGeneratorEditor.tsx), [Website page](../../src/app/[locale]/tools/website-template/page.tsx), [WebsitePreviewFrame](../../src/components/tools/WebsitePreviewFrame.tsx).

Anchors: variants full/letters; renderDownloadActions; OfficePresetMock and previewHint; miniPreview=false; iframe srcdoc lifecycle and device widths. Keep optional existing website multi-page exports.

### E10 — learning

[ModuleViewer](../../src/components/officer-learning/ModuleViewer.tsx), [ModuleToc](../../src/components/officer-learning/ModuleToc.tsx), [ModuleQuiz](../../src/components/officer-learning/ModuleQuiz.tsx), [learning progress](../../src/lib/officer-learning/progress.ts), [LearningHubSyncPanel](../../src/components/officer-learning/LearningHubSyncPanel.tsx), [OlThemeProvider](../../src/components/officer-learning/OlThemeProvider.tsx), [SourcesBlock](../../src/components/comms/SourcesBlock.tsx).

Anchors: markModuleOpened/updateScrollDepth, progress/storage listeners, module-quiz anchor, single imported olTheme. Specialized source filtering and learning assessment remain outside generic page-shell logic.

### E11 — Hub discovery and roles

[Hub page](../../src/app/[locale]/app/page.tsx), [HubDashboard](../../src/components/hub/HubDashboard.tsx), [dashboard model](../../src/components/hub/hub-dashboard-model.ts), [tool catalog](../../src/components/hub/hub-tool-catalog.ts), [nav grouping](../../src/components/hub/hub-nav-model.ts), [module registry](../../src/lib/modules/registry.ts), [RBAC](../RBAC.md).

Anchors: shouldShowHubFeatureTeaser; resolveDashboardModel; live tenant/contextKey; resolveHubToolAccess; groupHubToolLinks retains leftovers in Other. Discovery is explicitly not API authorization.

### E12 — grievance record journey

[List route](../../src/app/[locale]/app/grievances/page.tsx), [detail route](../../src/app/[locale]/app/grievances/[id]/page.tsx), [GrievanceDashboard](../../src/components/grievance/GrievanceDashboard.tsx), [GrievanceDetail](../../src/components/grievance/GrievanceDetail.tsx), [hybrid hook](../../src/hooks/use-hybrid-case-store.ts).

Anchors: page session/MFA/module guards; list locked/error/empty branches; detail loading/notFound early returns, authorization-derived readOnly and GrievanceAccessPanel. Link containing Button occurs in dashboard navigation; use ButtonLink semantics in future migration.

### E13 — Data workflow

[Data route](../../src/app/[locale]/app/data/page.tsx), [DataWorkbench](../../src/components/hub/data/DataWorkbench.tsx), [RecordsPanel](../../src/components/hub/data/RecordsPanel.tsx), [ReportsPanel](../../src/components/hub/data/ReportsPanel.tsx), [current module specification](../modules/DATA_WORKBENCH.md).

Anchors: request/refresh/loadImport/saveMapping/decideRows/publish; default tab in React state; inner `main`; one message channel; initial datasets=[]; importSteps and publishImpact. Reports and structured people records already exist.

### E14 — hosted exports

[PollsBoard](../../src/components/hub/PollsBoard.tsx), [ExpensesBoard](../../src/components/hub/ExpensesBoard.tsx), [MeetingEventsBoard](../../src/components/meetings/MeetingEventsBoard.tsx), [TravelBoard](../../src/components/hub/TravelBoard.tsx), [TimeDashboard](../../src/components/time/TimeDashboard.tsx), [poll export API](../../src/app/api/polls/id/[id]/export/route.ts).

Anchors: handleExport/pendingExport/exportMfaCode/exportChallengeError; await vs void downloadBlob; 428 response; requirePollsSession/assertPollView/verifyFreshMfaStepUp before aggregates, correlated audit. Other domain APIs must be re-read before migrating their callers.

### E15 — Portal collaboration

[Circle page](../../src/app/[locale]/portal/circles/[id]/page.tsx), [CircleWorkspace](../../src/components/portal/CircleWorkspace.tsx), [Portal nav model](../../src/components/portal/portal-nav-model.ts), [PortalPanel](../../src/components/portal/PortalPanel.tsx), [PortalRetryCallout](../../src/components/portal/PortalRetryCallout.tsx), [PortalPageLoading](../../src/components/portal/PortalPageLoading.tsx).

Anchors: selectTab replaceState; circleWorkspaceTabs and activeTab fallback; numeric key handler; early load error return; role=tab buttons; circleHrefForDispatch. Retain existing member-safe projections and vocabulary in LOCAL_PORTAL.

### E16 — public participation

[RSVP page](../../src/app/[locale]/r/[token]/page.tsx), [PublicRsvpForm](../../src/components/meetings/PublicRsvpForm.tsx), [Platform page](../../src/app/[locale]/platform/page.tsx).

Anchors: resolvePublicToken/notFound/noIndex; PageShell focus; purpose/privacy fields; Platform's different join/request-access links. Do not turn token participation into a Portal membership flow.

### E17 — administrative changes

[EditRolesForm](../../src/components/site-admin/EditRolesForm.tsx), [AssignLocalForm](../../src/components/site-admin/AssignLocalForm.tsx), [BrandStylesAdminForm](../../src/components/site-admin/BrandStylesAdminForm.tsx), [MFA code field](../../src/components/hub/mfa/MfaCodeField.tsx), [role-change lessons](../audit/session-knowledge-2026-09-27-role-change-step-up.md).

Anchors: roles/busy/mfaCode/stepUpRequired, response-code handling, router.refresh, fieldset disabled while busy. These are client contracts, not permission to change fresh MFA, grants, or account authority APIs.

### E18 — shared controls and overlays

[Input/Textarea](../../src/components/ui/Input.tsx), [Select](../../src/components/ui/Select.tsx), [Dialog](../../src/components/ui/Dialog.tsx), [ConsentModal](../../src/components/tools/ConsentModal.tsx), [SegControl](../../src/components/tools/SegControl.tsx), [UndoRedoBar](../../src/components/tools/UndoRedoBar.tsx), [public drawer](../../src/components/layout/nav/MobileNavDrawer.tsx), [Hub drawer](../../src/components/hub/HubNavDrawer.tsx), [Portal drawer](../../src/components/portal/PortalNavDrawer.tsx).

Anchors: Input label/id generation without built-in hint/error slots; Dialog key handler handles Escape only; drawers' duplicated body locking/Tab containment; SegControl arrow handling; UndoRedoBar delegates reset consequences.

### E19 — page states and public documents

[RouteStatusPanel](../../src/components/layout/RouteStatusPanel.tsx), [Hub error](../../src/app/[locale]/app/error.tsx), [Portal error](../../src/app/[locale]/portal/error.tsx), [public document page](../../src/app/[locale]/documents/[slug]/page.tsx), [PublicDocumentsAdmin](../../src/components/site-admin/PublicDocumentsAdmin.tsx).

Anchors: contextual error routes and stale-build handling; published/unpublished document lookup, DraftNotice, policy-specific content. Managed Documents exists in this baseline despite an older instruction note saying it was absent.

### E20 — asynchronous work and copy

[TaskBoard](../../src/components/hub/TaskBoard.tsx), [useHubPoll](../../src/components/hub/useHubPoll.ts), [InviteEmailPanel](../../src/components/tools/InviteEmailPanel.tsx), [StartContent](../../src/components/pages/StartContent.tsx).

Anchors: TaskBoard initial load vs refresh, catch suppression around polling, mutation fetches; useHubPoll visibility handling; Start browser storage and URL path state. Do not consolidate polling by silently adding a new background-sync system.

## Verification assets already available

Existing suites include [public discovery](../../e2e/public-discovery.smoke.spec.ts), [Hub dashboard](../../e2e/hub.dashboard.spec.ts), [Hub composition](../../e2e/hub.composition.spec.ts), [Hub mobile](../../e2e/hub.mobile.spec.ts), [Portal mobile](../../e2e/portal.mobile.spec.ts), [Hub accessibility](../../e2e/hub.a11y.spec.ts), [tool layout matrix](../../e2e/tools.layout-matrix.smoke.spec.ts), [export fidelity](../../e2e/tools.export.fidelity.spec.ts), [export smoke](../../e2e/tools.export.smoke.spec.ts), and [Brand Kit layout](../../e2e/brand-kit.layout.smoke.spec.ts). These are starting points for future validation, not tests executed by this audit. Automated overflow/axe checks do not establish full keyboard or screen-reader usability.
