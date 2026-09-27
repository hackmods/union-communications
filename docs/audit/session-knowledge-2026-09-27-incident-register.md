# Session knowledge — 2026-09-27 — restricted incident register

**Scope:** Packet 7 source slice for the UnionOps-operated platform incident
register. This does not implement customer-tenant incident workspaces.

## Data and authorization boundary

- Migration `0066_platform_incident_register.sql` creates three platform-wide
  tables: `platform_incidents`, `platform_incident_audit_events`, and
  `platform_incident_step_up_grants`. Drizzle definitions are in
  `src/lib/db/schema/incidents.ts`.
- `/app/site-admin/incidents` is the operator page. APIs are
  `/api/site-admin/incidents`, `/api/site-admin/incidents/step-up`,
  `/api/site-admin/incidents/[id]`, and
  `/api/site-admin/incidents/[id]/export`. Every API invokes its own
  `authorizeIncidentAdmin()` check; the page gate is not relied on to protect
  API calls.
- Access requires a platform-admin session, a configured Postgres connection,
  `AUTH_USERS_BACKEND=postgres`, and TOTP mode. Each read, create, update, or
  export requires a new challenge. The server stores only a SHA-256 digest of
  the 256-bit token and binds it to actor, action, optional incident ID, and a
  60-second expiry. The grant is atomically consumed once.
- Authenticated invalid TOTP challenges are recorded as metadata-only
  `step_up_failed` events. A transaction advisory lock serializes per-actor
  checks; five failed attempts within 15 minutes result in HTTP 429. The
  implementation does not store the submitted code.
- Incident records are non-deletable by the runtime role. Audit rows contain
  actor, incident ID, server-generated request ID, fixed action, outcome, and
  timestamp only; they must never contain the incident narrative. Database
  triggers and privileges make the audit append-only, bind inserted actor IDs
  to the current RLS user, and set server timestamps. Incident creator and
  creation time cannot be rewritten; update actor/time are database-stamped.
  Step-up grants are actor-scoped by RLS; the DB trigger permits only the
  one-time `consumed_at` transition.
- The structured incident record includes optional occurrence time, required
  discovery time, affected service, data categories, affected group categories,
  optional aggregate individual estimate, scope, containment, risk, notification
  decision/date/rationale, remediation, lessons, status/closure, and optional
  last review date. Closure and reopening have distinct audit actions. It has
  no individual name/contact fields.
- Controlled JSON export covers one incident and up to 500 newest related
  access/action metadata events. Export itself creates an audit event. Listing
  is capped at 250 records and 200 recent events; there is no search or
  pagination yet.
- The UI is EN/FR and warns against member names/contact details, grievance or
  casework facts, credentials, tokens, and unnecessary detail. React escapes
  displayed text; there is no HTML rendering path. Client-held records clear
  after five minutes without form/code activity, and operators can lock the
  register manually.

## Important limits

- This is an internal evidence register, not a legal decision tool. It does not
  tell an operator whether to notify a regulator, union, member, or customer.
  The Privacy Officer/counsel must assess applicable law and contract, document
  the rationale, and approve final notification decisions.
- No incident is seeded and no notification or incident drill was performed.
  There is still no full privacy access/correction/deletion request workflow.
- No incident retention period was selected. Expired step-up grant rows are
  inert but currently have no scheduled cleanup. Both are open Packet 7 work.
- The initial incident-register slice accepted the existing verifier's current
  +/- one time-step window without recording which counter matched. The
  follow-up [TOTP replay slice](session-knowledge-2026-09-27-totp-replay.md)
  now stores the latest accepted counter and atomically rejects reuse. This is
  source-level evidence only until the migration is generated/deployed and the
  live Postgres/RLS smoke succeeds.
- The app role/RLS contract is source-reviewed only. This checkout has no
  `node_modules` or live Postgres. The required-shape file was updated manually;
  run the official Drizzle contract generator/check before image build or DB
  deploy. Run live RLS/direct-API tests under `unionops_app` before customer
  records are entered.
- The migration is append-only after `0065`; the Drizzle journal now has 67
  entries. Do not retrofit these definitions into a second migration ledger.
- Self-hosted operators are responsible for their own incident register,
  privacy/breach process, storage, access control, retention, and evidence.
  This page is only for UnionOps platform operations.

## Tests and checks added

- `src/lib/site-admin/incident-validation.test.ts`: record field constraints,
  strict unknown-field rejection, and action/resource step-up binding.
- `src/lib/site-admin/incident-http.test.ts`: requires site-admin auth,
  Postgres-backed accounts/storage, and TOTP configuration.
- `src/app/api/site-admin/incidents/route.test.ts`: verifies direct API
  requests are rejected before data access when the site-admin gate fails.
- `src/lib/db/rls-contract.test.ts`: checks incident RLS, runtime delete
  blocking, append-only audit, and one-way step-up consumption.
- `scripts/rls-smoke.ts`: the live `unionops_app` smoke now verifies that a
  union-scoped president cannot read the platform incident register or its
  step-up grants.
- Locally verified: migration journal/file check (67 entries), EN/FR recursive
  key parity, required-shape table presence, npm audit policy harness, and
  `git diff --check`. Vitest, TypeScript, ESLint, official shape generation,
  live DB/RLS, and a drill remain unverified due to missing dependencies/host.

## Lesson

Treat an incident record as sensitive casework even though it is platform-level.
Keep incident facts in the restricted register, operational errors in telemetry,
and access evidence in a metadata-only append-only table. RLS and a page-level
role gate are not enough: every API should independently require fresh
action-bound authentication and a durable audit record.
