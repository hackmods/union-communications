# Accessibility manual review checklist

Use this worksheet to record human review evidence for a scoped UnionOps
release. It is a test record template, not a conformance statement. Do not mark
an item Pass unless the listed behavior was checked on the recorded build.

## Review record

| Field | Value |
|---|---|
| Review date | Pending |
| Reviewer and role | Pending |
| Commit/build and environment | Pending |
| Browser, OS, and assistive technology versions | Pending |
| Viewport/zoom settings | Pending |
| Locale(s) reviewed | Pending |
| Test-account role(s) | Pending; use non-production identities |
| Related issue/evidence folder | Pending |

## Result key

- **Pass:** observed behavior meets the check for the recorded route/build.
- **Fail:** a barrier was observed; create a defect with route, locale, steps,
  impact, owner, and target date.
- **Not assessed:** no evidence yet. This is the initial state for every row.
- **Not applicable:** explain why the check does not apply to this scope.

Do not attach real member, grievance, health, accommodation, or incident data
to screenshots or recordings. Use test data and redact account details.

## Route and journey scope

Record each route once per language where its content or controls are localized.
Do not infer that a scan or review of one route proves other routes.

| Surface / journey | Locale | Build/route | Result | Evidence reference / defect | Reviewer notes |
|---|---|---|---|---|---|
| Home and public navigation | EN | Pending | Not assessed | Pending | |
| Home and public navigation | FR | Pending | Not assessed | Pending | |
| Create, Utilities, and Learn catalogs | EN | Pending | Not assessed | Pending | |
| Create, Utilities, and Learn catalogs | FR | Pending | Not assessed | Pending | |
| Privacy, Security, Accessibility, and Trust pages | EN | Pending | Not assessed | Pending | |
| Privacy, Security, Accessibility, and Trust pages | FR | Pending | Not assessed | Pending | |
| Login and recovery/error states | EN | Pending | Not assessed | Pending | |
| Login and recovery/error states | FR | Pending | Not assessed | Pending | |
| Invite activation with a valid test invite | EN | Pending | Not assessed | Pending | |
| Invite activation with a valid test invite | FR | Pending | Not assessed | Pending | |
| Hub dashboard and selected task flow | EN | Pending | Not assessed | Pending | |
| Hub dashboard and selected task flow | FR | Pending | Not assessed | Pending | |
| Profile/account settings | EN | Pending | Not assessed | Pending | |
| Profile/account settings | FR | Pending | Not assessed | Pending | |
| MFA enrollment, challenge, recovery | EN | Pending | Not assessed | Pending | |
| MFA enrollment, challenge, recovery | FR | Pending | Not assessed | Pending | |
| Local Portal member journey | EN | Pending | Not assessed | Pending | |
| Local Portal member journey | FR | Pending | Not assessed | Pending | |
| Site Admin document review/publication | EN | Pending | Not assessed | Pending | |
| Site Admin document review/publication | FR | Pending | Not assessed | Pending | |
| Dialogs, menus, and confirmation flows | EN | Pending | Not assessed | Pending | |
| Dialogs, menus, and confirmation flows | FR | Pending | Not assessed | Pending | |

If a route or privileged state is unavailable in a safe test environment,
record the fixture/environment gap and keep the row Not assessed. Do not use a
real privileged customer account to fill the gap.

## Manual checks

For each scoped journey, record Pass/Fail/Not assessed/Not applicable and an
evidence reference.

| Check | Result | Evidence reference / defect | Notes |
|---|---|---|---|
| Keyboard-only completion: start, navigate, operate controls, submit, and recover from errors without a pointer | Not assessed | Pending | |
| Skip link and landmarks: skip link works; header, navigation, main, and footer landmarks are understandable | Not assessed | Pending | |
| Focus order and visibility: focus follows reading/task order and remains visible at every step | Not assessed | Pending | |
| Menus and dialogs: names/states are announced; focus enters, remains appropriately contained, closes with Escape where expected, and returns to the trigger | Not assessed | Pending | |
| Forms and errors: labels, required fields, instructions, validation errors, and success/failure status are available to assistive technology | Not assessed | Pending | |
| Screen-reader reading: headings, links, buttons, tables, status messages, and dynamic updates make sense in context | Not assessed | Pending | |
| Language: page language and language changes match the displayed EN/FR content; untranslated or mixed-language passages are recorded | Not assessed | Pending | |
| Contrast and non-colour cues: text, controls, focus indicators, status, and error meaning remain distinguishable | Not assessed | Pending | |
| Zoom/reflow: content remains usable at 200% and at narrow reflow width without lost controls or two-dimensional scrolling, except where essential | Not assessed | Pending | |
| Text resizing and spacing: enlarged text and increased text spacing do not hide, overlap, or truncate information | Not assessed | Pending | |
| Touch and mobile: controls are reachable, sufficiently separated, and usable at the scoped phone viewport | Not assessed | Pending | |
| Reduced motion and forced colours: essential information and state remain available | Not assessed | Pending | |
| Policy print: title, version/effective metadata, headings, links or destinations, and reading order remain useful on paper/PDF | Not assessed | Pending | |

## Findings and disposition

| Finding ID | Route/locale | Barrier and reproduction | Impact | Owner | Target date | Retest result/evidence |
|---|---|---|---|---|---|---|
| Pending | Pending | No findings recorded yet | Pending | Pending | Pending | Pending |

Before using this review to support a public accessibility statement, record
the assessment scope, applicable legal/customer requirements, known barriers,
reviewer qualifications, and approval by the accountable accessibility owner.
An incomplete checklist or automated axe result alone does not support a
conformance claim.
