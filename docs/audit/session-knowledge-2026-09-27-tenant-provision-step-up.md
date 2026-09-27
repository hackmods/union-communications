# Union/local provisioning step-up — 2026-09-27

## Finding

The Site Admin APIs and `/api/tenant` onboarding action could create a union,
local, or initial bargaining unit with only the current session. The access-
request inbox and onboarding wizard call these APIs, so all union-creation
paths needed a consistent control.

## Change

- `POST /api/site-admin/unions`, `POST /api/site-admin/locals`, and
  `/api/tenant` action `create_union` now validate their strict request bodies,
  then require a fresh MFA challenge before provisioning when host policy
  enables MFA. Hosted customer mode fails closed without production TOTP or
  durable audit; `/api/tenant` additionally requires durable tenant storage.
- All three routes issue server-generated request IDs and private/no-store
  responses. The authorization audit must append before tenant writes; result
  events correlate to the same request and omit the union name, local number,
  and MFA code.
- All three routes return explicit uncertain-result responses if tenant mutation
  may have started but result evidence cannot be confirmed. The caller must
  reload and inspect before retrying.
- The direct local-creation form, access-request inbox, and tenant onboarding
  wizard preserve pending inputs while asking for an authenticator or recovery
  code. They clear the code after submission and disable blind retries after
  an uncertain result.
- Added direct route cases for MFA denial, strict validation, authorization
  audit failure, successful correlated audit ordering, sensitive-value
  redaction, and post-write audit uncertainty.

## Verification and limits

The EN/FR catalogs parse and the new keys are present in both locales. The
security-workflow, npm audit policy, DAST target policy, and whitespace checks
pass. Node 24's TypeScript strip-only syntax check passes for the three API
routes and their direct test files; this is syntax parsing, not type checking.
The focused Vitest command was attempted but cannot run because `node_modules`
is absent (`vitest` is not recognized). TypeScript type checking, lint, browser
behavior, hosted TOTP, durable audit, and target-host Postgres/RLS remain
unverified. No migration was added.

## Follow-up

Run the focused route tests and onboarding/Site Admin browser journeys after
installing dependencies. Verify union/local isolation and audit behavior under
the restricted runtime role on the target host. Keep customer launch blocked
until those deployed checks are evidenced.

## Follow-up: invite-driven union creation

Later caller tracing found a fourth path: `POST /api/invites` accepts
`newUnionName` for platform administrators. Both the team and president invite
composers can use the “Other / Enter Union” scope. The route now requires fresh
MFA on that branch and, in hosted customer mode, Postgres-backed tenant and
audit stores. Existing-union invitations do not receive this provisioning
challenge.

The branch requires a local number before writing because it must create a
usable union and invitation in one flow. A server-generated request ID links
the authorization and final-result provisioning events; those events contain
no union name, invitation email/name, invitation token, local number, or MFA
code. The preexisting optional invite-email event continues to record its
recipient address and was not changed in this slice. If a write or provisioning
result audit is uncertain, the response omits the invitation token.
The invite composer retains form values for the MFA retry and disables further
submissions after an uncertain result or a lost response until the operator
reloads and inspects the union and invitation lists.

Direct route cases now cover missing MFA, hosted durability, pre-write audit
failure, successful audit ordering and redaction, uncertain post-write audit,
and the unchanged existing-union invite path. Node 24 syntax parsing is
available; Vitest, TypeScript, UI/browser behavior, and target-host TOTP,
Postgres, RLS, and audit verification remain pending because dependencies and
the production target are unavailable in this checkout.
