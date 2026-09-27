# Site Admin password-reset step-up (2026-09-27)

## Finding

The Site Admin forced-password-reset endpoint previously generated a reset
token, emailed it to the target account, then returned that token in the JSON
response. It also placed the target email address in audit metadata and had no
fresh MFA challenge or request correlation. A platform operator's browser and
audit records therefore received a usable credential-reset secret they did
not need to see.

## Implementation

- `POST /api/site-admin/users/[id]/force-password-reset` now requires a fresh
  MFA code when the host policy requires it. The action uses the shared
  verification attempt limits and fails closed if hosted production TOTP is
  unavailable.
- A server-generated request ID ties the step-up outcome, delivery
  authorization audit, and delivery result together. The intent audit is
  confirmed before reset-token creation and email dispatch.
- The reset token is included only in the transactional email sent to the
  target. It is not returned to the operator, placed in audit metadata, or
  exposed in failure responses. The target email address is also omitted from
  audit metadata.
- The route records a result after the email provider returns. If the result
  audit fails after dispatch, the response reports that the email may have
  been sent and instructs the operator to check before retrying. Provider
  details and SMTP configuration are no longer returned to the browser.
- The account-support form now uses a client challenge/resume flow with EN/FR
  error, retry-limit, audit-unavailable, delivery-failure, and uncertain-result
  messages. The capability summary was corrected to describe current controls
  rather than the deferred MFA rotation feature.

## Verification authored

Focused route tests cover missing-MFA denial before target lookup, correlated
successful delivery and secret/address redaction, pre-dispatch audit failure,
email failure, post-dispatch audit uncertainty, and archived-account denial.
Static route/test syntax, EN/FR JSON validity/key parity, and challenge
placeholder checks pass. Vitest, TypeScript, and browser verification cannot
run because dependencies are absent from this checkout. Hosted TOTP, durable
audit behavior, and actual email-provider delivery evidence remain pending.

## Remaining account-security review

This change covers Site Admin forced password reset; it does not implement a
separate operator-initiated MFA reset. Recovery-code rotation already requires
a fresh authenticator challenge. Fresh step-up is also now present for
union/local account assignment. Continue reviewing local archive/restore and
union membership-policy changes. An uncertain email dispatch must be checked
before retrying to avoid issuing multiple live reset links.
