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

# Apply and verify the shipped Drizzle journal before the server can start.
# MIGRATE_DATABASE_URL is the owner/DDL credential. DATABASE_URL is runtime-only
# and must remain the limited unionops_app role so RLS binds.
MIGRATE_DIR="/app/db-migrate"

if [ ! -d "${MIGRATE_DIR}/src/lib/db/migrations" ]; then
  echo "[entrypoint] ERROR: shipped migrations folder missing" >&2
  exit 1
fi

echo "[entrypoint] running database deploy gate (migrate + verify)"
if ! (
  cd "${MIGRATE_DIR}" &&
  MIGRATE_DIR="${MIGRATE_DIR}" node /app/scripts/db-deploy.mjs
); then
  echo "[entrypoint] ERROR: database deploy gate failed — refusing to start" >&2
  exit 1
fi
echo "[entrypoint] database deploy gate passed"

if [ -n "${MIGRATE_DATABASE_URL:-}" ] && [ -n "${POSTGRES_APP_PASSWORD:-}" ]; then
  echo "[entrypoint] syncing unionops_app password"
  MIGRATE_DIR="${MIGRATE_DIR}" node /app/scripts/sync-app-role-password.mjs
fi

exec "$@"
