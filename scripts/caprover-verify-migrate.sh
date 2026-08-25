#!/usr/bin/env bash
# Verify CapRover migrate-only step against postgres-unionops (owner URL).
# Run ON the CapRover droplet (captain overlay). Does not print passwords.
#
# Usage:
#   export MIGRATE_DATABASE_URL='postgres://postgres:OWNER_PW@srv-captain--postgres-unionops:5432/unionops'
#   bash scripts/caprover-verify-migrate.sh
set -euo pipefail

MIGRATE_URL="${MIGRATE_DATABASE_URL:-}"
if [[ -z "${MIGRATE_URL}" ]]; then
  echo "Set MIGRATE_DATABASE_URL (owner role) first." >&2
  exit 1
fi

NET="${CAPTAIN_NETWORK:-}"
if [[ -z "${NET}" ]]; then
  NET="$(docker network ls --format '{{.Name}}' | grep -E 'captain-overlay|docker_default' | head -1 || true)"
fi
if [[ -z "${NET}" ]]; then
  echo "Set CAPTAIN_NETWORK=captain-overlay-network" >&2
  exit 1
fi

echo "[caprover-verify-migrate] checking on network ${NET}…"

docker run --rm --network "${NET}" postgres:16-alpine \
  psql "${MIGRATE_URL}" -v ON_ERROR_STOP=1 -c "
SELECT
  (SELECT count(*) FROM information_schema.tables
     WHERE table_name = '__drizzle_migrations') AS drizzle_table,
  (SELECT count(*) FROM __drizzle_migrations) AS migration_rows,
  (SELECT count(*) FROM pg_roles WHERE rolname = 'unionops_app') AS app_role;
"

echo "[caprover-verify-migrate] ok if drizzle_table=1, migration_rows>0, app_role=1"
