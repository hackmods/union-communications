# Site Admin local provisioning step-up — 2026-09-27

## Finding

`POST /api/site-admin/locals` created or found a local and could create a
bargaining unit after only the current Site Admin session check. Other
high-impact Site Admin changes, including membership-policy updates and local
archive/restore, already required fresh MFA. The local-create form did not
have its own challenge flow.

## Change

- Require fresh MFA after strict body validation and before division lookup or
  local/bargaining-unit writes. MFA verification remains conditional on the
  configured host policy; hosted customer mode fails closed without TOTP.
- Add a server-generated request ID and private/no-store responses. Require a
  correlated authorization audit before writes, then record the result without
  local number, MFA code, or member information.
- If a write may have started but the route cannot confirm the result, return
  `local_result_unconfirmed`; the form freezes the local create and tells the
  operator to reload the directory before retrying.
- Add EN/FR challenge, retry, unavailable, and uncertain-result states to
  `CreateLocalForm`. Keep membership-policy challenge state independent from
  local provisioning state.
- Add direct route tests for MFA denial, strict validation, pre-write audit
  failure, successful correlated audits/code redaction, and uncertain result
  after a write.

## Verification and limits

The route test is authored but cannot run in this checkout because dependencies
are not installed. TypeScript, Vitest, browser behavior, hosted TOTP, durable
audit, and target-host Postgres/RLS evidence remain unverified. No schema or
migration change was required. Follow-up work added fresh-MFA protection to
`POST /api/site-admin/unions` and wired both API responses into the access-request
inbox; see [`session-knowledge-2026-09-27-tenant-provision-step-up.md`](session-knowledge-2026-09-27-tenant-provision-step-up.md).

## Follow-up

Run `npm run test:unit -- src/app/api/site-admin/locals/route.test.ts` after
dependencies are available, exercise the bilingual Site Admin form, and verify
the authorization/result records under the restricted runtime database role.
