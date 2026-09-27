# Session knowledge — invite activation Terms acceptance

**Date:** 2026-09-27
**Scope:** Packet 4 application slice: capture individual Terms acceptance during invite activation and strengthen organization DPA acceptance/status.
**Status:** Implemented in source; runtime and legal launch evidence remain open.

## What changed

- Added [`invite-terms.ts`](../../src/lib/public-documents/invite-terms.ts), which resolves the effective Terms publication through the Managed Documents public reader and returns a version ID, displayed version label, and localized title only when the document passes the shared approved/effective/bilingual contract check.
- Extended [`AcceptInviteForm.tsx`](../../src/components/hub/AcceptInviteForm.tsx) and the existing `/api/invites/[token]` API. The invite preview includes the current Terms version. The checkbox is unchecked by default, native form validation requires it, and the exact version ID is submitted with the selected locale.
- The API independently loads current Terms and checks the checkbox and exact version ID. Missing acceptance is rejected; a stale version receives HTTP 409; unavailable approved Terms blocks hosted activation. When a current Terms version exists, activation requires the durable Postgres auth backend on every host. Responses containing invite details are `private, no-store`.
- Extended [`acceptInvitePostgres`](../../src/lib/auth/invite-postgres.ts) to lock the invite and Terms head in its existing Postgres transaction, resolve the currently effective publication, validate the exact version, and write individual acceptance evidence under the invitee's RLS identity with `mfaVerified: false`. Acceptance, correlated audit metadata, user activation/membership changes, and invite completion commit atomically. A failed acceptance or audit insert rolls back activation.
- Extended [`acceptInvite`](../../src/lib/auth/invites.ts) to pass the evidence inputs to Postgres and reject attempts to represent durable Terms acceptance using the memory adapter.
- Extended the protected document acceptance status API and page to show the current effective DPA version number and acceptance timestamp only for the caller's current, non-archived union/local party when current authority and an MFA-verified session are present. The response is private/no-store and omits the accepting actor ID. Status reads use the existing tenant RLS context.
- Organization DPA writes now lock and confirm that the contracting union/local is still present and non-archived inside the RLS-scoped write transaction. Local/union identity continues to be derived from the actor session, and the insert policy rechecks current authority in the database.
- Added request correlation to signed-in Terms/DPA acceptance audit rows. The API derives the accepted party from the authenticated actor and current authority; clients cannot supply a party ID.
- Organization DPA acceptance now requires a fresh same-request MFA challenge whenever MFA is configured, in addition to the existing MFA-verified session, representative attestation, current authority, and active-party lock. Hosted customer mode fails closed unless TOTP is configured. Missing, failed, rate-limited, and unavailable challenges return their defined status and emit a correlated step-up audit outcome without recording the challenge code. Demo behavior follows the existing optional-MFA policy.
- DPA acceptance now share-locks the Managed Documents head, resolves the effective publication version inside the same transaction, and rejects/audits a publication change between requirement lookup and acceptance. The acceptance write and its audit remain in the same RLS-scoped transaction.
- The signed-in acceptance API now writes correlated denial audit events for invalid subject/scope, missing authority attestation, inactive accounts, stale party authority, missing current acceptance, and invalid request fields. It never records the MFA code or an unsanitized document slug.
- Linked the current union/local DPA version and acceptance timestamp into `/app/organization` settings. The existing protected acceptance surface remains available to review current documents and record pending acceptance; the status API excludes inactive accounts, non-MFA sessions, archived parties, and parties outside the caller's current authority.
- Added migration [`0076_invite_activation_acceptance_source.sql`](../../src/lib/db/migrations/0076_invite_activation_acceptance_source.sql) to allow `invite_activation` in the existing evidence-source check constraint. The Drizzle journal now has 77 entries. This migration changes no columns, indexes, RLS policies, or required generated DB shape. ADR-020 remains the deploy contract: Drizzle journal, owner migration URL, restricted runtime role, generated boot-shape verification.
- Added English and French invite copy for the checkbox, document link, and unavailable state. No Terms draft becomes effective by this code; the acceptance target must still be an approved, bilingual, effective Managed Document.

## Key behavior and decisions

- Invite activation is the account-creation/activation boundary because UnionOps Hub remains invite-only. No new registration flow was introduced.
- The invitee accepts as an individual account holder. Union/local DPA acceptance remains the separate signed-in organization flow and requires current authorized union/local authority, explicit authority attestation, and MFA. Ordinary members cannot submit organization acceptance.
- An effective Terms publication is required at invite activation even when `requiresAcceptance` is false. That flag governs future reacceptance gating for already active accounts; it does not exempt new invitees from agreeing to the current Terms.
- If publication changes after the preview but before activation, Postgres row locking and in-transaction revalidation reject the stale version. Refreshing the invitation displays the new version.
- The acceptance ledger is append-only and unique by document version and subject. A retry cannot duplicate evidence. If that exact user already accepted the same version in another flow, the unique conflict is treated as already-satisfied evidence while invite activation proceeds.
- `requestId` is generated by the server. Raw invite tokens, IP addresses, cookies, and document contents are not stored in acceptance/audit metadata.
- On hosted customer instances, no approved current Terms means activation returns unavailable rather than activating an account without an effective agreement. On non-hosted/demo instances with no effective approved Terms, the legacy invite flow remains usable.

## Source tests and checks

- Added route coverage for public Terms preview, unchecked acceptance, stale-version rejection, and hosted fail-closed behavior.
- Existing acceptance API tests cover personal acceptance without MFA, organization acceptance with MFA and union authority, fresh-challenge denial and challenge handoff, correlated challenge audit without code disclosure, direct subject-bypass denial audit, publication-change rejection, local acceptance only by the current local president/vice-president, archived/missing party denial, current status response, inactive-account denial, and audit correlation.
- Added migration-source assertion for the `invite_activation` evidence value.
- Passed `node scripts/check-db-migrations.mjs` — 77 valid journal entries.
- Passed `node scripts/check-security-workflows.mjs`.
- Passed EN/FR JSON parsing, organization-message key parity, and `git diff --check`. A full message-catalog parity check also found a pre-existing missing French `officerLearning.diagrams.filterTitle`; added its translation while validating locale parity.
- Could not execute focused Vitest tests because `vitest` is not installed in this checkout; no dependency install was attempted.

## Remaining Packet 4 work / evidence

- Run focused and full unit suites, TypeScript, and lint in a dependency-equipped checkout.
- Run the migration through the ADR-020 owner migration path and exercise acceptance with the restricted runtime role against Postgres/RLS. Verify rollback on acceptance/audit failure, concurrent publication, invite retries, unique conflict, stale invite, archived/locked account, archived union/local, and current authority changes.
- Confirm acceptance/audit records are readable by the appropriately restricted compliance/site-admin role and hidden across tenant boundaries. Prove direct API bypasses and disabled/missing database configuration on a target-like stack.
- Organization DPA acceptance uses the existing `/documents/acceptance` flow and signed-in acceptance ledger; status is linked from `/app/organization`. Validate fresh-challenge wording and approval with the qualified reviewer. Verify party row locking, TOTP verifier operation, authority revocation, and the status query's tenant RLS behavior against live DB state.
- Obtain qualified approval and effective publication of Terms and DPA. No legal text, authority attestation language, party, effective date, or notification promise is approved by this engineering change.
- No production host was accessed, no database migration was applied to a target, and no user data was changed.

## Handoff

Continue in the same repository from the Packet 4 commit recorded in `docs/PROGRESS.md`/the current session. Start by checking the worktree and commit status, then execute the targeted tests when dependencies are available. Do not mark Packet 4 or launch complete until legal approval and deployed Postgres/RLS evidence are attached to the launch tracker.
