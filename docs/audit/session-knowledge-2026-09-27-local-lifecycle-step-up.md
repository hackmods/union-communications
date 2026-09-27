# Site Admin local archive/restore step-up — 2026-09-27

## Scope

This slice protects the Site Admin controls that hide a local from active
rosters or return it to active use. It covers the archive and restore APIs and
the `LocalArchiveButton` used by the Site Admin locals page. It does not change
who may archive or restore, the local lifecycle model, or the data-retention
meaning of an archive.

## Implemented behavior

- `POST /api/site-admin/locals/[id]/archive` and
  `POST /api/site-admin/locals/[id]/restore` accept only an optional `mfaCode`
  property. Both APIs require the Site Admin session and validate the request
  before invoking the shared fresh-MFA verifier.
- The challenge runs **before the local is read**. An absent or rejected code
  therefore cannot use the route to inspect target existence. Challenge
  outcomes are correlated with a server-generated request ID and omit the
  submitted code.
- After challenge success, the route reads only local ID and union ID. It
  appends an authorization event before updating the local. If that append
  fails, the route returns 503 and does not run the update.
- A second audit event records the mutation result, scoped to the local's
  union. Event metadata contains controlled phase/reason tags and local IDs
  only; it excludes challenge codes and local/member content. Responses are
  `private, no-store` and include the server request ID.
- If the result event fails after the update, the API returns
  `local_action_audit_unavailable`. If the database call throws after mutation
  begins, the route returns `local_action_outcome_unconfirmed`. Both outcomes
  instruct the operator to check state before retrying.
- The bilingual client UI first submits without a code, then resumes the same
  action after a server challenge. It displays distinct copy for a rejected
  code, throttling, MFA/audit unavailability, and uncertain mutation outcome.
  For an uncertain outcome it blocks another write and provides a status
  reload; after reload the rendered archive state determines the available
  action.

## Decisions and lessons

1. Archive and restore can change active membership/roster behavior, so they
   are privileged lifecycle actions even though they retain historical rows.
2. Requiring the challenge before target lookup keeps the API ordering simple
   and avoids leaking whether a local exists to an operator with no fresh
   challenge.
3. Audit availability is a write prerequisite. The pre-action event must
   append before the database call; a post-action audit failure cannot undo a
   committed update, so the response and UI must describe uncertainty rather
   than claim rollback.
4. A transport failure or database exception after the update starts may hide
   a committed write. The correct operator path is reload, inspect status, and
   only then decide whether a new action is needed.
5. These routes use the platform Site Admin gate. Tenant RLS and site-admin
   RLS behavior on the deployed `unionops_app` role still require live
   verification; this code change is not evidence that production database
   isolation is proven.

## Tests and evidence

`src/app/api/site-admin/locals/[id]/archive/route.test.ts` exercises both the
archive and restore handlers for:

- challenge before any database access;
- pre-action audit failure preventing the write;
- successful mutation with correlated union-scoped result audit and no code
  in audit metadata;
- post-write result-audit failure;
- database exception after the mutation begins.

The tests are authored but were not executed: this checkout has no
`node_modules`/Vitest installation. TypeScript, lint, and browser checks are
also unavailable. Static syntax, EN/FR locale parity, migration-journal,
security-workflow, and whitespace checks are run after this slice; they cannot
replace executing the route tests or checking the target host.

## Remaining checks

- Run the focused Vitest file and wider Site Admin route suite after restoring
  the project dependencies.
- Run TypeScript and lint checks; manually verify challenge, failure, and
  reload states in EN and FR at mobile and desktop widths.
- Verify `UNIONOPS_HOSTED_CUSTOMER_MODE=true`, production TOTP, durable audit
  storage, exact deploy migration state, and `unionops_app` RLS on staging.
- Verify the separate Site Admin union membership-policy step-up slice and
  review organization deletion, operator MFA reset, and remaining admin APIs
  for action-bound step-up.
- Confirm archive/restore semantics and any downstream roster cache/job
  invalidation with the product owner.

## Changed paths

- `src/app/api/site-admin/locals/[id]/archive/route.ts`
- `src/app/api/site-admin/locals/[id]/restore/route.ts`
- `src/app/api/site-admin/locals/[id]/archive/route.test.ts`
- `src/components/site-admin/LocalArchiveButton.tsx`
- `messages/en.json` and `messages/fr.json`
- `docs/LAUNCH_TRUST_LEGAL_REFACTOR.md`, `docs/PROGRESS.md`,
  `docs/audit/current-ground-truth.md`, `docs/guides/HOSTED_SECURITY.md`, and
  `AGENTS.md`
