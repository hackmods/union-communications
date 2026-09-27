# Subprocessor review step-up — 2026-09-27

## Finding

The registry exposes a second-admin review UI. Its POST handler is exported by
`src/app/api/site-admin/subprocessors/[id]/route.ts`, so the actual endpoint is
`POST /api/site-admin/subprocessors/{id}`. The Site Admin panel had been
posting to `/api/site-admin/subprocessors/{id}/review`, for which no route
exists. This made both approval and rejection fail at the API boundary.

## Review behavior

The panel now calls the mounted route and preserves the reviewer's exact
decision (`approved` or `rejected`), DPA status, review owner, and disclosure
attestation while a fresh MFA challenge is completed. The decision is frozen
for the request; review fields and other registry write actions are disabled
while the challenge is pending. MFA challenges, retry/rate-limit failures,
unavailable verification/audit, uncertain results, and refresh failures have
English and French UI states. An uncertain write or a confirmed write with a
failed register refresh blocks subsequent decisions until a successful status
reload.

The strict request body permits only the existing review fields plus optional
`mfaCode`. The route first requires the existing platform-admin, MFA-backed
session and durable registry Postgres. Hosted customer mode also requires
`AUDIT_DB_BACKEND=postgres`. After request validation it verifies fresh MFA
before reading the provider row. An intent event with a server-generated
request ID must append before RLS work. The RLS transaction retains the
existing second-admin rule for approval, updates the review, removes the
public projection after a rejection, and appends the internal review event.
The result event is correlated to the same request ID and required before the
route returns success. Audit metadata includes controlled phase/status
values, never the challenge code or reviewer free text.

The handler continues to store the review owner and record before/after values
in the restricted subprocessor register event, which is separate from general
audit metadata. Existing RLS and generated DB-shape checks still need to be
verified using the deployed runtime role.

## Tests added

`src/app/api/site-admin/subprocessors/[id]/route.test.ts` covers:

1. Fresh MFA is required before provider lookup.
2. Unknown request fields are rejected before MFA or database access.
3. Hosted customer mode refuses a memory-backed general audit service.
4. Failed intent audit prevents opening the RLS transaction.
5. Second-person approval writes the reviewed record and correlated result
   without placing the code or free-text owner in general audit metadata.
6. Self-review returns a denial without mutation.
7. Failed post-transaction result audit withholds success and reports an
   uncertain result.

The route test is authored but not executable in this checkout because
`node_modules`/Vitest is missing. No migration was needed. Target-host audit,
RLS, and database-role behavior are unverified.

## Local verification

- `node --experimental-strip-types --check` passed for the route and route test.
- `scripts/check-security-workflows.mjs` passed.
- EN/FR subprocessor message key and interpolation-placeholder parity passed
  for all 93 strings in the subtree.
- `git diff --check` passed (Git emitted only existing working-tree line-ending
  notices for unrelated files).
- Focused Vitest execution was attempted, but `vitest` is not installed in this
  worktree. Node's syntax checker does not support `.tsx`, and no TypeScript
  compiler or dependencies are present to parse/type-check the panel.

## Remaining work

- Run the route and full unit tests when dependencies are available; run
  TypeScript, lint, and browser checks for the review challenge flow.
- Verify intent/result rows persist under hosted `AUDIT_DB_BACKEND=postgres`
  and that the transaction's subprocessor event remains append-only.
- Verify EN/FR language and focus/status announcements in the rendered admin
  interface.
- Review actual provider evidence and DPA schedule with privacy/legal owners.
  Fresh MFA does not supply vendor verification or legal approval.

## Files changed

- `src/app/api/site-admin/subprocessors/[id]/route.ts`
- `src/app/api/site-admin/subprocessors/[id]/route.test.ts`
- `src/components/site-admin/SubprocessorRegistryPanel.tsx`
- `messages/en.json`, `messages/fr.json`
- `docs/LAUNCH_TRUST_LEGAL_REFACTOR.md`
- `docs/audit/current-ground-truth.md`
- `docs/PROGRESS.md`
- `docs/guides/HOSTED_SECURITY.md`
- `AGENTS.md`
