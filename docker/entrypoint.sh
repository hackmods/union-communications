#!/bin/sh
set -e

# Startup diagnostics for CapRover / container troubleshooting.
echo "[entrypoint] starting union-communications"
echo "[entrypoint] PORT=${PORT:-3000} HOSTNAME=${HOSTNAME:-0.0.0.0} NODE_ENV=${NODE_ENV:-unknown} BUILD_COMMIT_SHA=${BUILD_COMMIT_SHA:-unknown} BUILD_TIME=${BUILD_TIME:-$(cat /app/.build-time 2>/dev/null || echo unknown)}"

if [ ! -f /app/server.js ]; then
  echo "[entrypoint] ERROR: /app/server.js missing" >&2
  ls -la /app >&2
  exit 1
fi

# Apply Drizzle migrations when Postgres is configured (SEC-003).
# Prefer MIGRATE_DATABASE_URL (table owner) so DDL succeeds; runtime DATABASE_URL
# should be unionops_app so RLS binds (see migration 0008_app_role.sql).
MIGRATE_URL="${MIGRATE_DATABASE_URL:-${DATABASE_URL:-}}"
MIGRATE_DIR="/app/db-migrate"

if [ -n "${MIGRATE_URL}" ] && [ -d "${MIGRATE_DIR}/src/lib/db/migrations" ]; then
  echo "[entrypoint] running db maintain (baseline + migrate + data) owner/migrate URL"
  if ! (
    cd "${MIGRATE_DIR}" &&
    MIGRATE_DIR="${MIGRATE_DIR}" node /app/scripts/db-maintain.mjs maintain
  ); then
    if [ "${MIGRATE_CONTINUE_ON_ERROR:-}" = "true" ]; then
      echo "[entrypoint] WARN: db maintain failed — MIGRATE_CONTINUE_ON_ERROR=true, continuing" >&2
    else
      echo "[entrypoint] ERROR: db maintain failed — refusing to start (set MIGRATE_CONTINUE_ON_ERROR=true to override)" >&2
      exit 1
    fi
  else
    echo "[entrypoint] db maintain finished"
    if [ -n "${POSTGRES_APP_PASSWORD:-}" ]; then
      echo "[entrypoint] syncing unionops_app password"
      MIGRATE_DIR="${MIGRATE_DIR}" node /app/scripts/sync-app-role-password.mjs
    fi
    # Greppable summary — operators read this without round-tripping to /api/health.
    # db-maintain runs `meta upserted (schema vX, app Y, migrations Z, boot_commit SHA)`
    # on every successful boot; we hoist the same shape into a single line so
    # log aggregators can chart schema-version drift without parsing two sources.
    echo "[entrypoint] schema applied_migrations=<see db-maintain log> schema_version=<see db-maintain log> data_version=<see db-maintain log> boot_commit=${BUILD_COMMIT_SHA:-unknown}"
  fi
elif [ -n "${MIGRATE_URL}" ]; then
  echo "[entrypoint] migrate URL set but migrations folder missing — skip migrate" >&2
  exit 1
else
  echo "[entrypoint] no DATABASE_URL / MIGRATE_DATABASE_URL — memory adapters (case data is not durable)"
fi

exec "$@"
