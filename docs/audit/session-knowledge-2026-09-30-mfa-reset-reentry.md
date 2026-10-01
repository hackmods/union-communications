# Session knowledge — 2026-09-30 — MFA reset re-entry

## Contract

- Site Admin authenticator reset arms a durable 24-hour `mfaReenrollGraceUntil`
  value. This is a recovery window, not a general MFA bypass.
- `/api/mfa/status` reports `reenrollGrace: true` and `required: false` while
  that window is active so the MFA journey can explain reset recovery.
- `sessionMfaOk()` and protected page/API guards still require a verified
  session. `mfaVerified` stays false after the session-version bump. Sensitive
  routes and fresh-MFA step-up checks remain protected until setup completes.
- When `/app/mfa?next=...` sees reset grace, it links directly to
  `/app/mfa/setup?next=...`. The Hub banner uses the current safe path as the
  return target, so re-enrollment resumes the task that triggered the challenge.
- Confirmed setup persists the new secret, clears grace, and issues a one-use
  grant against the post-enrollment session version. Only then does the
  original protected destination resume.

## Evidence and limits

`mfa-routes.test.ts` verifies the grace status response while also asserting
that `sessionMfaOk()` continues to deny the unverified session. The focused
route, policy, and return-path suite passed (46 tests); `tsc --noEmit` passed.
Browser navigation through an actual site-admin reset and deep return path is
still open for Phase 5. Do not turn reset grace into a session claim or a
general guard exception: RLS and application authorization may require the
verified MFA claim independently.
