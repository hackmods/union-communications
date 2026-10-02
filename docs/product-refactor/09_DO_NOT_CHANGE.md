# Do not change

This register is an acceptance constraint for consolidation and the future UI uplift. It protects good patterns and intentional differences, not every current line of code. Evidence anchors are in [03](03_INTERACTION_PATTERN_INVENTORY.md).

## Preserve product capabilities and boundaries

| Preserve | Why it exists / evidence | Permitted consolidation |
|---|---|---|
| Public Comms remain free and useful without an account | Vision and on-device creator paths; hosted cost is a separate promise | Clearer shell and output actions; no new sign-in/paywall before making an artifact |
| Multi-union architecture | Tenant configuration, local membership, CA Collections and enabled modules have separate meanings; E11/E12 | Reuse scoped context display, never infer authority from brand or a menu |
| Brand Kit vs Hub organization identity | Presentation choice is user-controlled; Hub union is invite/account-owned; E07 | Clarify labels and apply states; no merged union selector |
| Explicit baseline application | Existing Apply behaviour protects the steward's local kit; September 30 alignment disposition | Share setting feedback, never silently overwrite a configured kit |
| On-device worksheet vs hosted record | Drafting and operational casework have different privacy/lifecycle; E08 | Improve explicit transfer and recovery; no automatic upload/sync |
| Hybrid unlock/manual sync and attachment boundary | Local encrypted state is not the whole Hub; attachments remain hosted; E12 | Clarify active mode and recovery; do not silently select a new persistence mode |
| Domain authorization and enabledModules | Routes/APIs enforce more than nav roles; E11–E14 | Share UI feedback for denied/disabled states; do not centralize policy in a component |
| Fresh MFA, replay/attempt limits, grants and audit ordering | Consequential action contracts; E14/E17 and relevant session notes | Share code-field/challenge presentation; never cache a code or reuse verification for another action |
| Member-safe grievance/proposal views | Portal projections deliberately omit confidential material | Shared basic presentational controls only; never reuse full case payload with hidden fields |
| Public token RSVP/poll participation | Token access does not create Portal membership; E16 | Focused form structure and localized result states |
| Separate public documents and private vault | Published reference/policy artifacts differ from confidential local documents; E19 | Common document action vocabulary; no merged store or permissions |

## Preserve mature interaction foundations

| Preserve | Why it works | Guard against accidental regression |
|---|---|---|
| Public catalog and canonical route helpers | Search, filtering, breadcrumbs and links already share product metadata | Keep query/hash/locale, disabled-tool availability and permanent aliases |
| Direct Brand Kit navigation | Identity is a frequent prerequisite | Do not hide it solely inside Create or Start to make menu shorter |
| Separate Letter Generator entry point | Focused variant of existing shared engine | Do not delete a useful entry point in the name of deduplication |
| ToolEditorLayout mobile Edit/Preview | Paired authoring and inspection need space on phones | Keep content/capture state across pane changes; actions available in full preview |
| Canvas Core, capture safety and logo geometry | Output quality depends on fixed design geometry, local fonts and deliberate capture rules | Do not apply global fluid typography or brand CSS indiscriminately to export roots |
| Native mobile file sharing and installed-app handoff | saveBlob handles mobile sharing, iOS viewing and avoids ejecting an installed app into a new browser tab | Distinguish cancellation in result feedback; do not replace the mobile flow with a desktop-only download |
| Office preview honesty | OfficePresetMock is illustrative; it is not a raster-fidelity promise | Keep explanatory preview copy; no requirement to add a rendering backend |
| Website iframe preview | Generated HTML/device preview differs from a PNG canvas | Preserve sandbox/lifecycle and supported export modes; do not replace with a decorative screenshot |
| Guide narrow/playbook/hub compositions | Different reading/index jobs deserve different width/navigation | Keep readable prose and wider figures; do not card every paragraph |
| Officer Learning progression/assessment | Modules have quiz and progress semantics beyond ordinary guides | Do not erase progress or turn a quiz into generic content; do not imply accreditation |
| Hub home role/module/MFA states | Existing task-first attention and operator/member landing work | Do not invent new KPI tiles, deadline counts or another dashboard |
| RouteStatusPanel and stale-build recovery | Already share result chrome with relevant recovery paths | Keep Public/Hub/Portal destinations and discreet existing easter egg |
| Display preferences and local font handling | Text scaling, contrast and motion options already affect the product | Preserve preferences across shell modes and test real layout/focus effects |
| Consent before member photo use | Existing ImageUpload/ConsentModal workflow protects an intentional requirement | Improve modal mechanics; never remove consent to shorten the flow |

## Intentionally different experiences

**Orientation can explain.** Home and Platform should not inherit the brevity of an expense export dialog. Their purpose is to help a new visitor understand the product and decide where to go.

**Operational work can be quiet.** A case record need not repeat product positioning. Quietness must not hide active tenant/local, permissions, unsaved state, demo/memory warnings or an uncertain write.

**Portal uses solidarity language.** Together, Circle, Hall, Bulletin, Floor, Binder, Sidebars, Roll Call, Dispatch, Many hands, One fight and Hold the line are intentional. Older route keys do not require renaming the product. French must communicate the same job, not mechanically repeat the English joke. Keep contextual explanations where needed.

**Existing collaboration features stay.** Starred Circles, Dispatch, learning progress, tasks and dashboards already exist. The prohibition on speculative additions is not permission to remove these capabilities.

**Output families stay distinct.** Print PDFs, image sizes, editable Office files, ICS, JSON/configuration exports, website ZIPs and hosted CSV/XLSX/receipt bundles solve different needs. The plan consolidates action placement and feedback, not formats or output engines.

**Data review is not ordinary CRUD.** Mapping, decisions, impact and publication are already meaningful steps. Do not replace them with a generic Save button or assume missing source rows mean deletion. Existing async/retention pilot gaps remain with the Data/launch backlog.

**Different saves are legitimate.** Brand Kit's local autosave, a worksheet draft, a submitted Hub record, a reviewed publication and a file download should never be made to look semantically identical. Shared feedback must name the actual outcome.

**Different administrative scopes stay visible.** Personal profile/display, local configuration, union branding and host operations are not a single settings bucket. Combining their visual treatment cannot combine their authority.

## Do not normalize for theoretical purity

- Do not rename source folders merely because canonical URLs changed.
- Do not replace native inputs/details/confirmations solely to increase shared-component adoption. Fix specific semantics and recovery gaps.
- Do not unify all cards or headers before defining their job. Visual differences alone belong to uplift.
- Do not force every worksheet into a canvas or every table into cards. Preserve comparisons and output fidelity.
- Do not move all filters into URLs; keep sensitive content, local drafts and MFA codes out.
- Do not introduce a global request/state framework solely because some modules fetch independently.
- Do not remove domain-specific sources, caveats, privacy notices, or language based on a universal word limit.
- Do not add AI assistance, command palettes, onboarding tours, analytics, gamification, a new notification centre, favourites, recents or speculative dashboards.

## Change-control questions

For each future packet, reviewers should be able to answer: Which existing job becomes easier? Which repeated interaction is removed? Which capabilities and outputs remain? Does authority or storage change? Which deliberate exceptions remain? If the proposal cannot answer these without inventing a new product requirement, narrow or defer it.
