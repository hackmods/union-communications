#!/bin/sh
set -e

# Startup diagnostics for CapRover / container troubleshooting.
echo "[entrypoint] starting union-communications"
echo "[entrypoint] PORT=${PORT:-3000} HOSTNAME=${HOSTNAME:-0.0.0.0} NODE_ENV=${NODE_ENV:-unknown} BUILD_COMMIT_SHA=${BUILD_COMMIT_SHA:-unknown}"
# #region agent log
if [ -d /app/db-migrate/node_modules/drizzle-kit ]; then
  echo "[build-debug session=3d0783 hypothesis=D] db-migrate ready: drizzle-kit present"
else
  echo "[build-debug session=3d0783 hypothesis=D] db-migrate MISSING drizzle-kit" >&2
fi
# #endregion

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
DRIZZLE_KIT="${MIGRATE_DIR}/node_modules/drizzle-kit/bin.cjs"

if [ -n "${MIGRATE_URL}" ] && [ -d "${MIGRATE_DIR}/src/lib/db/migrations" ]; then
  echo "[entrypoint] running drizzle-kit migrate (owner/migrate URL)"
  if ! (
    cd "${MIGRATE_DIR}" &&
    DATABASE_URL="${MIGRATE_URL}" node "${DRIZZLE_KIT}" migrate --config drizzle.migrate.config.ts
  ); then
    if [ "${MIGRATE_CONTINUE_ON_ERROR:-}" = "true" ]; then
      echo "[entrypoint] WARN: migrate failed — MIGRATE_CONTINUE_ON_ERROR=true, continuing" >&2
    else
      echo "[entrypoint] ERROR: migrate failed — refusing to start (set MIGRATE_CONTINUE_ON_ERROR=true to override)" >&2
      exit 1
    fi
  else
    echo "[entrypoint] migrate finished"
    if [ -n "${POSTGRES_APP_PASSWORD:-}" ]; then
      echo "[entrypoint] syncing unionops_app password"
      MIGRATE_DIR="${MIGRATE_DIR}" node /app/scripts/sync-app-role-password.mjs
    fi
  fi
elif [ -n "${MIGRATE_URL}" ]; then
  echo "[entrypoint] migrate URL set but migrations folder missing — skip migrate" >&2
  exit 1
else
  echo "[entrypoint] no DATABASE_URL / MIGRATE_DATABASE_URL — memory adapters (case data is not durable)"
fi

exec "$@"
