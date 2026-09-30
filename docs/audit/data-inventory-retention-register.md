# UnionOps data inventory and retention register

**Status:** Engineering inventory, not an approved retention schedule  
**Reviewed against:** Local source/schema at `2c6f4225`; 2026-09-27  
**Scope:** UnionOps-operated hosted Hub, Local Portal, public intake, and
on-device Comms  
**Approval:** Privacy Officer, customer/controller, and qualified legal review
are pending

This register describes what the current code can store and where it can go.
It does not determine the legal controller for every arrangement, authorize
collection, or set a legal retention period. Do not use real sensitive member
data in a feature whose durable storage, access controls, retention, and
deletion have not been verified on the target host.

## 1. Verified storage map

| Surface / class | Current storage path | Verified source / configuration | Operating implication |
|---|---|---|---|
| Public Comms work | Browser local storage and downloaded files; no Hub database write in the ordinary Comms flow | `docs/ARCHITECTURE.md`; public tool adapters and ADR-006 | The user/browser operator manages local copies, exports, browser profiles, and device disposal. Do not describe local browser storage as centrally deleted by UnionOps. |
| Hub and Portal structured records | Postgres when the relevant `*_DB_BACKEND=postgres` flag and `DATABASE_URL` are active; otherwise many adapters default to process memory | `src/lib/db/backend.ts`; `/api/health` backend map; current Drizzle schema | A schema table existing in source does not prove that a target host uses Postgres. Memory data can disappear on restart and does not satisfy a sensitive-data pilot. |
| Relational schema | 132 tables currently listed in the checked-in `docker/db-required-shape.json`, including tenant, identity, casework, governance, time, financial, Portal, customization, feedback, and audit records | `src/lib/db/schema/index.ts`; required shape; ADR-020 | This is a manually updated code/image contract, not a live database inventory; the official Drizzle generator has not run in this checkout. Compare with the verified boot attestation and target-host configuration. |
| Attachment/document bytes | Local filesystem under `ATTACHMENT_LOCAL_DIR` (otherwise `.data/attachments` under the process directory) or S3-compatible object storage | `src/lib/attachments/storage.ts`; `ATTACHMENT_STORAGE`, `ATTACHMENT_LOCAL_DIR`, `ATTACHMENT_S3_*` | Local volume durability/encryption and S3 region, keying, server-side encryption, versioning, and lifecycle are operator/provider facts. Metadata and object bytes must be deleted consistently. |
| Malware scanning | Configured scanner endpoint; sensitive Data import fails closed if scanner/storage prerequisites are absent | `src/lib/attachments/scan.ts`; `ATTACHMENT_SCANNER_URL` | Scanner provider may receive submitted bytes and should be assessed as a processor/subprocessor. Keep scan result and file bytes retention explicit. |
| Authentication/session | Signed Auth.js JWT cookie; user row, recovery codes, TOTP replay state, session grants, and attempt-window state use Postgres when `AUTH_USERS_BACKEND=postgres`; pending MFA enrollment still uses process memory | `src/auth.ts`, `src/auth.config.ts`, `src/lib/auth/*`, `src/lib/db/schema/auth.ts` | Cookie/session expiry is not a data-retention workflow. Pending enrollment can be lost across restart or replicas. Account lifecycle and token cleanup are not centrally scheduled. |
| Transactional email | SMTP or Mailgun API; application provider sends invites, sign-in/reset links, reminders, RSVP confirmations, and other transactional messages | `src/lib/email/send.ts`; ADR-016; `MAILGUN_*` / `SMTP_*` | Provider delivery, bounce, suppression, and message logs are external evidence. No product-news consent list or campaign path exists in this checkout. |
| Error telemetry and server logs | Optional Sentry and/or JSONL files; defaults are operator-configured | `docs/modules/OBSERVABILITY.md`; `SENTRY_*`, `ERROR_LOG_FILE_*` | Logs are not the security audit register. Review actual event payloads, access, region, rotation, backup, and expiry; do not assume they contain no personal data. |
| Database/object backups | Outside application retention logic; controlled by host, database, and storage providers | Operator deployment configuration; no application backup scheduler found | Record provider, region, encryption, access, schedule, expiry, restore evidence, and how object/database snapshots age out. No RPO/RTO or deletion-from-backup promise is established here. |
| Legal agreements, marketing consent, incidents, subprocessor approvals | No durable application records found for these functions in this checkout | Route/schema search and current fit-gap review | Keep these as launch gaps; do not put drafts in the effective-policy path or represent a manual spreadsheet as an app control. |

### Backend configuration inventory

`src/lib/db/backend.ts` defines per-module flags. Most use `memory` unless set
to `postgres` with `DATABASE_URL`; a missing database URL can fall back to
memory even when a flag requests Postgres. `ACCESS_REQUEST_DB_BACKEND` has a
special automatic Postgres choice when a database URL exists, but can be
explicitly set to memory. `DATA_DB_BACKEND` is required by the Data access
gate. `ATTACHMENT_STORAGE` is a separate object-storage choice and does not
make relational metadata durable by itself.

The backend list is: `GRIEVANCE_DB_BACKEND`, `BUMPING_DB_BACKEND`,
`AUDIT_DB_BACKEND`, `TIME_DB_BACKEND`, `ATTACHMENTS_DB_BACKEND`,
`DISCUSSIONS_DB_BACKEND`, `TASKS_DB_BACKEND`, `INFORMAL_LOG_DB_BACKEND`,
`SNIPPETS_DB_BACKEND`, `MINUTES_DB_BACKEND`, `LEDGER_DB_BACKEND`,
`OFFICERS_DB_BACKEND`, `TRAVEL_DB_BACKEND`, `EXPENSES_DB_BACKEND`,
`COMMITTEES_DB_BACKEND`, `ELECTIONS_DB_BACKEND`, `POLLS_DB_BACKEND`,
`MEETINGS_DB_BACKEND`, `MEETINGS_RSVP_DB_BACKEND`, `CHECKINS_DB_BACKEND`,
`AUTH_USERS_BACKEND`, `FEEDBACK_DB_BACKEND`, `OFFICER_LEARNING_DB_BACKEND`,
`PLATFORM_SETTINGS_DB_BACKEND`, `BYLAWS_DB_BACKEND`,
`PROPOSALS_DB_BACKEND`, `DATA_DB_BACKEND`, `ACCESS_REQUEST_DB_BACKEND`, and
`PORTAL_DB_BACKEND`.

The current hosted-readiness checks do not yet demonstrate that every
customer-data flag, attachment backend, log sink, and backup policy is correct
for an actual deployed customer. Capture a redacted effective configuration
from the target host; do not copy secrets into this register.

## 2. Record-class inventory

“TBD” means no approved period or legal-hold rule is encoded here. Triggers are
candidate operational events to validate with the Privacy Officer and each
customer; they are not a statement that deletion should occur immediately.

| Record class / subjects | Current records and purpose | Sensitivity | Location and scope | Accountable owner | Candidate lifecycle trigger | Current deletion / archive behavior | Retention and hold decision |
|---|---|---|---|---|---|---|---|
| Union, division, local, bargaining unit, user, membership, officer and authority | `unions`, `divisions`, `locals`, `bargaining_units`, `users`, `local_memberships`, `officer_assignments`, `authority_delegations`, `committee_memberships`, `officer_roster`; tenancy, access, office, and governance administration | Internal to confidential; user email/name and role are personal data | Postgres or memory; union/local scoped where applicable; `users` is an identity table | Customer organization for Hub identities and membership; hosting operator for account service — contract allocation pending | Account closure/revocation; end of membership/office; tenant closure | Several entities use `archived_at`/revocation/end dates; these preserve history. No general user/tenant purge workflow was found; demo-only purge is not a customer deletion service | Per account, membership, office, and tenant record schedule; legal holds and identity/account separation TBD |
| Credentials, tokens, sessions, MFA and security evidence | `users.password_hash`, plaintext `totp_secret`, session version; password-reset, sign-in, invite, email-change tokens; `mfa_recovery_codes`, `mfa_totp_counters`, `mfa_session_grants`, `mfa_verification_attempts`, `mfa_pending_enrollments`; `audit_log` (`outcome`, optional `request_id` from migration `0070`), `break_glass_grants` | Highly confidential security data | Auth database for durable MFA state when Postgres auth is configured (pending enrollment uses `0090`); audit depends on `AUDIT_DB_BACKEND` | Hosting/security operator; affected account for authenticators/recovery | Token expiry/consumption; account lock/archive/deletion; investigation closure | MFA attempt row holds only the current fixed window and count, not an event history; it resets on a later attempt after expiry and cascades on account deletion. Pending enrollment expires after 10 minutes and is overwritten to a placeholder on clear (no DELETE). Other token expiry/consumption is not generally purged. Migration `0070` makes app-role audit rows append-only; prior outcomes are unknown, and current correlation covers selected MFA/operator audit-list requests only. No general user deletion workflow. | Define short-lived token cleanup, audit/security-record period, incident hold, and account-erasure behavior; current periods TBD |
| Grievance and confidential casework | `grievances`, `grievance_events`, `grievance_notes`, `grievance_outcomes`, `grievance_participants`, `grievance_member_updates`, `grievance_attachment_shares`; parties, deadlines, notes, outcomes, access, pseudonyms | Confidential / highly confidential, potentially employment, health, or discipline information | Postgres RLS by union/local and case access, or memory; related files use attachment storage | Customer union/local for case purposes; hosting operator as service provider/controller role requires contract/legal review | Case closure, appeal/hold expiration, member request, contract/tenant termination | Case close is a workflow state, not deletion. Attachment metadata/object deletion is not one atomic lifecycle service. No general retention or legal-hold service found. | No universal period is approved here. Counsel/customer must define per case type, grievance stage, appeal, arbitration, and hold |
| Bumping, seniority and workforce history | `bumping_cases`, `committee_sessions`, `committee_notes`, `decision_records`, `member_seniority_records` | Highly confidential employment information | Postgres tenant scope or memory; attachments may contain source/PDF evidence | Customer union/local; operator for hosted processing | Case/round closure, expiry of challenge/appeal, tenant end | No domain retention worker found; some workflow status/history is retained. Remove files only with matching metadata and approved workflow. | Period and event trigger need collective-agreement, customer, and legal review; TBD |
| UnionOps Data import and member/employment register | Ten `data_*` tables: datasets, import runs, staged rows, publications, generic records, people, identifiers, assertions, employment assignments, and union memberships; source CSV/XLSX bytes in private object storage | Confidential personal information; imports may include employment history, member numbers, location, supervisor, and restricted fields | Postgres required by module gate; local-scoped RLS; raw files in configured private local/S3 storage; scanner may process bytes | Customer union/local owns collection/purpose; operator hosts; exact controller/processor allocation pending | Import completion/rejection, source supersession, correction/reversal, member request, dataset closure, tenant end | No raw import/staging purge or retention job; parsing/staging synchronous. Module documentation explicitly says not ready for real-data pilot until retention is configured. | Approve distinct periods for original bytes, staging, accepted facts, provenance, and correction history; legal holds and source deletion TBD |
| Attachments and generated documents | `attachment_meta`, `documents`; grievance, bumping, expense, time, general document bytes; filenames, MIME/type, size, keys, scan state | Depends on linked record; often highly confidential | Relational metadata plus local path or S3 key; local default can be non-durable; S3 SSE-S3 default does not establish region or CMEK | Owner of linked case/record; hosting/storage operator | Linked record deletion, replace/withdraw, account/tenant closure, retention expiry | Object storage exposes `delete`; callers and foreign-key cascades are not one global deletion workflow. Orphan detection, versioning, backup expiry, and verified byte erasure are not established. | Derive schedule from linked record class, with orphan sweep and backup expiry. Holds must preserve metadata and object consistently; TBD |
| Portal collaboration | `portal_circles`, memberships, bulletins/comments, actions, calendar events, binder items, floor messages, roll-call questions/answers, pipeline boards/columns/cards, dispatch/momentum items, sidebar threads/participants/messages | Internal to confidential; may include member participation, labour plans, and personal messages | Postgres RLS or memory; union/circle membership and local scope | Customer union/local; hosting operator processes | Circle archive, membership removal, post deletion, tenant end | Circle content supports soft deletion/archive in places; no comprehensive purge across all children or backup snapshots found. Removing membership does not equal deleting authored content. | Define content, membership, archive, and authored-message retention separately; legal holds and authorship requests TBD |
| Meetings, RSVP, attendance and minutes | `local_meeting_schedules`, `union_meetings`, RSVP tokens/responses, `scheduled_meetings`, `meeting_minutes`, check-in schedules/answers | Internal; RSVP names/contact and attendance are personal data; minutes may be confidential | Postgres or memory by module; public RSVP endpoints may handle tokenized data | Customer union/local | Event close/cancel; token expiry; minutes approval; tenant end | RSVP token records include expiry/consumption concepts; no global expired-token purge or schedule for attendance/minutes found. | Set separate periods for contact/attendance data and official minutes; approve event triggers and holds, TBD |
| Elections and polls | `election_cycles`, `poll_definitions`, `poll_responses`; ballots or response identifiers depend on module data shape | Confidential; may reveal political/workplace views or choices | Postgres or memory; union/local scoped | Customer union/local | Election close, challenge/certification end, poll close | No common retention or anonymization/purge flow found. | Governance rules and legal review must set ballot, tally, challenge, and audit retention; do not promise anonymity absent design evidence |
| Workforce time, scheduling and leave | `time_entries`, `time_workers`, worker groups, shifts/series, expected windows, worksites, job codes, overtime and PTO policies/balances/requests, payroll export profiles; location/GPS and consent timestamps where enabled | Highly confidential employment/location data | Postgres or memory by time backend; punch photos use attachment store; export files leave app under user control | Customer employer/union per role and purpose; operator hosts | Pay period close/correction window; leave case close; worker/account end | There are workflow/status records and exports but no central expiry/purge job found. GPS consent evidence must not be removed without approved basis. | No universal period is approved here. Customer counsel must set class-specific periods consistent with applicable payroll, correction, and audit requirements; TBD |
| Finance, travel and expenses | `ledger_entries`, `expense_submissions`, `expense_claims`, `cash_advances`, `travel_authorizations`, receipts/attachments | Confidential financial and employment information | Postgres or memory; receipts in attachment storage | Customer finance/trustee function; operator hosts | Reimbursement/payment, audit period end, dispute/tenant end | No scheduled cleanup or legal-hold management found; deletion of files and rows may differ | Retention depends on financial, funding, tax, and customer duties; qualified review required; TBD |
| Governance, bylaws, proposals, committees and CA knowledge | `bylaw_drafts`, proposal packages/rows/events/publications, committees/sessions/notes, `ca_snippets` | Internal to confidential; drafts and bargaining/strategy may be sensitive | Postgres or memory; some proposal publications are member-facing Portal records; union/local RLS | Customer union/local | Vote/ratification; publication supersession; committee close; tenant end | Proposals include publication/event state; some content is versioned; no universal purge/hold service | Preserve official approved records according to adopted governance schedule; expire drafts and working notes only after approved rules; TBD |
| Discussion, informal log and tasks | `discussion_threads`, posts, `informal_log_entries`, `tasks`; workplace concerns, assignments, comments | Internal to confidential; entries can reveal employment/labour concerns | Postgres or memory; union/local scoped where supported | Customer union/local | Completion/closure, supersession, request/tenant end | Deletes/soft deletes exist in some domains; no common archive/retention service | Define per feature and sensitivity; informal notes may need stricter minimization/period than official records; TBD |
| Website access requests and feedback | `access_requests`, `platform_feedback_submissions`; applicant name/email, local, requested offering, optional message, website feedback/contact and abuse controls | Personal information; free text may contain unsolicited sensitive content | Postgres or memory; not union casework; email provider may deliver notifications | UnionOps as website operator/controller, subject to privacy notice and legal review | Request resolved/closed, feedback answered, withdrawal, abuse investigation | An authorized Site Admin can manually delete an individual feedback submission and the delete is audit-logged. No scheduled purge or privacy-request workflow was found; access-request cleanup/erasure is unverified. | No approved feedback period remains stated in `COMPLIANCE.md`; Privacy Officer/legal review and an operational schedule are still required |
| Customization, brand assets and admin configuration | Customization scopes/resources/drafts/revisions/releases/heads/policies/section controls/public projections/grants/operations/assets/audit; platform/union/local public-tool settings; host brand | Public/internal; asset uploads or admin audit metadata can be confidential | Postgres; image bytes use the configured local/S3 object store; union/local scope for tenant values | UnionOps for platform defaults; customer admins for tenant brand/config | Release supersession, asset replacement, tenant end | Assets are uploaded before metadata is committed, so failed metadata writes can leave orphan objects. No asset purge or general tenant purge workflow was found. Do not delete referenced published revisions without migration/impact review. Upload MIME/size/content checks do not prove antivirus scanning. | No approved system-wide schedule; approve asset, revision, grant, audit, and backup periods before use with private content |
| Officer learning and platform telemetry | `officer_learning_users`, local settings, completion/report state; optional Sentry, JSONL, health/deploy events | Internal; user progress and operational events can be personal/security data | Postgres or memory; Sentry external service if enabled; local/host logs | UnionOps product/operator; hosted customer telemetry roles need explicit definition | Learning account closure/course completion; log rotation/incident closure | Logs rotate only according to operator settings; no central expiry for learning or security events established | Set course-progress and security-log periods separately; inspect Sentry payload and provider retention; TBD |
| Marketing, billing, incidents, privacy requests and subprocessor approvals | No campaign consent/suppression, billing, incident register, dedicated privacy-rights case, or subprocessor approval tables/routes found | Not currently an implemented collection; future records may be high sensitivity | No application location yet; must be designed durable before collection | UnionOps accountable owner and named Privacy/Security roles are not yet configured | Must be specified before feature launch | Do not use existing member/feedback/access-request lists as substitutes. Do not store launch evidence in process memory. | Define purpose, fields, owner, schedule, hold, access, export, deletion, and provider before collecting any of these records |

## 3. Existing lifecycle behavior and gaps

- **No central retention service or legal-hold model was found.** Retention is
  mostly absent from runtime behavior; documentation alone does not prove a
  purge happened.
- **Demo purge is not customer deletion.** `SITE_ADMIN_DEMO_PURGE_ENABLED` and
  `purgeDemoRows()` remove records marked `is_demo` after a separate typed
  confirmation. It must not be used for customer-record lifecycle.
- **Archive and revoke preserve records.** `archived_at`, `revoked_at`, end
  dates, and soft-delete markers are access/lifecycle signals, not proof of
  physical deletion or expiry.
- **Object and relational deletion are separate.** A database cascade may
  remove metadata while local/S3 bytes or backup copies remain. Conversely,
  file deletion can succeed while metadata or audit evidence remains.
- **Token expiry is not cleanup.** Reset/sign-in/invite/RSVP records can stop
  authorizing use without being physically removed.
- **Backups and logs are outside app deletion.** Customer promises must describe
  their actual expiry and restoration behavior after operator verification.
- **No legal-hold workflow exists.** A hold must pause all scheduled deletion
  paths and propagate to attachments, derived indexes, exports, and queued
  jobs; it must not be represented as available until tested.
- **No complete privacy-request workflow was found.** Search/export, identity
  verification, third-party copies, exceptions, response deadlines, and audit
  evidence need an approved internal process.

## 4. Decisions required before implementing retention

For every record class, the Privacy Officer and qualified customer/legal
reviewers must approve: purpose and authority to collect; data subjects and
controller/processor allocation; start event; retention period or criteria;
archive vs deletion; holds and exceptions; attachment/derived/log/backup
coverage; access/export response; deletion proof; and review owner/date.

Do not put an unapproved schedule into a public policy or an automatic purge
job. Until a schedule is approved, mark affected capabilities as not ready for
real-data use. Keep manual operation limited to a documented, approved
customer instruction with an impact preview and evidence.

## 5. Implementation order

1. Name the Privacy Officer and customer-facing role contacts; verify they are
   monitored. Complete provider and deployment inventory without copying
   secrets.
2. Approve the schedule and legal-hold matrix by record class, including
   backup/object-store expiry and the current feedback statement.
3. Build a read-only dry-run report that identifies candidates, holds,
   references, object keys, volumes, and the exact configuration used.
4. Add idempotent deletion jobs with per-resource/account/tenant authorization,
   recoverable progress, attachment cleanup, index/cache/queue coverage, and
   audit evidence. Keep recovery copies only according to the approved
   backup-expiry rule.
5. Add legal-hold create/release with narrow authority, scope, rationale,
   review date, and audit. Test that all destructive jobs skip held resources.
6. Exercise a synthetic privacy request and deletion run on production-like
   Postgres + object storage; verify direct API denial, tenant isolation,
   retries, partial failure, and backup expiry/restore behavior.
7. Publish only the approved summary in managed legal documents after the
   Managed Documents foundation is synced and audited.

## 6. Evidence status

| Evidence needed | Current source | Status |
|---|---|---|
| Application table and column inventory | Checked-in Drizzle schema + required-shape file (132 tables listed) | Source inventoried; required shape has manual rows through migration `0070`; generated contract not rerun in this checkout because `tsx` dependencies are absent |
| Effective host backend/storage configuration | `/api/health` plus redacted deployment configuration and operator confirmation | Not available from this worktree |
| Raw import and attachment purge | UnionOps Data docs/API and object-store config | Not implemented |
| Retention approvals and legal holds | Privacy Officer/customer counsel signed schedule | Not provided |
| Privacy request/deletion dry run | Tested operator workflow, job log, object/database results | Not implemented |
| Backup/object-store expiry and restore | Provider configuration + measured restore drill | Not verified |
| PIPEDA breach record schedule | Restricted incident register (`/app/site-admin/incidents`, migration `0066`) and applicable-law review | Register implementation is present in source; target-host persistence, access, operational procedure, and drill are unverified. Where PIPEDA applies, retain the required breach records for 24 months from the determination date; counsel must confirm application and align the incident workflow. General incident notes may need a separate approved schedule. |
