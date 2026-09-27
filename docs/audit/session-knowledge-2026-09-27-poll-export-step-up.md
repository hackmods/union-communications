# Poll result export MFA step-up (2026-09-27)

## Scope

Poll CSV and XLSX exports can contain free-text member responses even though
poll collection is described as anonymous. This change protects the export
route itself; it does not alter public poll collection, response storage, or
the product's anonymity claim.

## Implementation

- `POST /api/polls/id/[id]/export` accepts only `csv` or `xlsx` and an optional
  fresh MFA code. The previous query-string GET route returns 405 with
  `Allow: POST`.
- The route authenticates the polls capability, loads the poll definition, and
  checks union/local view scope before MFA. It does not load aggregates or
  free-text responses until `verifyFreshMfaStepUp` succeeds.
- Denial, throttling, lookup/generation errors, and successful delivery are
  correlated with a server-generated request ID. Audit metadata contains the
  format and coarse reason only; it excludes the MFA code and response data.
- The CSV/XLSX bytes are built before the success audit append, but are returned
  only after that append is confirmed. If the audit service fails, the route
  returns 503 without the file. Responses are private and non-cacheable.
- `PollsBoard` submits POST, retains the exact poll/format while prompting for
  a code, and provides localized failure, retry-limit, unavailable, and cancel
  states. EN and FR both received the challenge form strings.
- The hosted MFA `/updates` item describes Poll export step-up in both locales.

## Verification authored

Focused route cases cover challenge-before-aggregate ordering, rate limiting,
challenge-code and answer exclusion from audit, correlated CSV/XLSX success,
success-audit failure withholding, cross-scope denial, and GET retirement. The
Poll API route integration suite was updated to call POST and verify the old
GET path is closed.

Route/test syntax, recursive EN/FR JSON validity and key parity, poll
interpolation placeholder parity, migration journal validity, security
workflow checker, and `git diff --check` pass. Vitest, TypeScript, and browser
verification require dependencies that are not present in this checkout.
Hosted TOTP, durable audit, Postgres/RLS isolation, and production browser
evidence remain unverified.

## Follow-up

Review `GET /api/meetings/events/[id]/export` for RSVP response data using the
same action-bound step-up standard. Continue auditing other sensitive routes,
including organization deletion, MFA reset, platform audit/incident access,
and report summaries. This source change does not satisfy deployed audit/RLS
evidence or Packet 6 as a whole.
