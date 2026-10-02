# Session knowledge — ops boot / deploy lifecycle emails (2026-10-02)

## What shipped

Independent CapRover env toggles for **new-image deploy** and **same-image restart** operator emails:

- `OPS_NOTIFY_ON_DEPLOY` (alias `DEPLOY_NOTIFY_ENABLED`) + `OPS_NOTIFY_ON_RESTART`
- Shared inbox `DEPLOY_NOTIFY_EMAIL`
- Boot hook from `instrumentation.ts` (`scheduleBootLifecycleNotify`)
- Durable state: migration `0095_ops_boot_notify_state` (+ file fallback)
- CI cron `/api/cron/deploy-notify` writes the same last-commit state
- Host board read-only lifecycle line; gated `/api/health` → `opsLifecycleNotify`
- **No** Site Admin settings page

## Lessons

1. **Deploy subsumes restart** on one boot — one email max from the hook.
2. **Boot↔CI race:** `OPS_NOTIFY_DEPLOY_DEDUPE_MINUTES` (default 10) skips a second mail for the same commit.
3. **Unknown `BUILD_COMMIT_SHA`:** never claim “new image”; restart path only.
4. **Multi-replica:** `pg_advisory_xact_lock` around read→decide→send→write. File-only multi-instance may double-send.
5. **Circular imports:** `boot-notify` must not statically import `deploy-notify` or `health-status` (dynamic import for deploy payload; local version/build readers).
6. **State read failure → skip send** (prefer miss over spam). Send failure → do not advance timestamps.
7. Alert-delivery CapRover paste may list supporting `OPS_NOTIFY_*` keys; they are **not** hosted attestation gap codes.

## Operator verify

```text
EMAIL_ENABLED=true
DEPLOY_NOTIFY_EMAIL=ops@…
OPS_NOTIFY_ON_DEPLOY=true
OPS_NOTIFY_ON_RESTART=true   # or false
```

Dry-run: `GET /api/cron/deploy-notify?dryRun=1` with `CRON_SECRET`. Confirm Host chip after boot.
