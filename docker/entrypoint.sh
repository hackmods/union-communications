#!/bin/sh
set -e

# Startup diagnostics for CapRover / container troubleshooting.
echo "[entrypoint] starting union-communications"
echo "[entrypoint] PORT=${PORT:-3000} HOSTNAME=${HOSTNAME:-0.0.0.0} NODE_ENV=${NODE_ENV:-unknown} BUILD_COMMIT_SHA=${BUILD_COMMIT_SHA:-unknown}"

if [ ! -f /app/server.js ]; then
  echo "[entrypoint] ERROR: /app/server.js missing" >&2
  ls -la /app >&2
  exit 1
fi

# Apply Drizzle migrations when Postgres is configured (SEC-003).
# Prefer MIGRATE_DATABASE_URL (table owner) so DDL succeeds; runtime DATABASE_URL
# should be unionops_app so RLS binds (see migration 0008_app_role.sql).
MIGRATE_URL="${MIGRATE_DATABASE_URL:-${DATABASE_URL:-}}"
if [ -n "${MIGRATE_URL}" ] && [ -d /app/src/lib/db/migrations ]; then
  echo "[entrypoint] running drizzle-kit migrate (owner/migrate URL)"
  DATABASE_URL="${MIGRATE_URL}" npx drizzle-kit migrate || echo "[entrypoint] WARN: migrate failed — continuing with existing schema"
elif [ -n "${MIGRATE_URL}" ]; then
  echo "[entrypoint] migrate URL set but migrations folder missing — skip migrate"
else
  echo "[entrypoint] no DATABASE_URL / MIGRATE_DATABASE_URL — memory adapters (case data is not durable)"
fi

exec "$@"
