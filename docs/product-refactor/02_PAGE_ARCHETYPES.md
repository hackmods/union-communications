# Page archetypes

Seven archetypes describe the implementation without forcing dissimilar jobs into one template. Archetype describes the page's dominant job; shell describes its product context. A catalog card linking to an editor does not make the editor a catalog. A form inside a case record does not make the entire case a focused form.

The contracts below are **targets inferred from existing mechanisms**, not a claim that every current page already complies. Shared component names marked “proposed” are contracts to implement only in the later refactor.

## A1 — Orientation

- **Purpose:** explain UnionOps, its boundaries, and the appropriate starting point.
- **Structure:** title and concise premise → explicit task sequence or audience choices → evidence/example → trust/support links. Allow narrative and persuasion here.
- **Canonical interactions:** choose an existing destination; optional existing Start checklist. No compulsory tour or new account gate for public tools.
- **Actions:** one dominant next action per decision region; alternatives explain a different audience/job, not duplicate the same destination.
- **Responsive behaviour:** preserve explanatory order as sections stack; no sticky task toolbar.
- **Navigation/help:** public navigation and footer; inline explanation is the content, not a collapsible afterthought.
- **States:** public content should render without client readiness; browser-local checklist readiness must wait for hydration and acknowledge blocked storage.
- **Shared components:** PageShell, ComposedPageLayout, ButtonLink, PublicHubPanel, existing HomeContent/StartContent.
- **Current pages:** `/`, `/platform`, `/start`, `/manifesto`, `/install`, `/trust`; support landing where informational.
- **Justified exceptions:** Start retains lightweight progress because it already coordinates existing paths. Platform may present different access CTAs under the public-Hub feature gate. Neither is an operational dashboard.

## A2 — Discovery/catalog

- **Purpose:** find an existing tool, guide, asset, or document with enough information to choose it.
- **Structure:** title/scope → curated starting points where useful → search/filter controls → result count and removable filters → result list → no-results recovery.
- **Canonical interactions:** filter, search, clear a filter, open an item, return with discovery context intact. Distinguish zero matches from failed loading.
- **Actions:** opening an item is primary; clear filters and alternate scope are secondary. Avoid multiple competing actions inside one catalog card.
- **Responsive behaviour:** filters wrap/stack; results retain title, job, deliverable, and storage information. Do not require a horizontal card carousel.
- **Navigation/help:** public category/breadcrumb model; specialized Hub catalogs inherit Hub navigation. Explain filters adjacent to controls, not in another tour.
- **States:** catalog hydration, unavailable/disabled entries, no matches, document availability; preserve URL query and browser Back behaviour for public catalog.
- **Shared components:** PublicCatalogExplorer, catalog/query registry, PublicCatalogBreadcrumbs; preserve specialized Documents and Hub catalogs with common item semantics rather than merge their data models.
- **Current pages:** `/create`, `/utilities`, `/learn`, `/search`, `/learn/library`, `/documents`, asset/examples/caption libraries; discovery regions of `/app` and `/app/site-admin`.
- **Justified exceptions:** protected records are A6, even if searchable. Public document publication/availability comes from managed document rules, not a generic catalog visibility flag.

## A3 — Reading and learning

- **Purpose:** understand a topic, use a reference, or complete an authored learning module.
- **Structure:** title/short premise → optional TOC → constrained reading body with figures/references → related action. Learning variant adds module progress, assessment, and next module.
- **Canonical interactions:** follow section anchors, expand supporting material, follow sources, print/download an existing reference; learning uses its existing quiz/completion logic.
- **Actions:** reading is primary; an applicable worksheet or next module is the contextual next step. Related links belong after content or in a deliberate rail, not repeated throughout without purpose.
- **Responsive behaviour:** readable measure; desktop TOC rail becomes in-flow mobile outline; diagrams can span wider without widening every paragraph.
- **Navigation/help:** GuideLayout narrow/playbook presets; module TOC and learning sequence remain specialized. The article itself is help; do not place it behind a help modal.
- **States:** missing content, unavailable source/download, local learning-progress storage failure, quiz result; published/draft policy status is explicit.
- **Shared components:** GuideLayout, GuideSection/Surfaces, GuidePlaybookToc, SourcesBlock, ModuleViewer/ModuleToc/ModuleQuiz.
- **Current pages:** `/learn/running-meetings`, `/learn/right-to-refuse`, `/learn/communications-blueprint`, other guide chapters, `/learn/officer/:slug`, readable `/documents/:slug`, legal content.
- **Justified exceptions:** an Officer Learning module is not merely prose; managed policy publication and acceptance cannot be reduced to ordinary guide metadata. GuideLayout's `hub` preset is an A2 composition, not a fourth reading mode.

## A4 — Focused task/form

- **Purpose:** finish one bounded operation or derive one answer without maintaining a workspace.
- **Structure:** purpose/context → inputs → validation/constraints → action → result or next step.
- **Canonical interactions:** enter/choose, submit or copy, correct errors without losing input, cancel/back safely. Short utilities can update results live without a submit step.
- **Actions:** explicit primary verb naming the result; secondary cancel/back/copy as appropriate. Reset only when meaningful and with its scope stated.
- **Responsive behaviour:** one reading-width form; labels, hints, and errors stay with inputs; no arbitrary editor mini preview for a plain result.
- **Navigation/help:** lightweight return path; field help and consequence copy where decisions occur. Auth/token tasks need only context-relevant navigation.
- **States:** submitting, field validation, transport failure, expired/invalid token, duplicate/already-completed operation, confirmed outcome. MFA enrollment and challenge retain their specialized states.
- **Shared components:** Input/Textarea/Select/Checkbox, Callout, MfaJourneyShell/MfaCodeField; proposed FieldFeedback and ActionFeedback contracts.
- **Current pages:** login/forgot/reset/invite/MFA routes, `/r/:token`, `/poll/:slug`, `/request-access`, feedback and email preference forms; `/create/alt-text` as a live-result utility.
- **Justified exceptions:** a token route is public but must not become a discovery landing. Photo consent and fresh security challenge cannot be replaced by generic “Are you sure?” dialogs.

## A5 — Editor/builder

- **Purpose:** iteratively author an artifact or structured draft and inspect the result.
- **Structure:** compact title/context → necessary preset/identity choice → controls and preview/result → output actions → optional help/related tasks.
- **Canonical interactions:** edit, inspect, undo/redo where supported, clear/reset with known scope, copy/download, explicitly transfer to Hub where already supported.
- **Actions:** output is primary; edit history and settings are secondary. The same action definition supplies form and mobile preview locations. Download is not Save to Hub.
- **Responsive behaviour:** desktop control/preview split; mobile Edit/Preview for complex paired views; scaled fixed-dimension canvases stay mounted and capturable. Text worksheets may prefer stacked result sections. Office mini preview remains off where appropriate.
- **Navigation/help:** catalog breadcrumb plus concise return; tool-specific help near the relevant control; optional advanced sections through ToolFormDetails. Setup prompt only when setup is missing or relevant.
- **States:** hydration, ephemeral vs retained draft, storage failure, incomplete source, output busy/failure/success, upload consent, unsaved replacement/import.
- **Shared components:** ToolEditorLayout, CanvasWrapper/LogoContainer, MobilePreviewStage, ToolFormDetails, ToolExportActions, useExportHandler, UndoRedoBar. Domain renderers remain separate.
- **Current pages:** `/create/flyer-maker`, graphic-maker, quote-card, board family, resizer, org-chart, website-template, document/letter-generator; structured `/utilities/*` builders and worksheets.
- **Justified exceptions:** raster canvas, Office mock, generated website iframe, and text/script result are distinct preview contracts. A worksheet never needs a decorative canvas just to fit the shell.

## A6 — Operational workspace

- **Purpose:** inspect and act on ongoing, scoped work and its records.
- **Structure:** identity/scope and title → current task/status and allowed actions → record list/detail, review stages, or collaboration sections → contextual activity/history.
- **Canonical interactions:** filter/select, open detail, change domain state, save/publish, attach/share under policy, export with fresh verification where required. Existing polling must preserve useful context during refresh.
- **Actions:** primary action follows the record's lifecycle; related operations stay with their record/section. Bulk actions name selection scope. No global Save for unrelated forms.
- **Responsive behaviour:** actionable summaries before dense detail; maintain information relationships; wide comparison tables may scroll in their own region. Preserve mobile steward read-only behaviour independently of width styling.
- **Navigation/help:** Hub or Portal navigation, scoped context switcher, record return path; stable task tabs/anchors where already needed. Help explains domain decisions and permissions, not the whole product again.
- **States:** initial load, refreshing/stale, empty, filtered-empty, denied/not-found, module disabled, MFA required, local slice locked, partial/uncertain mutation outcome, conflict/reload where supported.
- **Shared components:** Hub/Portal navigation and context models, ModuleDisabledPanel, PortalPageLoading/RetryCallout, useHubPoll; proposed WorkspaceHeader/LoadState composition. No universal CRUD controller.
- **Current pages:** `/app/grievances`, bumping, tasks, checkins, discussions, meetings/minutes, time, expenses/travel/ledger, polls, bylaws/proposals, data, documents; Portal Together/Circles/Dispatch/Sidebars/My Cases/Proposals.
- **Justified exceptions:** case dossiers, staged imports, boards, and collaboration use different workspace compositions. Member-safe projections cannot reuse confidential detail renderers by simply hiding controls.

## A7 — Configuration and administration

- **Purpose:** change durable defaults, scope, membership/authority, or operating policy rather than produce an artifact.
- **Structure:** explicit owner/scope → grouped settings with current value → consequence and prerequisites → save/apply/publish controls → acknowledged outcome.
- **Canonical interactions:** edit/save or intentional autosave; apply baseline; import/export configuration; challenge, review, or confirm only according to the action's real consequence.
- **Actions:** explicit save/apply/publish for hosted consequential changes; local Brand Kit keeps autosave. Destructive/lifecycle actions are separated from ordinary settings and retain exact target context.
- **Responsive behaviour:** sections stack while scope remains discoverable; save feedback stays attached to the changed section; no second horizontal shell padding inside Hub.
- **Navigation/help:** public Brand Kit, personal settings, local configuration, union admin, and Site Admin each retain their actual parent context. Explain inheritance/override and authority locally.
- **States:** loading current values, dirty/saving/saved, local storage blocked, validation/permission failure, fresh challenge, publication review, uncertain write requiring reload.
- **Shared components:** PublicHubPanel, brand editors, SiteAdminCard, existing settings forms, MFA field; proposed shared field/action feedback. APIs and domain validation remain owners of truth.
- **Current pages:** `/create/brand-kit`, `/app/profile`, `/app/configuration`, `/app/settings/tenant`, `/app/organization`, `/app/onboarding`, `/app/union-brand`, Site Admin brand-styles/host/account-support/organization/public-tools/documents/subprocessors and related controls.
- **Justified exceptions:** Brand Kit is a local presentation workspace; assigning a local or publishing a provider is a hosted authority change. They share form semantics, not a persistence or confirmation policy.

## Why not fewer?

Merging A1 with A2 confuses explanation with selection. Merging A4 with A5 forces preview/history chrome on simple tasks. Merging A5 with A6 hides the difference between producing a file and changing an authoritative record. Merging A7 into either loses settings scope, inheritance, and publication consequences. Further implementation sharing is welcome when it preserves these distinctions.
