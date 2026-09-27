# Site Admin cross-tenant audit access step-up — 2026-09-27

## Scope

This slice protects the host-wide Site Admin action log at
`/api/site-admin/audit`. The route may use the owner database to read records
whose `union_id` is outside the runtime operator's normal tenant scope. It
covers the audit-log API and `OperatorAuditClient`; it does not alter tenant
Audit pages or audit event retention.

## Implemented behavior

- The API now uses `POST` with a strict JSON body containing an optional
  `limit` (1–200, default 100) and optional `mfaCode`. Unknown fields are
  rejected. `GET` is retired with `405 Allow: POST`, so a verification code
  cannot enter a query string, browser history, or URL logs.
- After Site Admin authorization and body validation, the route requires a
  fresh challenge under the shared host MFA policy before querying any audit
  rows. Denied, throttled, and unavailable challenges are correlated and do
  not record the code.
- The API appends a `read_authorized` event before the cross-tenant query. If
  that append fails, the query is skipped. After querying, it appends a
  `read_result` event with row count and whether the owner DB path was used. If
  result evidence fails, the route withholds all rows and returns a 503.
- Every response is `private, no-store` and carries a server-generated request
  ID. Audit event metadata contains phase/reason, bounded limit/count, and
  owner-read mode only; the returned audit entries are not copied into the
  access event.
- `OperatorAuditClient` performs the POST without a code on first load, shows
  an EN/FR challenge when required, and resubmits the same bounded request with
  the code. It handles rejection, throttling, audit/MFA unavailability, and
  unconfirmed result evidence without rendering unconfirmed rows.

## Decisions and lessons

1. The Site Admin audit view is cross-tenant and can bypass ordinary tenant
   row visibility through the owner connection; it deserves a fresh challenge
   even though the session is already Site Admin-authorized.
2. A GET query parameter is not an acceptable MFA transport because URLs may
   be retained in history, proxies, or logs. Use a private no-store POST body.
3. For sensitive reads, pre-access audit confirms intent and post-read audit
   confirms what the response contained. Fail closed if either event cannot be
   appended; do not return rows after an unconfirmed result event.
4. `read_authorized` can appear in the returned recent rows because the intent
   event is appended before querying. The result event is necessarily newer
   than the query and appears on a subsequent view. This is acceptable and
   gives the current read a durable intent record before data access.
5. This slice does not prove `unionops_app` cannot query cross-tenant audit
   rows, nor does it prove the owner database is least-privilege. Verify both
   roles and grants on staging/production.

## Tests and evidence

`src/app/api/site-admin/audit/route.test.ts` adds cases for:

- fresh MFA before any audit query;
- strict request validation before MFA;
- pre-access audit failure preventing the query;
- successful returned rows only after correlated intent and result events;
- result-event failure withholding the rows;
- retirement of the GET path.

Tests are authored but could not be executed because this checkout has no
installed Vitest dependencies. TypeScript, lint, and browser checks are also
unavailable. Static route syntax, locale parity, migration-journal, workflow,
and whitespace checks are to be rerun after this slice.

## Remaining checks

- Run the route test, TypeScript, lint, and browser challenge/retry checks when
  dependencies are available.
- Verify the Postgres audit backend, owner connection least privilege, runtime
  `unionops_app` RLS, and append-only permissions against the deployed schema.
- Confirm the audit page's 100-row default and cross-tenant visibility model
  with the security owner.
- Continue action-bound review of remaining Site Admin mutations and exports.

## Changed paths

- `src/app/api/site-admin/audit/route.ts`
- `src/app/api/site-admin/audit/route.test.ts`
- `src/lib/site-admin/api-routes.test.ts` (GET retirement and POST route update)
- `src/components/site-admin/OperatorAuditClient.tsx`
- `messages/en.json` and `messages/fr.json`
- `docs/LAUNCH_TRUST_LEGAL_REFACTOR.md`, `docs/PROGRESS.md`,
  `docs/audit/current-ground-truth.md`, `docs/guides/HOSTED_SECURITY.md`, and
  `AGENTS.md`
