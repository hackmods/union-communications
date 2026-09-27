# Casework attachment download audit ordering — 2026-09-27

## Scope

This slice hardens the existing grievance, bumping, time-entry, and explicitly
shared member Portal attachment download routes. It does not change case/time
authorization, attachment metadata storage, object storage, or Managed
Documents. The file bytes can contain sensitive member information, so the
hosted path must not read or return them when the durable authorization or
delivery audit cannot be confirmed.

## Changes

- The routes retain their existing session, tenant/local case or time-entry
  visibility, explicit Portal share, and clean-scan checks before recording
  the download intent.
- Each route appends a correlated `download_authorized` event before calling
  `attachmentStore.readBytes()` and a `download_delivered` event before
  returning the file response. Failure to append the authorization event stops
  the read; failure to append the result event withholds the response bytes.
- Missing or failed storage reads receive metadata-only error events where the
  audit adapter is available. Event metadata contains only a controlled phase,
  never the case narrative, filename, object key, or file content.
- In UnionOps hosted customer mode, attachment metadata and the general audit
  adapter must both be Postgres-backed. Time-entry photo downloads also require
  the time-entry backend to be Postgres-backed. Development and self-hosted
  behavior keeps its existing operator-controlled profile.
- These routes remain available to case-authorized basic members without a new
  fresh-TOTP challenge. Requiring a challenge here would force enrollment on a
  member-visible surface, contrary to the current hosted role policy. Existing
  session MFA requirements for privileged roles and case visibility continue
  to apply.

## Verification

Route syntax checks and `git diff --check` pass. The grievance/bumping
attachment route test file asserts correlated intent/result events, hosted
durability gating, and authorization-audit failure. The existing time-entry
and Portal route suites cover their prior access boundaries. Vitest cannot run
because dependencies are absent, and the Node test runner cannot create workers
in this Windows sandbox (`spawn EPERM`). Hosted Postgres, RLS, audit
append-only privileges, and object-storage behavior remain unverified.

## Follow-up

Run focused attachment API tests with restored dependencies. On the target
host, verify `ATTACHMENTS_DB_BACKEND=postgres`, `AUDIT_DB_BACKEND=postgres`,
case-level RLS, audit ordering, scanner behavior, and object storage. Continue
reviewing high-impact routes for uncorrelated or post-read audit events.
