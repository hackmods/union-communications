# Product refactor implementation log

**Historical source-worktree record:** This file was recovered from worktree `764b`. Not every pilot below was imported. Use [13 — recovered uplift baseline](13_UPLIFT_BASELINE.md) as the current branch's implementation record.

Updated 2026-10-01. This log tracks implementation against the ordered packets in [11_SPRINT_EXECUTION_PLAN.md](11_SPRINT_EXECUTION_PLAN.md). “Implemented” means source changes exist; it does not imply runtime validation.

## Baseline and contracts

| Enhancement | Status | Evidence / remaining work |
|---|---|---|
| ENH-01 | Source baseline recorded; runtime evidence pending | Audit inventory and representative journey traces are in documents 01–04 and 07. Source revision was `1cd62917`; source paths were rechecked before implementation. Runtime journeys, keyboard walkthroughs, screenshots and role-specific live states remain unverified because dependencies/browser evidence are unavailable in this pass. Do not treat source inference as reproduced behavior. |
| ENH-02 | Route modes implemented; full owner map pending | `shellContextForPath` and the shared desktop/mobile header map routes to public, public-task, Hub, or Portal chrome. Full landmark/header/action ownership remains under review because many route pages render their own `<main>` inside the locale layout's `<main>`. |
| ENH-03 | Pilot ledger recorded; full migration inventory pending | The table below records every direct consumer in the first implementation packets. Later field, output, state, workspace-recovery and challenge packets still need their own finite consumer lists before adoption. |

### ENH-02 route contract currently in source

| Route context | Route match | Primary navigation | Persistent shell behavior |
|---|---|---|---|
| Public orientation/discovery | Default localized routes, including catalog, guides, search, Start and Platform | Full public primary navigation and Search | Brand, locale, display, account and correctly gated Hub/Portal links remain; shared public footer remains. |
| Public task | `/tools/*`, maker paths under `/create/*`, known worksheet paths under `/utilities/*`, `/create/brand-kit`, `/login`, and focused public forms/participation under `/request-access`, `/email-preferences`, `/feedback`, `/join`, `/meetings`, `/outreach`, `/poll`, `/r`, and `/captions` | Brand Kit plus Create and Worksheets return paths; Search is omitted | Wordmark, locale, display, account and gated service links remain. Task-specific content, setup and help remain in page composition. |
| Officer Hub | `/app` and descendants | Direct Brand Kit escape and role/module-gated Hub/Portal cross-navigation | Hub context/scope navigation and current notices remain owned by Hub layout; authentication and MFA checks are unchanged. |
| Local Portal | `/portal` and descendants | Direct Brand Kit escape and role/module-gated Hub/Portal cross-navigation | Portal menus and off-state teaser remain owned by Portal layout; member/officer scope checks are unchanged. |

`LocaleLayout` currently owns the global `main#main-content`; route content should not add nested main landmarks. Hub layout owns its padded outer frame and notice/navigation layers. Public task pages retain their existing page composition and renderers. Portal-off and access-denied routes keep their existing domain decision and copy.

### Direct consumer ledger for implemented packets

| Pattern | Direct consumers found | Assigned packet / treatment |
|---|---|---|
| Shared `Dialog` | `ConsentModal`, `RouteStatusPanel` | ENH-04 pilot; preserve consent and status content. `BrandContrastConfirmDialog` remains a separate domain dialog until its own behavior is audited. |
| Editor Edit/Preview tabs | `ToolEditorLayout`, consumed by the route pages under `src/app/[locale]/tools/*` and the website template | ENH-05 pilot; keep editor and capture trees mounted. |
| Workspace tabs | `DataWorkbench`, `CircleWorkspace` | ENH-05 pilots; retain Data publication challenge and Circle role/module visibility rules. |
| Route CTAs nested as Link→Button | Three confirmed actions in `GrievanceDashboard` | ENH-06; replace with existing `ButtonLink`. Card-link patterns stay unchanged. |
| Measured sticky bars | Header, HubBannerStack, HubNav, PortalNav | ENH-08; all four use `observeStickyHeight`. Consumers updated: Circle tabs/anchors, editor mini-preview, President Configuration rail, and composed reading rail. |
| Workspace title/context/actions | Data, PollsBoard | ENH-09 pilot; `WorkspaceHeader` owns one title, context and action structure across loading/data states. |
| Data outer landmark/frame | Data access-failure branch and `DataWorkbench` root | ENH-09 pilot; use the locale main landmark and Hub outer frame. Other Hub routes still need an inventory before broader adoption. |
| Data list read states | `DataWorkbench` initial datasets/imports request | ENH-11 pilot; only show no-data content after a successful read, and offer retry after an initial failure. |
| Circle refresh recovery | `CircleWorkspace` detail reads | ENH-12 pilot; retain loaded content after transient failure and clear it on 401/403/404. |
| Shared field associations | `Input`, `Textarea`, `Select`; Data custom-field controls | ENH-10 foundation; shared controls accept hint/error associations; Data custom-field name/type controls now have associated names. |

## Sprint 1 — accessible interaction foundations

| Enhancement | Status | Source changes | Evidence / remaining work |
|---|---|---|---|
| ENH-04 | Implemented; verification pending | `src/components/ui/Dialog.tsx`: Tab focus containment, inert background siblings along the containing branch, body scroll lock, Escape close and focus restoration. | Preserve ConsentModal and RouteStatusPanel content. Component tests and keyboard/zoom review have not run. |
| ENH-05 | Implemented for named pilots; verification pending | `src/lib/utils/tab-keyboard.ts`; ToolEditorLayout, DataWorkbench and CircleWorkspace now link tab/panel IDs and support arrows/Home/End with roving tab focus. | Canvas preview remains mounted in ToolEditorLayout; Data/Circle content remains parent-state-owned. Verify editor capture, Circle visibility fallbacks, focus, and dynamic tab changes. |
| ENH-06 | Implemented for confirmed grievance actions; verification pending | `src/components/grievance/GrievanceDashboard.tsx` uses ButtonLink for three route CTAs that previously nested Button inside Link. | Locale-aware links remain. Static/browser checks have not run. Other link-card patterns were not altered. |

## Sprint 2 — shells and page structure

| Enhancement | Status | Source changes | Evidence / remaining work |
|---|---|---|---|
| ENH-07 | Implemented at global-header composition level; route review pending | `shellContextForPath` and `primaryNavForContext` constrain public primary navigation by route context in Header and MobileNavDrawer. Hub/Portal menus, gated service links, direct Brand Kit access, wordmark escape, locale, display and account controls remain. | Validate public discovery, public tools, `/create/brand-kit`, public login, `/app`, `/portal`, Portal-off, mobile menu and role/feature variants. Footer remains global pending route review. No provider tree or authorization changed. |
| ENH-08 | Implemented for audited sticky consumers; verification pending | Shared `observeStickyHeight` publishes the measured Header, Hub banner, Hub nav and Portal nav heights. Circle tabs/anchor offset, ToolEditor mini preview, President Configuration rail and composed reading rail consume the measured values. | Verify expanded banners, 320/390/768/1024/1280+ widths and display text scaling. No exported canvas geometry changed. |
| ENH-09 | Data and PollsBoard pilots implemented; route-wide review pending | New `WorkspaceHeader` provides title, description, context and action slots. Data no longer creates a nested `<main>` or repeats Hub horizontal padding; its access fallback is a labeled section. PollsBoard uses the same header in loading and loaded states. | Locale layout owns `main#main-content`; other nested-main routes still need an inventory. Review header actions and frame behavior on browser/role variants before broader migration. |

## Sprint 3 — forms and read/action feedback

| Enhancement | Status | Source changes | Evidence / remaining work |
|---|---|---|---|
| ENH-10 | Shared field contract implemented; Data label pilot implemented; form-error adoption pending | Input/Textarea/Select accept associated hint/error content and preserve caller `aria-describedby`/`aria-invalid`. Data custom field name/type controls have labels without changing their visible treatment. | Existing validation remains domain-owned; migrate selected forms and prove field focus/retained values before broader adoption. |
| ENH-11 | Data initial-list pilot implemented; other read states pending | `DataWorkbench` distinguishes initial loading, successful empty/content and failed reads; failure has explicit retry and does not present “no datasets” as a successful empty result. | Import-detail/Records/Reports and GrievanceDetail state audit remains. No permission copy or API behavior changed. |
| ENH-12 | Circle transient-read recovery implemented; board action-state consolidation pending | `CircleWorkspace` keeps loaded content visible with a retry callout after transient reads, and clears it on 401/403/404. | Validate role/scope-change behavior and add a second board consumer after baseline review. Mutations are not automatically retried. |

## Current validation limits

- `node_modules` is absent in the checkout; no dependency installation was performed.
- No runtime test, lint, typecheck, browser, screen-reader, screenshot, database or hosted-account checks have been run in this implementation pass.
- Existing project test and deployment instructions remain applicable. Validation must be completed before claiming a sprint gate is closed.
- No API, persistence, authorization, tenant-scope, MFA, audit, export format or visual identity behavior was intentionally changed in the source slice above.
