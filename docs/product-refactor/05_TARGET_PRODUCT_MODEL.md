# Target product model

This is a structural target, not a new feature map. Keep current public destinations and capability boundaries. Use the [seven archetypes](02_PAGE_ARCHETYPES.md) as interaction contracts and the existing component families as the starting implementation.

## Three contexts, shared foundations

| Context | Navigation and chrome responsibility | Content responsibility |
|---|---|---|
| Public orientation/discovery | Public product destinations, identity, locale, display preferences, account access, full relevant footer | Explain, help choose, state deliverables/storage, link to tasks |
| Public task | Compact product escape/return, locale/preferences/account access, relevant breadcrumb | Prioritize the current task; conditional setup; controls, result and contextual help |
| Operational: Hub / Portal / Site Admin | Relevant product navigation, active scope, account/security access, meaningful notices; public escape remains available | Scoped work, record actions, domain state, recovery; Portal and Site Admin keep their own menus |

“Three contexts” does not mean duplicating provider trees or adding three new route hierarchies. Shared authentication, locale, brand and preference providers can remain at the locale boundary. Define shell mode from known route/context, not from a guessed client role. A hidden public menu is not a security control.

Preserve important non-production and storage warnings. The objective is one honest notice region with appropriate summary/detail, not hiding limitations to make a workspace look clean. Account transitions and unavailable tenant context must not briefly render the wrong operational scope.

## Workspace compositions

| Type | Used by | Stable interaction structure |
|---|---|---|
| Artifact editor | Canvas tools, Office generator, website export | Inputs ↔ preview; output controls; optional edit history. Renderer determines fidelity. |
| Structured worksheet | Steward tools, local bylaw/proposal preparation | Sections and prompts ↔ derived text/checklist/script; device retention and explicit handoff |
| Record list/detail | Grievances, bumping, documents, proposals, minutes | Scope → list/filter → record lifecycle/actions → sections/history; permission-aware controls |
| Operational board | Tasks, polls, expenses, travel, meetings, time | Overview/filter → selected record/form → scoped actions; no mandatory kanban conversion |
| Review workbench | Data imports and review/publication surfaces | Source/context → inspect/map → decide → impact → publish → inspect result |
| Collaboration space | Portal Circles and associated member views | Circle identity/membership → enabled tools → content/action/activity; tool-specific state |
| Configuration workspace | Brand Kit, personal/local/union/host settings | Scope/current values → edit → save/apply/publish → outcome; local autosave exception |

Types guide composition and tests; they are not seven data frameworks. Reading modules and catalogs need not become “workspaces” because they have a sidebar.

## Interaction ownership

1. **Application shell** owns the sole main landmark, global context and measured sticky stack.
2. **Page composition** owns title/context/actions, local navigation and responsive ordering.
3. **Domain section** owns its form, validation, mutation policy, record permissions, and relevant help.
4. **Behaviour primitive** owns label/error associations, tabs, dialog focus, busy state presentation, and announcements.
5. **Domain/API/adapter** owns authority, persistence, audit ordering, supported formats, and lifecycle semantics.

A shared header must not resolve tenant permissions. A download hook must not infer that a previous code authorizes a new operation. A generic empty-state component must not decide whether data is missing or forbidden.

## Canonical action vocabulary

| User action | Meaning and result contract |
|---|---|
| Edit | Changes the current working state; make retention clear when relevant |
| Saved on this device | Local persistence succeeded; does not promise recovery on another browser/device |
| Save to Officer Hub | An explicit authorized hosted write; success identifies the destination/record where available |
| Apply | Adopt chosen defaults/settings to the current scope; explain overwrite consequences |
| Publish | Change availability or authoritative accepted state; show impact and applicable challenge/review |
| Download + format | Generate/deliver an artifact to the browser save mechanism; no claim that it was read or stored at a particular filesystem location |
| Copy | Clipboard operation only; failure offers manual selection where feasible |
| Send | External delivery workflow; distinguish accepted send from confirmed delivery where the backend does |
| Reset / Clear | State which draft/settings are affected; preserve unrelated Brand Kit identity and hosted records |

Do not impose these exact English strings on every context without checking current EN/FR values and domain terminology. The contract is meaning. Exported files and application state must never share an ambiguous “saved” status.

## State model

**Read:** unresolved → loading → loaded-empty or loaded-content; loaded-content → refreshing → updated or refresh-failed. Authorization loss and locked local storage are separate branches. Retained content is permitted only while its visibility remains authorized; a network error is not permission to expose cached cross-tenant data.

**Local draft:** hydrating → editable/ephemeral or saving-device → saved-device / save-failed. Do not erase inputs after failed persistence. Storage blocked cannot be announced as saved.

**Hosted action:** idle → validating → submitting → challenge-required / confirmed / failed / outcome-uncertain. A challenge retains the exact selected target and arguments. Cancel discards the pending privileged request; it does not discard unrelated form inputs. Clear sensitive code state when the attempt ends or scope changes.

**Output:** eligible → generating/requesting → browser delivery attempted/completed according to helper contract → failure or truthful completion feedback. A server export may require a challenge and audit; a local PNG does not.

No shared component should automatically retry POST/PATCH, sequential handoffs, publication, email, or any uncertain write. Refresh/reconciliation must determine what happened before a user retries a consequential action.

## Navigation state

Keep public catalog filters and known tab deep links. Permit non-sensitive route context such as tab, selected authorized record ID, page and filters only after reviewing the domain. Do not put member names, draft text, MFA codes, raw imported values or grievance facts in URLs. Do not add global recent-item state to recover local navigation context.

Record detail should return to its appropriate list/filter where feasible. Authentication and fresh verification should resume only a validated internal destination and, for action challenge, the same in-memory pending operation under current authorization.

## Progressive quietness

| Stage | Foreground | Secondary/background |
|---|---|---|
| Orientation | Purpose, boundaries, task sequence | Technical details and operational menus |
| Discovery | Job, deliverable, eligibility/storage, selection | General marketing already seen |
| Task | Inputs, relevant preview, primary output/action | Established-brand setup, broad related resources |
| Workspace | Active scope, selected work, next valid action, data state | Product explanation; optional reference help |
| Result | What happened, where the result is, safe next action | New promotions or unrelated feature discovery |

This is prioritization, not a blanket content deletion policy. Consent, authority, privacy, source caveats, and consequences remain prominent at the decisions they govern.
