# Union membership-policy step-up — 2026-09-27

## Scope

This slice protects the Site Admin change to a union's membership policy:
whether a member may have multiple active local memberships or only one. It
covers `PATCH /api/site-admin/unions/[id]` and the policy section in
`CreateLocalForm`. Local creation and collective creation remain separate
actions and were not changed here.

## Implemented behavior

- The API continues to require a Site Admin session and configured Postgres.
  It validates the policy and optional MFA code before calling the shared
  fresh-MFA verifier; unknown request fields are rejected.
- Fresh MFA is required under the active host policy before looking up the
  union or reading the multiple-local impact aggregate. Challenge responses
  include a server-generated request ID, are private/no-store, and are
  outcome-audited without the submitted code.
- After confirming the union exists, the API appends a correlated
  `policy_change_authorized` audit event before reading the impact count and
  before the write. An audit outage prevents both the aggregate query and the
  policy update.
- The `single_local` impact count remains scoped by `union_id`, active status,
  and `ended_at IS NULL`; it is returned to the operator so existing members
  can be reconciled. The count is not copied into audit metadata.
- The policy update writes directly to the same Postgres `unions` table used by
  the former helper. A separate correlated result event records the selected
  policy. If the write or its result event is uncertain, the response asks the
  operator to check settings before retrying.
- The bilingual UI preserves and freezes the selected policy while a challenge
  is pending, allows cancel, distinguishes denied/throttled/unavailable
  challenges, and blocks another save after an uncertain result until the
  operator reloads settings.

## Decisions and lessons

1. A change to the single-local rule affects future account assignment and may
   expose existing policy conflicts; treat it as a privileged configuration
   change, not a harmless preference.
2. Challenge before reading the multi-local count. The count remains
   union-scoped and is used only to warn the authorized Site Admin.
3. Write intent audit before the membership aggregate and mutation. This
   fail-closed ordering preserves evidence of authorized changes and avoids
   doing member-impact work when audit storage is down.
4. The update is a single SQL statement. A connection error during/after that
   statement can make commit state ambiguous, so the API/UI use an uncertain
   result path rather than tell the operator that no change occurred.
5. Source-level union filtering does not prove deployed Postgres RLS. Verify
   the exact `unionops_app` role and platform-admin policy on staging.

## Tests and evidence

`src/app/api/site-admin/unions/[id]/route.test.ts` adds direct cases for:

- fresh-MFA enforcement before database access;
- strict body rejection before MFA;
- pre-action audit failure preventing aggregate reads and writes;
- successful update, scoped impact count, audit ordering, correlation, and
  omission of the challenge code;
- post-update audit failure and a database error during the write.

Tests are authored but not executed because this checkout has no installed
Vitest dependencies. TypeScript, lint, and browser checks are also unavailable.
Static route syntax, EN/FR key and interpolation parity, migration-journal
JSON, security-workflow contract, and whitespace checks passed for this slice.

## Remaining checks

- Execute the route tests, TypeScript, and lint when dependencies are restored.
- Exercise the bilingual challenge/reload states in browser tests.
- Verify Postgres write permissions/RLS and audit durability on the hosted
  target. No migration was added.
- Confirm policy-change authority and wording with the product/security owner.
- Continue the privileged-route inventory, including organization deletion,
  operator MFA reset, and any remaining Site Admin mutations.

## Changed paths

- `src/app/api/site-admin/unions/[id]/route.ts`
- `src/app/api/site-admin/unions/[id]/route.test.ts`
- `src/components/site-admin/CreateLocalForm.tsx`
- `messages/en.json` and `messages/fr.json`
- `docs/LAUNCH_TRUST_LEGAL_REFACTOR.md`, `docs/PROGRESS.md`,
  `docs/audit/current-ground-truth.md`, `docs/guides/HOSTED_SECURITY.md`, and
  `AGENTS.md`
