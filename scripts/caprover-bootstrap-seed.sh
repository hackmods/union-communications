#!/usr/bin/env bash
# One-shot seed for CapRover / docker hosts after entrypoint migrate.
# Run ON THE CAPROVER HOST (or any machine on the captain-overlay-network).
#
# Prerequisites:
#   - Postgres reachable at MIGRATE_DATABASE_URL (owner role)
#   - Migrations already applied (container boot or npm run db:migrate)
#   - Repo checkout or UNIONOPS_SRC tarball at UNIONOPS_SRC
#
# Usage:
#   export MIGRATE_DATABASE_URL='postgres://postgres:...@srv-captain--postgres-unionops:5432/unionops'
#   export SEED_PLATFORM_ADMIN_PASSWORD='your-secure-password'
#   export SEED_DEMO_USERS=false
#   bash scripts/caprover-bootstrap-seed.sh
#
# Optional: CAPTAIN_NETWORK=captain-overlay-network (auto-detected when unset)
set -euo pipefail

SRC="${UNIONOPS_SRC:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
MIGRATE_URL="${MIGRATE_DATABASE_URL:-${DATABASE_URL:-}}"

if [[ -z "${MIGRATE_URL}" ]]; then
  echo "Set MIGRATE_DATABASE_URL (owner role) before running seed." >&2
  exit 1
fi

if [[ ! -f "${SRC}/package.json" ]]; then
  echo "Missing repo at UNIONOPS_SRC=${SRC}" >&2
  exit 1
fi

NET="${CAPTAIN_NETWORK:-}"
if [[ -z "${NET}" ]]; then
  NET="$(docker network ls --format '{{.Name}}' | grep -E 'captain-overlay|docker_default' | head -1 || true)"
fi

if [[ -z "${NET}" ]]; then
  echo "Could not detect docker network — set CAPTAIN_NETWORK=captain-overlay-network" >&2
  exit 1
fi

echo "[caprover-bootstrap-seed] seeding on network ${NET}…"

docker run --rm --network "${NET}" \
  -v "${SRC}:/app" -w /app \
  -e MIGRATE_DATABASE_URL="${MIGRATE_URL}" \
  -e DATABASE_URL="${MIGRATE_URL}" \
  -e AUTH_USERS_BACKEND=postgres \
  -e SEED_DEMO_USERS="${SEED_DEMO_USERS:-false}" \
  -e SEED_PLATFORM_ADMIN="${SEED_PLATFORM_ADMIN:-true}" \
  -e SEED_PLATFORM_ADMIN_PASSWORD="${SEED_PLATFORM_ADMIN_PASSWORD:-}" \
  -e SEED_PLATFORM_ADMIN_EMAIL="${SEED_PLATFORM_ADMIN_EMAIL:-}" \
  -e SEED_PLATFORM_ADMIN_BOOTSTRAP_FILE="${SEED_PLATFORM_ADMIN_BOOTSTRAP_FILE:-}" \
  node:24-alpine sh -c "npm ci --ignore-scripts && npm run db:seed"

echo "[caprover-bootstrap-seed] done — verify login and GET /api/health"
