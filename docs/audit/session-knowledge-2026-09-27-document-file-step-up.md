# Hub document file access and deletion step-up — 2026-09-27

## Scope and source distinction

This slice hardens the existing Hub Local Documents Vault at `/app/documents`.
It is the older union-scoped file store in `src/lib/documents`; it is not the
Managed Documents policy/version system reported merged to `main`, which is
still absent from this checkout. No legal-policy source or second document
store was introduced.

## Changes

- Download changed from `GET /api/documents/[id]/download` to `POST` with an
  optional strict JSON `mfaCode`. The legacy GET endpoint returns 405.
- The API validates signed-in Hub access, union/local scope, and clean scan
  status before requiring a fresh MFA challenge. In hosted customer mode it
  fails closed unless both attachment metadata and security audit use Postgres.
- A correlated authorization audit must append before file bytes are read. A
  separate correlated delivery result must append before bytes are returned.
  Responses are private/no-store. Audit metadata contains no title, filename,
  storage key, file bytes, or challenge code.
- Document deletion now accepts the same strict challenge body. It validates
  tenant/local visibility and existing shared-content delete authority first,
  then requires fresh MFA. A correlated intent audit must append before
  `documentStore.remove`; a result event follows. A write or result-audit
  uncertainty returns a no-blind-retry code.
- The bilingual Vault uses fetch/blob download rather than a direct link and
  presents a challenge only when the server requests it. Network loss or an
  uncertain delete locks further file actions until the operator reloads and
  checks the Vault. The existing hosted-MFA `/updates` note now includes file
  downloads and deletions.
- The shared-content delete policy remains enforced server-side: the actor
  must be able to view the document's tenant/local scope and either own the
  upload or hold a role authorized to delete shared content. UI visibility is
  not relied on for that decision.
- Added focused route cases for MFA, tenant boundaries, hosted durability,
  audit ordering/fail-closed delivery, legacy GET retirement, deletion, and
  uncertainty. Updated the existing document API integration harness for the
  new route methods.

## Verification and limits

Node 24 strip-only syntax checks, EN/FR recursive key parity, security-workflow,
dependency-audit-policy, DAST target-policy, and `git diff --check` pass.
Vitest cannot run because `node_modules` is absent (`vitest` is not recognized).
The Node built-in test runner also could not start its test workers in this
Windows sandbox (`spawn EPERM`). TypeScript, ESLint, browser behavior, live
object storage, deployed Postgres/RLS, TOTP, audit append-only privileges, and
target-host backend configuration are unverified. No migration was added.
This change covers the existing Hub vault;
it does not verify or replace the Managed Documents implementation.

## Follow-up

Run the focused route tests and document-vault browser flow after restoring
dependencies. Verify the hosted attachment metadata/object storage and audit
configuration with the target operator; test cross-local denial and runtime
RLS as `unionops_app`. Keep document download/deletion claims tied to that
evidence and continue Packet 6's remaining sensitive-action route review.
