# UnionOps Data

UnionOps Data is an opt-in, officer-only workbench for importing local operational tables and preserving member/employment history. It extends the existing Next.js, TypeScript, Drizzle, and PostgreSQL application. It is not a national membership, HR, or payroll system.

## First release

The Hub page is `/app/data` and the module is enabled per union from `/app/onboarding` by a platform or union admin. The UI has Datasets, Imports, Records, and Reports areas. Datasets support general typed tables and a member/employment template. Custom fields have stable IDs, labels, a basic type, and an officer/restricted classification. Unmapped source columns remain in the raw, local-scoped staging row until an officer maps or excludes them.

Import flow: choose a local dataset, upload, inspect a paged preview, save the mapping, mark rows for publication or exclusion, publish valid accepted rows, and inspect people/history. CSV supports quoted commas and multiline cells. XLSX reads the first worksheet. Files are limited to 25 MiB, 50,000 data rows, and 200 columns; formulas and macro-enabled files are rejected. Production requires the existing private attachment storage and scanner configuration. Imports require MFA and PostgreSQL.

Member matching automatically uses only a unique union member number in the active local. Similar names, email, and phone never merge records. New member records do not create Hub users, invitations, roles, or Portal access. Member attributes keep import run and row provenance, and union membership history is distinct from employment assignment history. A supervisor can be linked by member number; unresolved supervisor identifiers and cyclic reporting changes return to review. Missing source rows do not end membership or employment.

Blank cells do not create new assertions and preserve existing employment values. Deliberate field clearing is not yet supported. Employment assignments and supervisor traversal require a stable source position ID; without one, accepted personal assertions still publish, but the engine does not guess which concurrent job to update. Dates must already be ISO `YYYY-MM-DD`; date-format selection and inferred-observation-date handling are follow-on work.

Publication runs inside the existing RLS transaction wrapper and locks the dataset revision. Repeated publish requests recheck state under lock; duplicate file/mapping imports are protected by a database unique index. Partial publication increments the dataset revision and holds unsafe accepted rows for review. Date values are expected in ISO `YYYY-MM-DD` form. Position lifecycle reconciliation requires a stable source position ID; otherwise the import preserves assertions without inferring which concurrent assignment changed.

## Access and storage

- All Data routes require MFA, an enabled module, an active local, an authorized officer role, and `DATA_DB_BACKEND=postgres`.
- The first release allows platform admins, union admins, division admins, and local presidents. Access is constrained to the active local; cross-local bulk access is not implemented.
- The ten `data_*` tables have union/local RLS policies in migration `0040_data_workbench.sql`, and are included in the generated database contract. New routes call `withRlsContext` and repeat explicit union/local filters.
- Raw source bytes use the existing `ATTACHMENT_STORAGE` private object store. Production import fails closed unless local storage has an explicit durable `ATTACHMENT_LOCAL_DIR` or S3-compatible storage has valid credentials, and unless `ATTACHMENT_SCANNER_URL` is configured and scanning succeeds. Local filesystem storage requires host-volume encryption; S3-compatible storage uses the existing SSE-S3 option.
- Raw previews, records, history, and exports inherit officer authorization. Saved reports and exports are not implemented. Retention purge jobs are not implemented; operators must configure file-store retention before a real-data pilot.

## Current API

| Route | Purpose |
|---|---|
| `GET/POST /api/data/datasets` | List/create local datasets |
| `GET/POST /api/data/imports` | List imports and upload a scanned source file |
| `GET/PATCH /api/data/imports/:id` | Page preview rows; save mapping or row decisions |
| `POST /api/data/imports/:id/publish` | Publish accepted rows and return revision counts |
| `GET /api/data/datasets/:id/records` | Read published generic table records |
| `GET /api/data/records/people` | Search accepted people and current assignments |
| `GET /api/data/records/people/:id/history` | Read authorized assertions and memberships |
| `GET /api/data/records/reporting-relationships` | Read a person's reporting chain or direct reports |

All list/detail APIs are local-scoped and paged where row volume can grow. APIs for Portal, dues, dispatch, and grievance integrations are intentionally deferred.

## Not shipped yet

The Reports area is a placeholder. The first release does not include saved table reports, spreadsheet exports, declarative transform profiles, date-format selection, workbook sheet selection/multi-sheet imports, a durable background queue/worker, retry/cancel/checkpoint controls, trusted-source auto-publication, reviewed merge/split correction, retention purging, or custom entities/relationships. Upload parsing and row staging currently run synchronously in the upload request. Do not enable the module for a real-data pilot until private storage, malware scanning, and operator retention are ready.

## UX and operator gaps

The current UI is a functional foundation, not yet a safe recurring-import workbench. The Records surface still renders generic table data and history as JSON; review lacks a publish impact diff; the primary workflow is four tabs rather than guided stages; the active local and column sensitivity need stronger in-context treatment; and long uploads have no durable progress/recovery UI. The full prioritized UX audit, including accessibility and pilot acceptance scenarios, is in [`docs/audit/session-knowledge-2026-09-20-unionops-data.md`](../audit/session-knowledge-2026-09-20-unionops-data.md).

Close those pilot gaps before exposing member data to officers beyond synthetic trials. Keep saved reports out of the navigation or label them as planned until saved definitions, as-of behavior, freshness/held-row disclosure, reproducibility, and per-run export authorization exist.

## Expansion sequence

1. Move parsing/staging to a durable Postgres-backed job worker; add sheet selection, versioned transform/source profiles, checkpoints, retry and cancellation.
2. Complete lifecycle correction/reversal and review tools, then introduce reviewed source trust with safe partial publication.
3. Add saved single-dataset reports with versioned definitions, as-of dates, publication references, authorization rechecks, and formula-safe exports.
4. Specify Time-worker and grievance integrations, then member-safe Portal views and separate dues/dispatch packs.
5. Consider constrained user-defined entities and relationships after the ingestion, audit, and permission model is proven.
