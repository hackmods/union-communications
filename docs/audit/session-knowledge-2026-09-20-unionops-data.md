# Session knowledge — 2026-09-20 — UnionOps Data

**Decision:** Treat the shipped Data workbench as an officer-only import and lifecycle foundation. It is not ready for a real member-data pilot until asynchronous processing, retention operations, and the review experience are complete. Build reporting after officers can safely inspect, publish, and correct imports.

## What the implementation taught us

- Keep ingestion generic and domain publication explicit. A source column remains staging data until an officer maps it to a typed table field or a membership/employment field. Do not turn every unknown spreadsheet column into a member attribute.
- Names, email, and phone are not safe identity keys. The current engine only automatically resolves a unique union member number in the active local; weaker evidence must become a review suggestion. Importing a person must never create a login, invite, role, or Portal access.
- Membership, employment assignments, and supervisor links are separate histories. A supervisor change must not close a job, and a person may hold concurrent assignments. Missing rows mean “not observed,” not termination.
- Blank, missing, and deliberately cleared values have different meanings. Current imports preserve existing values for blank cells and do not yet support deliberate clearing. The UI must explain this before an officer publishes.
- Evidence lineage is useful only when an officer can reach it from the changed fact. Keep source file, sheet, row, source column, mapping version, decision, and both business-effective and recorded time attached to assertions. The current UI exposes history as raw JSON, which does not make that lineage usable.
- A database transaction and replay key protect a publication from partial writes and duplicate requests. They do not replace durable job execution: parsing and staging still run inside the upload request, so timeout, memory, progress, retry, and cancellation controls remain unresolved.
- Local scope is the current access boundary. There is no cross-local transfer, union-wide identity resolution, or collection authorization surface yet. Keep the active local visible in the UI and do not imply that an officer is searching all union records.
- CSV quoting, multiline cells, French text, leading-zero identifiers, invalid dates, and formula rejection deserve direct fixtures. Parser correctness is part of privacy and identity safety, not just file compatibility.
- Follow ADR-020 for future schema changes: append a numbered Drizzle migration, update schema/RLS and generated shape, and prove fresh plus historical-upgrade behavior using the runtime app role. Never rewrite prior migration history.

## UI/UX gaps to close

### P0 — required before a real-data pilot

1. **Make the import workflow legible.** Keep Datasets, Imports, Records, and Reports as the four work areas, but guide each import through Dataset → Upload → Map → Validate → Reconcile → Publish → History. Keep step status, current dataset, and active local visible. Users should be able to return to completed steps without losing work.
2. **Move parsing to a job and show progress.** Upload should return a durable run ID and show queued, scanning, parsing, review, publishing, completed, partially published, failed, and cancelled states. Include progress/checkpoint, safe retry, cancel, and a clear recovery path after refresh. Do not leave the only feedback as a disabled button while the request runs.
3. **Add a publication impact review.** Before publish, summarize new people, matched people, changed facts, unchanged rows, held rows, excluded rows, errors, and affected assignments/relationships. Provide a row-level before/after diff with the reason for each decision. Require an explicit confirmation that reports the exact scope and source period.
4. **Turn Records into an officer tool.** Replace JSON `<pre>` output with searchable people and table views, a readable profile, membership/employment sections, an effective-dated history timeline, and a provenance drawer. Show which source and row supports each value, when it was true, and when it was recorded. Add pagination and filters to the UI, not only the API.
5. **Show access and sensitivity in context.** Display the active local and scope on every import/record surface. Mark restricted columns and sensitive values, keep them staging-only by default, and show who can view a source file before upload and before download. Never make a mixed-scope source appear locally downloadable.
6. **Provide real review controls.** Give officers a validation summary, issue categories, row filters, select-all-current-page, bulk accept/exclude with counts, and a focused issue detail. Distinguish blocking errors from warnings and explain how a decision changes publication. Do not present a single generic status as the explanation.

### P1 — needed for recurring imports and accessible use

- Add sheet and header-row selection, multiple-sheet imports as separate runs, header-change diffs, and versioned source/mapping profiles. Show sample values and inferred field type beside every mapping.
- Offer canonical fields, approved custom fields, and staging-only as visibly distinct mapping destinations. Let dataset owners define access classification; show duplicate targets and missing required fields before continuing.
- Add declarative transformations and preview them on representative rows. Preserve source values and show normalized values side by side. Require an explicit date interpretation when a date is ambiguous; explain inferred observation dates and blank/clear behavior.
- Make the review table keyboard-operable: correct tab semantics and arrow-key behavior, a caption, row/column headers, stable focus after paging or bulk actions, visible focus, and a narrow-screen card alternative. Test EN and FR with keyboard and automated accessibility checks.
- Add empty, loading, upload progress, retry, and actionable error states per panel. Preserve the selected file, mapping, row decisions, and page across refresh where safe; warn before leaving with unsaved mapping changes.
- Replace raw error strings with localized messages and a correlation/run ID. Do not include member values in logs or generic error notifications.
- Render supervisor relationships as a readable chain/direct-reports view with unresolved/cycle warnings. Provide effective-date filters and make clear that an unresolved supervisor does not grant application access.

### P2 — reporting follow-on

- Keep Reports unavailable or clearly marked “planned” until it can save a versioned definition against one dataset or curated view. Avoid presenting an empty tab as a shipped feature.
- First reports need column selection, filters, grouping/counts, explicit as-of date, freshness and held-row banners, unknown-value treatment, and reproducible input-publication references.
- Recheck scope and export permissions on every run. Formula-safe CSV/XLSX export must be tested with values beginning `=`, `+`, `-`, and `@`; report access must never widen dataset access.

## UX acceptance questions

Before publishing, an officer should be able to answer: What file and period is this? Which sheet/header is being read? What changed? Which rows were held and why? Which people and jobs will be affected? Which values are staging-only or restricted? Can I undo or compensate for this publication? After publishing, can I trace a fact to its source and distinguish effective time from recorded time?

The next UX review should walk a synthetic recurring import end to end with keyboard only, at desktop and narrow widths, in English and French. Include a reordered-header file, duplicate identifiers, a shared email, one blank cell, one deliberate correction, one unresolved supervisor, a backdated row, and a restricted unmapped column. Record task completion and error recovery before enabling any real source.

## Current rollout boundary

The Reports area is a placeholder. Upload parsing is synchronous; raw-file retention purging, saved source profiles, trusted publication, merge/split correction, and deliberate clears are not shipped. Data access is currently local-scoped and officer-only. Keep this boundary in the module docs, release notes, and onboarding until these gaps are closed and tested.
