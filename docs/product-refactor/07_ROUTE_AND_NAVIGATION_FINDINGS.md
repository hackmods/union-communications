# Routes and navigation findings

Canonical routes, render folders, menu labels and permissions are separate concepts. The current implementation, not older route names or historical screenshots, establishes this baseline. See [E01–E04 and E11–E16](03_INTERACTION_PATTERN_INVENTORY.md).

## Current public navigation

The inspected PUBLIC_PRIMARY_NAV is **Brand Kit → Create → Worksheets → Learn → Platform**. Its third key is `utilities`, but the actual EN/FR values are “Worksheets” / “Feuilles de travail.” Search is a separate header action; session-aware Officer Hub/Local Portal links and operator/account controls are added as applicable. The wordmark goes Home. Guided setup (`/start`) is in secondary/footer navigation and orientation content.

Older September 20 notes describe Start/Brand Kit/Create/Learn. That is historical evidence, not the current menu. Do not “repair” current navigation to that old description without a separate product decision.

HomeContent likewise now presents Brand Kit as a foundation, followed by parallel Create/Worksheets/Learn choices and a Platform band. Its primary CTA changes from Brand Kit to Create after readiness. The earlier numbered Brand Kit → Create → Learn description is not the current Home composition.

## Canonical map

| User-facing destination | Source implementation / compatibility | Archetype |
|---|---|---|
| `/` | Locale home, HomeContent | A1 |
| `/start` | StartContent; old onboarding URLs redirect with preserved/default step query | A1 with focused setup links |
| `/create/brand-kit` | Rewrite to `/brand-kit` | A7 |
| `/create` | Rewrite to `/tools` catalog | A2 |
| `/create/:slug` | Rewrite to `/tools/:slug`; worksheet slugs canonicalize to `/utilities` | A5, short A4 exception |
| `/utilities` and `/utilities/:slug` | Catalog plus rewrite to existing tool implementations | A2 → A5/A4 |
| `/learn` | Rewrite to `/guides` | A2 |
| `/learn/communications-blueprint`, `/learn/first-week`, `/learn/steward` | `/guide`, `/guide/social-media-plan`, `/guide/steward-playbooks` | A3 / reading indexes |
| `/learn/officer` and `/:slug` | `/guide/officer-learning` and module route | A2 → specialized A3 |
| `/learn/workshops/*` | Existing workshop guide routes | A3 |
| `/learn/library/*` | Library/examples/captions/assets implementations | A2 with item-specific content |
| `/learn/:slug` | Generic guide rewrite; custom learned content also has `/learn/custom/:unionSlug/:guideSlug` | A3 |
| `/documents`, `/documents/:slug` | Public library/managed publication routes; privacy/security/accessibility aliases canonicalize here | A2 → A3/document action |
| `/platform`, `/trust`, `/manifesto`, `/support`, `/install`, `/updates` | Public explanation/support/trust/content routes | A1/A3 |
| `/join`, `/request-access`, feedback/email preference routes | Separate access/participation tasks | A4 |
| `/r/:token`, `/poll/:slug`, `/meetings/:slug` | Public participation/resource views | A4 or focused resource view |

`next.config.ts` owns live rewrites; `public-routes.ts` owns canonicalization and permanent redirects. The locale Link canonicalizes string hrefs and preserves query/fragment through the helper. Object hrefs, direct router calls, raw anchors, generated files and external bookmarks need independent checks when changed. Their existence does not prove a defect.

No route-folder migration is required for product coherence. Moving files to mirror canonical URLs now would create migration risk without changing the interaction.

## Create and Worksheets coverage

Creation source inventory includes Logo Builder, Image Resizer, Document/Letter Generator, Graphic Maker, Flyer Maker, Board Banner/Notice, Solidarity Poster, QR Board/Card, Action Card, Quote Card, Meeting Background, Org Chart, Website Template, Local Pack, Alt Text and Pulse Poll. Worksheets include RTW/Accommodation, Grievance Form Builder, CA Snippets, Steward Quick Log, Pre-disciplinary Log, Complaint vs Grievance, Bylaw Builder, Proposal Tracker and Rules of Order. Keep Learning is a redirect to Learn. Share Kit's legacy URL redirects to Graphic Maker.

These are job categories, not strict renderer categories. Alt Text living under Create does not make it a canvas editor; Rules of Order is a reference/utility rather than a mandatory persisted form. Preserve direct specialist entry points unless task evidence supports moving them.

## Hub navigation and route families

| Family | Current routes / dominant behaviour |
|---|---|
| Entry and identity | `/app`, login, forgot/reset/sign-in token, invite token, MFA/setup, profile; member landing uses feature teaser policy |
| Casework | grievances list/new/detail, bumping list/new/detail, overdue, handoff, informal-log, snippets, marketplace, hybrid |
| Work coordination | tasks, discussions/detail, checkins/detail, calendar, meetings, minutes/new/detail |
| Governance | officers, committees, elections, bylaws, proposals/detail, organization |
| Operations | time/admin, expenses, travel, ledger, polls, broadcast, outreach-lists, reports, data, documents |
| Guidance/configuration | steward-guides, officer-learning, invites, onboarding, configuration, settings/tenant, union-brand, union-directory, audit, feedback/send-feedback |
| Host operation | `/app/site-admin/*`: organization/unions/locals, account-support/users, host/brand-styles/customization/public-tools, email/product-news/outreach-lists, access requests, documents, incidents/subprocessors/operator-audit, membership-integrity, observability, demo-cleanup |

HubNav derives modules from tenant/local settings and roles. Officer tools use a separate catalog and grouped nav model. Grouping includes casework, records, funds and administration; unknown grouped links are retained in **Other**, not dropped. Dashboard and navigation already share access-related discovery helpers. Do not propose a new module catalog.

**Finding:** multiple registries serve different jobs. Optional integrity checks should compare reachable discovery entries and shared labels. Do not merge module enablement, nav grouping, domain authorization and operator entitlements into one registry.

## Portal navigation

`/portal` is Together. The nav includes My Cases, Dispatch, Hold the line (`/fronts`), Sidebars, Proposals and feedback, plus Circles. Circle tabs include Bulletin, Actions, Calendar, Binder, Floor, Roster and conditional Roll Call/Many hands/One fight/Oversight. Dispatch constructs a Circle URL with the relevant `tab` query. Starred Circle ordering already exists and should be retained.

The user-facing solidarity labels intentionally differ from older implementation keys. Preserve deep links and names. Evaluate explanatory context with members before proposing any label change. No source evidence warrants merging Portal navigation into Hub menus.

## Context and history rules to settle

| Surface | Current behaviour | Target / packet |
|---|---|---|
| Public catalog | Search/filter URL and popstate support | Preserve; use as reference for appropriate discovery state. R09 |
| Circle | Initial query selects tab; selection replaces URL; Dispatch targets tab | Maintain deep links; explicitly choose Back semantics, synchronize navigation changes, and test invalid/hidden tab fallback. R10 |
| Data | Default datasets tab and selected import only in React state | Preserve safe tab/selection on reload/return where justified, with server reauthorization. Do not serialize imported contents. R10 |
| Casework | List/detail routes with local filters and domain reads | Keep return scope/filter where appropriate; no new recent-items feature. R10 |
| MFA/auth | Dedicated return-path helpers and inline action challenges | Preserve validated return paths and action-bound pending payload; cancel on scope/target change. R04 |

## Discoverability vs access

Disabled public tools are filtered by existing availability infrastructure. Hosted module/role/MFA gates are not discoverability bugs by themselves. Site Admin cards and public document publication have extra operating requirements. Source inspection cannot establish production configuration or whether a particular real account sees a link.

Before declaring an existing feature inaccessible, test its intended role and tenant, enabled/disabled module, local selection, MFA state, desktop/drawer navigation, direct URL and empty-state recovery. The audit found no additional capability that should be removed as abandoned.

## Navigation acceptance examples

- Legacy English and French tool URLs land at their canonical destination with preset/example/query/hash intact.
- Brand Kit stays one direct navigation action away; Start checklists remain accessible without becoming compulsory.
- A member without Portal enabled never receives officer casework controls; an operator never gains case content by menu visibility.
- A Circle dispatch link reaches the intended visible tab; an unavailable tab safely falls back without granting access.
- Opening a protected export, completing a challenge and cancelling it never changes the selected record or format silently.
- Compact menus contain the same allowed destinations as their full-width counterparts. Locale and display controls remain available in every shell mode.

These are future checks; none is claimed as a browser result from this audit.
