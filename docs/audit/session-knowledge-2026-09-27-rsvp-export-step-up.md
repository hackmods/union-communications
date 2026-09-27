# Meeting RSVP export MFA step-up (2026-09-27)

## Scope

Meeting RSVP rosters can contain member names, email addresses, phone numbers,
attendance choice, guest count, dietary/accessibility notes, and officer-entered
walk-in details. The export endpoint now requires a same-request fresh MFA
challenge when host policy requires MFA. This does not change the existing
response-view API or storage lifecycle; their access and retention still need
separate review.

## Implementation

- `POST /api/meetings/events/[id]/export` accepts an optional MFA code and
  rejects unknown request fields. The former CSV GET endpoint returns 405 with
  `Allow: POST`.
- Authentication and union/local meeting visibility checks run before the
  challenge. `listResponses` and CSV generation run only after fresh MFA
  succeeds.
- Denied, throttled, and successful events use a server-generated request ID.
  Audit metadata has only a coarse reason; attendee names, contact details,
  notes, and codes are excluded.
- CSV bytes are generated before the success audit but returned only after the
  correlated append succeeds. Audit failure returns 503 and no file. Responses
  use `private, no-store`.
- `MeetingEventsBoard` now uses POST, preserves the selected meeting through the
  challenge, and has a localized retry/cancel form. Switching meetings cancels
  an outstanding challenge prompt. The EN/FR hosted-MFA `/updates` item now
  describes meeting roster exports.

## Verification authored

Focused route cases cover challenge-before-response-read ordering, throttling,
challenge-code and attendee-data exclusion from audit, correlated successful
CSV, audit outage withholding, out-of-scope denial, and GET retirement. The
meeting API integration suite adds a real memory-store cross-union denial and
legacy GET check.

Static syntax checks, EN/FR key and placeholder parity, migration journal,
security-workflow contract, and `git diff --check` pass. Vitest, TypeScript,
and browser checks require dependencies absent from this checkout. Hosted
TOTP, audit durability, Postgres/RLS, and production browser evidence remain
unverified.

## Follow-up

The Hub meeting detail API also returns RSVP rows to authorized viewers and
does not yet require a fresh challenge. Confirm whether the application's
existing authenticated-session and role boundary is sufficient for viewing,
or whether selected high-risk reads should also use action-bound step-up.
Review retention and deletion of RSVP fields with the Packet 7 data schedule.
Packet 6 as a whole remains incomplete.
