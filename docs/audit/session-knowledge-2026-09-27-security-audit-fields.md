# Session knowledge — 2026-09-27 — audit outcome and request correlation

## Implemented slice

- Migration `0070_audit_outcome_request_correlation.sql` adds `outcome` and
  nullable `request_id` to `audit_log`, with a partial request lookup index.
  Existing rows are marked `unknown`: their historical result cannot be
  inferred. New records default to `success` unless a caller records a
  `denied` or `error` outcome.
- The request ID check is UUID-shaped. Server handlers generate the ID with
  `crypto.randomUUID()`, ignore client-supplied IDs, put it in the response
  `X-Request-ID` header, and write the same value to related audit events.
- The Drizzle and memory adapters preserve both fields. Tenant and platform
  audit APIs return them; the union audit view localizes outcomes in EN/FR, and
  the site-admin operator view displays the request ID.
- MFA verification and recovery-code rotation record success, denial, and
  error outcomes without storing submitted codes. Focused route tests now assert
  a denied event carries the response ID and has no metadata. The site-admin
  audit-list read also records its request ID. Incident operations already have a
  separate metadata-only table with outcome and request ID.
- Migration `0070` revokes UPDATE and DELETE from `unionops_app`; the app role
  can still append and read events subject to the existing tenant RLS policy.
  The RLS smoke now checks own-row read, cross-union denial, event field
  persistence, and runtime update/delete denial inside a rolled-back test.

## Scope limits

- This is a foundation, not complete audit coverage. Existing callers default
  to outcome `success` and usually omit `request_id`; failed login attempts,
  many authorization denials, exports, deletion, publication, and role changes
  still need explicit correlated outcome events. An audit row exists only when
  `AUDIT_DB_BACKEND=postgres`; hosted readiness must require and verify that
  setting before launch.
- The operator UI can see cross-union site-admin rows only through its
  existing owner-backed query. Tenant audit queries remain constrained to the
  authenticated union/local and existing RLS policy.
- Runtime privileges and source tests are not proof of a deployed migration.
  Confirm generated shape, fresh/upgrade migrations, RLS, and `unionops_app`
  append-only behavior in staging before launch.

## Verification and follow-up

- Passed: `node scripts/check-db-migrations.mjs` (71 journal entries),
  `node scripts/check-npm-audit.test.mjs` (four policy checks),
  `node scripts/check-security-workflows.mjs`, EN/FR catalog key parity
  (11,084 keys), audit columns in the 132-table checked-in DB shape, Node's
  TypeScript syntax check on the changed `.ts` adapters/routes/tests, and
  `git diff --check`.
- Could not run: Vitest, TypeScript typecheck, ESLint, generated Drizzle shape,
  or live Postgres/RLS smoke. `node_modules` is absent, `vitest`/`tsc`/`eslint`
  are unavailable, and no database is configured in this checkout.
- A repository-wide source scan finds audit writes across many API modules,
  including roles, exports, publication, and deletion. Most are success-path
  events without request IDs; implement and test high-risk route groups in
  separate slices, then reconcile the inventory against the route list.
