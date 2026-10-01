# MFA local release evidence — 2026-09-30

This checkout now has disposable local Postgres evidence for Phase 5B. It does not establish that any hosted UnionOps deployment is restored.

## What passed

- `scripts/docker-migrate-smoke.sh` built the current production image and passed on an isolated Compose project. Fresh migration and schema verification reached `0092_mfa_reenroll_grace`; journal-hole repair passed; concurrent no-op deploys serialized; the image refused to start after a required column was removed. Its trap removed the temporary project and volume.
- A separate unique Compose project was migrated through `0092_mfa_reenroll_grace`, seeded, and checked with `npm run db:rls-smoke` over the `unionops_app` runtime role. The role lacked `BYPASSRLS`. Account-scoped MFA RLS checks passed. An independent owner connection verified the app binders left encrypted pending-enrollment state, an attempt row, a SHA-256 grant digest, and a consumed grant in Postgres. The temporary project and volume were removed.

No database URL or PostgreSQL client was required from the host. Docker Compose and a local `postgres:16-alpine` image were available when the command ran with elevated Docker access. The migration smoke built `union-communications:ci` from the current checkout.

## Limits and continuation

The MFA app-binder smoke now checks durable attempt/grant rows independently, so a successful memory fallback cannot satisfy those assertions. This is still a single-process happy-path smoke: fault injection and racing transactions remain open.

Continue Phase 5B with hosted image/configuration evidence, direct persisted-row assertions, replica A/B/restart handoff, concurrency and fault injection, an encrypted TOTP backup restore with the preserved key, browser typed/paste/autofill and recovery journeys, EN/FR/accessibility review, and a rollback image/restore reference. Keep the hosted checklist items open until those artifacts exist.

Do not record secret values in evidence. The demo seed logs a generated platform-admin bootstrap password; keep those logs out of shared evidence and tear down disposable databases after the run.
