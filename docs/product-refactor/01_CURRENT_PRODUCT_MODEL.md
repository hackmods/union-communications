# Current product model

Baseline `1cd62917`, 2026-09-30. Paths below omit the `/en` or `/fr` prefix. Canonical paths are distinguished from their implementation folders. Evidence identifiers resolve in [03](03_INTERACTION_PATTERN_INVENTORY.md).

## Product boundaries

| Area | User job | Current structure and storage | Boundary to preserve |
|---|---|---|---|
| Home / Platform / Guided setup | Understand the offer and choose a task | Home presents Brand Kit as a foundation with parallel Create/Worksheets/Learn destinations and a separate Platform band; Start checklists retain browser-local progress | An orientation choice is not an account, permission, or tenant assignment |
| Brand Kit | Establish reusable presentation identity | Zustand brand store, adapter persistence, hydration/save feedback, optional published baseline application | Public identity cannot change the signed-in union or authorize Hub access |
| Create | Produce communications artifacts | Catalog → editor → PNG/PDF/Office/ZIP/copy output; storage varies by tool | A preview, a local draft, and a downloaded file are different results |
| Worksheets (`/utilities`) | Prepare steward work privately | Local drafts, structured prompts, scripts, text/PDF exports; selected explicit Hub handoffs | Hosted casework remains a separate authorized action |
| Learn / Library | Read, train, find reference material | Catalog, GuideLayout, Officer Learning progress/quizzes, sources, public document records | Completion does not confer a Hub role or professional certification |
| Officer Hub | Act on local operational records | Authenticated module routes, role/module discovery, local context, case/board workspaces, APIs/adapters | Authority is domain- and relationship-specific, not a universal role ladder |
| Local Portal | Participate in a local or invited Circle | Together, Circles, Dispatch, Sidebars, member-safe cases/proposals | Circle participation does not grant confidential Hub access |
| Site Admin / union configuration | Operate host or configure permitted organization scope | Operator menu, administrative forms, publication/lifecycle workflows | Host, union, local, and personal settings have different authorities |

The existing feature set includes dashboards, learning progress, starred Circles, and Dispatch. They are intentional existing capabilities; this audit proposes no new favourites, analytics, dashboards, or notification product.

## Application composition

The locale layout owns locale messages, authentication, branding, preferences, the skip link, public Header, `main#main-content`, and Footer. Hub layout adds MFA policy/enrollment gating, tenant live context, banners, HubNav, and a padded wide body. Portal layout checks access and adds its tenant context, notices, PortalNav, and wide body. Public tools and guide layouts add catalog breadcrumbs. [E01–E04]

This is one application with layered contexts, not three isolated applications. Shared providers are useful; sharing every navigation layer is not required. Header measurement feeds `--site-header-height`; HubBannerStack adds another measured variable. Other sticky elements still use constants. This is the basis for shell consolidation, not evidence that every viewport currently overlaps.

## Route-family census and coverage

195 implementation pages were enumerated with `rg --files src/app`, normalized to slash paths, and grouped by their actual route directory. API routes, layouts, errors, and loading files are excluded from this count. Each dynamic page counts once. Rewrites were read before assigning public families.

| Census group | Files | Coverage in this audit |
|---|---:|---|
| `tools/*` | 30 | Census plus representative editor, utility, Office, website, and draft-transfer traces |
| `guide/*` | 30 | Census plus shared layouts, running-meetings family, Officer Learning viewer/progress |
| `app/*` excluding Site Admin | 60 | Census plus Hub discovery, casework, Data, boards, exports, authentication gates |
| `app/site-admin/*` | 24 | Census plus menu/configuration structure, role-change form, brand and document boundaries |
| `portal/*` | 8 | All route names; layout/access and Circle interaction implementation traced |
| Other public/root | 43 | Public discovery, Brand Kit, Start, Platform, public documents, token RSVP, status/shell inspection |

The census is broad; behavioural tracing is representative, not exhaustive. No claim is made that every action on all 195 pages has been verified.

## Representative journeys traced through implementation

### J01 — discover and make a flyer

`/create` rewrites to the tools index, which uses PublicCatalogExplorer. Filters and search operate on the public catalog; URL state supports history restoration. Its localized Link normalizes legacy `/tools/*` targets to canonical `/create/*` paths. The flyer page hydrates Brand Kit, applies a one-shot seed and optional preset/example, and uses undo/redo state. It passes controls, canvas preview, toolbar, related links, and export status to ToolEditorLayout. PNG/PDF handlers call the shared capture/export services through `useExportHandler`. Mobile has Edit/Preview, mini preview, and repeated output actions. [E02, E04, E05, E06]

**Finding:** the core journey is shared and coherent. The page still repeats output buttons in two locations; its BrandSetupPrompt remains present even with an established theme. Do not replace the canvas engine or remove output options.

### J02 — establish Brand Kit and reuse it

`/create/brand-kit` rewrites to the Brand Kit page. `setBrandKit` updates the shared store; preset application explicitly persists promptly. Hydration and storage-blocked states are exposed; BrandKitSaveBanner announces a successful save. Reset uses a native confirmation. PublicHubPanel groups identity, style, links, and other settings; a sticky preview is separate from those settings. Creator tools consume a one-shot seed rather than continuously overwriting edits. Published organization baselines remain an explicit Apply operation. [E07]

**Finding:** autosaving shared presentation settings is intentional. Do not impose an explicit Save button because hosted settings use one. Make the persistence scope and failed save state consistent with other local-draft surfaces.

### J03 — worksheet to letter or hosted record

`/utilities/rtw-accommodation` reaches the existing tools implementation. `useStewardGuideDraft` loads once, debounce-saves, reports save failure, and clears stored state. Structured suggestions and scripts are preview content; letter handoff saves context and navigates to Letter Generator. Bylaw Builder, Proposal Tracker, and Steward Quick Log use HubDraftSyncPanel for selected hosted copies. The panel checks session, module, role, and local context before posting; the receiving API remains authoritative. [E08]

**Finding:** related functions across public and hosted surfaces are not redundant. The handoff currently performs sequential informal-log creates and has no surrounding fetch rejection handler; partial completion can be followed by an ambiguous retry. Preserve the boundary, improve its outcome contract.

### J04 — generate a letter or Office pack

Letter Generator returns `DocumentGeneratorEditor variant="letters"`; Document Generator returns the same editor with `variant="full"`. Preset metadata determines fields and supported outputs. `renderDownloadActions()` supplies both form and mobile preview actions. OfficePresetMock and explanatory copy provide an illustrative preview; `miniPreview={false}` avoids pretending this is a live raster canvas. [E09]

**Finding:** a successful consolidation already exists. Keep the separate letter entry point and the wider Office catalog. Do not require a new preview-rendering service as part of this refactor.

### J05 — read and complete Officer Learning

`/learn/officer/:slug` rewrites to the module route. ModuleViewer renders parsed sections, ModuleToc, related resources, sources, and ModuleQuiz. It records opening/scroll progress locally and responds to progress/storage events. The learning dashboard and optional LearningHubSyncPanel sit around that local learning model; hosted OfficerLearningHubBoard is a distinct record surface. [E10]

**Finding:** learning adds progression and assessment to reading. A guide TOC and a module TOC can share mechanics without stripping module semantics. The single olTheme provider is not evidence of a still-existing second dark application.

### J06 — Hub entry to confidential casework

`/app` checks session and member landing policy before HubDashboard. Dashboard derives visible modules and attention from roles, enabled modules, MFA, and live tenant context; operator accounts get an operator entry point. `/app/grievances` checks session, MFA, module access, and enabled status before GrievanceDashboard. Its hybrid hook distinguishes locked local data from hosted/local lists. Detail loads its authorized projection, distinguishes write authority, and exposes intake, workflow, notes, attachments, member sharing, and outputs. [E11, E12]

**Finding:** keep the home task orientation and case-specific permissions. List loading/error/locked states are much richer than detail's loading/not-found paragraphs. Do not disguise unavailable or unauthorized information as an empty case list.

### J07 — import, review, and publish Data

`/app/data` calls `requireDataAccess`; unauthenticated/MFA/forbidden cases follow separate branches. DataWorkbench loads datasets and imports, creates a dataset, uploads a file, loads import detail, saves mapping, marks rows accepted/excluded, and publishes after a fresh challenge where required. Map/review/publish labels, active-local disclosure, impact summary, RecordsPanel, PersonProfilePanel, and ReportsPanel already exist. [E13]

**Finding:** do not plan those shipped features again. Structural residuals are tab/state ownership, nested frame/landmark, and differentiated feedback. Durable async jobs and retention are existing domain/launch backlog, not prerequisites to redesigning the visual form of this workspace.

### J08 — download hosted poll results

PollsBoard stores the chosen poll, format, and title on a 428 challenge, presents an inline code form, and resumes the POST. The API checks session and scope, verifies fresh MFA before aggregate reads, creates the requested file, and requires audit evidence before delivering bytes. PollsBoard awaits `downloadBlob`; ExpensesBoard calls the same helper with `void` and immediately announces export. Meetings and Time have parallel challenge implementations. [E14]

**Finding:** share presentation and client outcome mechanics, not an all-purpose security policy. Data publication and role changes have materially different consequences from downloading a report.

### J09 — Together / Dispatch into a Circle

Portal layout and Circle page require Portal access. `circleHrefForDispatch` maps a dispatch kind to the relevant Circle tab. CircleWorkspace reads `?tab=`, validates it against visible tabs, and writes selection with `replaceState`. It loads authorized detail, polls on focus/interval, and has reusable loading/retry states. Membership determines write/admin behaviour; Hall hides optional empty tools while other Circle kinds expose them. It also offers number shortcuts outside form fields. [E15]

**Finding:** retain Circle-specific tools, ordering, and naming. The tab markup lacks panel relationships and roving arrow-key handling; number shortcuts are additional behaviour, not a replacement for a tab contract. A refresh failure replaces the entire workspace with a retry panel even if detail has already loaded.

### J10 — participation and administration are different tasks

`/r/:token` resolves a public meeting token, returns not-found when absent, and presents a focused RSVP form with purpose/privacy copy and completion states. It is not Portal enrollment. Separately, Site Admin account support embeds EditRolesForm: the selected roles are sent to the scoped API, a challenge is requested when needed, codes/errors are handled, and success triggers router refresh. [E16, E17]

**Finding:** these both use forms, but require different contexts and consequences. Share field/action feedback; retain token expiry semantics, scoped authority, and fresh verification.

## Progressively quieter: current assessment

| Transition | Effective today | Residual |
|---|---|---|
| Orientation → discovery | Home's Brand Kit foundation and parallel destinations; Platform explains hosted areas; catalog explains deliverables and storage | Preserve direct Brand Kit access; validate navigation wording with users rather than rename again |
| Discovery → task | Catalog breadcrumbs and editor shell already exist | Breadcrumb plus back link plus intro/purpose/nudge can crowd entry; prioritize task and conditional guidance |
| Task → workspace | Hub home is task-first; per-domain permissions and local context are visible | Public navigation remains layered over operational navigation; notice treatment becomes louder deeper in Hub |
| Workspace → result | Local exports, explicit saves, and member-safe projections exist | Outcomes vary in location, duration, error classification, and what “success” actually proves |

No task-time reduction is asserted without user testing. The structural recommendation is to reduce repeated explanation while keeping scope, safety, and next actions visible.
