# Expense export fresh MFA step-up — 2026-09-27

## Scope and outcome

Packet 6 now covers the expense export boundary. The spreadsheet, PDF, and
receipt ZIP downloads are generated through `POST /api/expenses/[id]/export`.
The previous query-string `GET` path explicitly returns 405, so an older client
cannot use it to bypass a challenge.

The route authenticates first, then verifies that the current session may view
the requested expense in its union/local scope. It returns the same 404 for a
missing or out-of-scope submission and does not request MFA for that attempt.
Only after the tenant check succeeds does it call the shared fresh-MFA verifier.
The challenge code stays in the JSON request body and is never added to audit
metadata.

Successful exports are generated in memory, then an `expenses.export` success
event is appended with actor, tenant, resource, format, outcome, and a
server-generated request ID. The binary is returned only after that audit
append succeeds. If it fails, the route returns `503 export_audit_unavailable`
with no file bytes. Generation errors are reported to the error sink and make a
best-effort error audit entry. All route responses, including binary downloads,
carry `Cache-Control: private, no-store` and the same server-generated request
ID used by the audit entry.

`ExpensesBoard` now POSTs the requested format. When the server returns 428,
the board keeps the exact submission and format pending, describes that action,
and asks for a six-digit authenticator code. EN and FR cover the prompt,
invalid/limited/unavailable challenge states, export audit outage, and cancel.
The challenge input uses `one-time-code`, numeric input, and six-digit
validation.

## Tests and evidence

Added `src/app/api/expenses/[id]/export/route.test.ts` for:

- Direct API denial with no code before export generation.
- MFA throttling and absence of the code from audit calls.
- Successful correlated audit and download response headers.
- Fail-closed behavior when the success audit cannot be confirmed.
- Cross-scope 404 before step-up or file generation.
- Correlated unavailable response if the expense store cannot be read.
- Retirement of the legacy GET route.

Updated `src/lib/expenses/api-routes.test.ts` to use POST for its authorization
and real export-flow cases and to assert the old GET path is rejected.

Vitest, TypeScript, and ESLint could not be run in this checkout because
`node_modules` and the package executables are absent. The packet's
dependency-free static checks are recorded in
`docs/LAUNCH_TRUST_LEGAL_REFACTOR.md`; live Postgres/RLS, hosted TOTP, and
durable audit behavior still need target-host evidence.

## Decisions and limitations

- MFA is checked after tenant authorization so an unauthorized party cannot
  use the endpoint to probe the challenge path for another local's expense.
- All formats share the same step-up and audit path because each exposes
  submitted expense/receipt information.
- The route intentionally uses POST so the code is not logged in a query URL.
- The GET path remains present only to return an explicit 405 with `Allow:
  POST`; it never authenticates or generates an export.
- Audit append is not transactional with export generation. The file is held
  in memory and not delivered when the success append fails. The retry is safe
  from a mutation perspective, but the operator should verify audit service
  health before repeated attempts.
- Outside active MFA policy, the shared helper may return success without a
  challenge. UnionOps-operated customer mode must be configured with production
  TOTP; that profile fails closed when its requirements are missing.
