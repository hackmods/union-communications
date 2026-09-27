# Demo purge hosted-customer guard — 2026-09-27

## Finding

`POST /api/site-admin/demo/purge` is a destructive operator path. Its explicit
feature flag defaults off and it already requires platform-admin authorization,
Postgres, the owner migration connection, the exact `DELETE demo` phrase, and
password reauthentication. However, an environment mistake could turn that
demo-only function on for a UnionOps-operated customer host.

## Change

The shared `isDemoPurgeEnabled()` gate now always returns false for the hosted
customer profile. This hides the UI and blocks both preview and purge APIs even
when the demo flag is set. The purge API also has an explicit profile check
after Site Admin authorization. The owner-DB CLI independently refuses to run
in hosted customer mode before opening a database connection. This check takes
precedence over demo flags, database lookups, confirmation parsing, and the
destructive owner-connection path.

Demo/workshop hosts retain their existing opt-in path. The route change does
not implement customer union/local deletion, export-before-delete, legal holds,
retention scheduling, or deletion evidence. Those remain Packet 7 work and
release blockers.

## Verification

Added regression cases to `src/lib/features/demo-purge.test.ts` for both hosted
flag encodings, and to `src/lib/site-admin/api-routes.test.ts` for a hosted
request with the feature flag enabled. The focused Vitest tests are authored
but could not be run in this worktree because `node_modules`/Vitest is absent.
`node --experimental-strip-types --check` passed for the route, shared feature
gate, both regression-test files, and CLI. `git diff --check`,
`scripts/check-security-workflows.mjs`, and `scripts/check-npm-audit.test.mjs`
passed. The targeted Vitest invocation failed because the `vitest` binary is
not installed. Runtime/deployed-host behavior remains unverified.

## Follow-up

- Audit remaining Site Admin/demo-only paths for hosted-customer profile
  leakage and verify the blocked paths on the deployed host.
- Implement the separate scoped, step-up-protected customer deletion workflow
  only after retention schedules, legal holds, exports, and customer/legal
  approval are established.
