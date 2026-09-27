# Payroll export fresh MFA step-up — 2026-09-27

## Scope and outcome

Packet 6 now covers the local Time module's optional payroll webhook. The
endpoint remains `POST /api/time/payroll-export`; it uses the existing local
payroll profile and sends only approved time entries for the selected period.
This is union staff time export preparation, not employer bargaining-unit
payroll processing.

The route authenticates and checks the time-admin capability, validates the
request, and resolves the active payroll profile inside the actor's current
union/local scope. It then requires the shared fresh-MFA challenge before
loading approved entries, worker data, or overtime policy. The profile ID, date
range, and challenge code are in the POST body. The code is never logged.

Before calling the configured webhook, the route appends a correlated
`time.payroll_export.requested` event with row count and a boolean indicating
whether a webhook is configured. If that append fails, the webhook is not
called. After dispatch, `time.payroll_export` records row count and the
webhook's boolean/HTTP status, with no employee details or webhook URL. If
that result append fails after dispatch, the API returns
`503 payroll_result_audit_unavailable`; the response and bilingual UI tell the
operator the webhook may already have received the file and to verify delivery
before retrying. If the webhook returns a non-success response but audit works,
the CSV is still downloaded with `X-Payroll-Webhook-Ok: false`, and the UI
shows a localized warning. API responses use `private, no-store` and a
server-generated request ID.

`TimeFullAdminPanel` keeps the exact profile and period pending after the
server's 428 response. The user sees the selected profile, dates, and a note
that a configured webhook may receive the rows. The EN/FR form uses a fresh
six-digit authenticator code, handles verification/rate-limit/service/audit
failures, and offers cancellation. Changing the selectors after the initial
request cannot silently alter the pending action.

## Tests and evidence

Added `src/app/api/time/payroll-export/route.test.ts` for:

- Missing-code direct API denial before row reads or webhook dispatch.
- MFA throttling and code omission from audit calls.
- Local profile hiding before MFA.
- Correlation and pre-dispatch audit ordering.
- Stopping before webhook when the first audit append fails.
- Returning CSV with an explicit false result when the webhook rejects rows.
- Warning after a webhook call if the result audit append fails.

The existing `src/lib/time/attachments-admin-routes.test.ts` still covers the
local profile scoping and CSV content path. It could not be run here because
`node_modules` is absent and `vitest` is unavailable. Target-host TOTP,
Postgres/RLS, durable audit, webhook delivery, and duplicate-delivery behavior
remain unverified.

## Decisions and limitations

- Fresh MFA runs after local profile authorization but before employee rows
  are queried or sent to an external destination.
- A pre-dispatch audit event is mandatory so audit failure can stop an external
  side effect. A result audit is also appended after webhook completion.
- The network call and audit store cannot participate in one transaction.
  Exactly-once webhook delivery is not guaranteed if the receiver accepts a
  request but the response or final audit is lost; operators must verify the
  receiver before retrying on the explicit result-audit error.
- The response still downloads CSV if the webhook reports failure, matching
  the existing behavior. The false header and localized warning make that
  partial result visible.
- Outside active MFA policy, the shared helper may return success without a
  challenge. UnionOps-operated customer mode must be configured with production
  TOTP and fails closed when those requirements are missing.
