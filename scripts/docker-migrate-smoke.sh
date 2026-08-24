#!/usr/bin/env bash
# CI / local smoke: built image applies Drizzle migrations on boot against compose Postgres.
# Usage (repo root): bash scripts/docker-migrate-smoke.sh [image-tag]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE="${1:-union-communications:ci}"
DOCKER_DIR="${ROOT}/docker"
COMPOSE="docker compose -f ${DOCKER_DIR}/docker-compose.yml"

cd "${ROOT}"

if ! docker image inspect "${IMAGE}" >/dev/null 2>&1; then
  echo "[docker-migrate-smoke] building ${IMAGE}…"
  docker build -f docker/Dockerfile -t "${IMAGE}" .
fi

if [[ ! -f "${DOCKER_DIR}/.env" ]]; then
  AUTH_SECRET="$(openssl rand -base64 32)"
  POSTGRES_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"
  POSTGRES_APP_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"
  cat > "${DOCKER_DIR}/.env" <<EOF
AUTH_SECRET=${AUTH_SECRET}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_APP_PASSWORD=${POSTGRES_APP_PASSWORD}
AUTH_URL=http://localhost:3000
EOF
  echo "[docker-migrate-smoke] wrote ${DOCKER_DIR}/.env"
fi

# shellcheck disable=SC1091
set -a && source "${DOCKER_DIR}/.env" && set +a

echo "[docker-migrate-smoke] starting Postgres…"
${COMPOSE} up -d db

for i in $(seq 1 30); do
  if ${COMPOSE} exec -T db pg_isready -U "${POSTGRES_USER:-unionops}" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

NET="$(${COMPOSE} ps -q db | xargs docker inspect --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}' | head -1)"
if [[ -z "${NET}" ]]; then
  echo "[docker-migrate-smoke] could not resolve compose network" >&2
  exit 1
fi

OWNER_URL="postgres://${POSTGRES_USER:-unionops}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB:-unionops}"
APP_URL="postgres://unionops_app:${POSTGRES_APP_PASSWORD}@db:5432/${POSTGRES_DB:-unionops}"

echo "[docker-migrate-smoke] running entrypoint migrate against ${NET}…"
LOG_FILE="$(mktemp)"
trap 'rm -f "${LOG_FILE}"' EXIT

set +e
docker run --rm --network "${NET}" \
  -e AUTH_SECRET="${AUTH_SECRET}" \
  -e MIGRATE_DATABASE_URL="${OWNER_URL}" \
  -e DATABASE_URL="${APP_URL}" \
  -e POSTGRES_APP_PASSWORD="${POSTGRES_APP_PASSWORD}" \
  "${IMAGE}" node -e "process.exit(0)" 2>&1 | tee "${LOG_FILE}"
RUN_EXIT=${PIPESTATUS[0]}
set -e

if [[ "${RUN_EXIT}" -ne 0 ]]; then
  echo "[docker-migrate-smoke] container exited ${RUN_EXIT}" >&2
  exit 1
fi

if ! grep -q "running drizzle-kit migrate" "${LOG_FILE}"; then
  echo "[docker-migrate-smoke] missing migrate log line" >&2
  exit 1
fi

if grep -q "migrations folder missing" "${LOG_FILE}"; then
  echo "[docker-migrate-smoke] migrations not shipped in image" >&2
  exit 1
fi

if ! grep -q "migrate finished" "${LOG_FILE}"; then
  echo "[docker-migrate-smoke] migrate did not finish successfully" >&2
  exit 1
fi

TABLE_COUNT="$(${COMPOSE} exec -T db psql -U "${POSTGRES_USER:-unionops}" -d "${POSTGRES_DB:-unionops}" -tAc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '__drizzle_migrations'")"

if [[ "${TABLE_COUNT}" != "1" ]]; then
  echo "[docker-migrate-smoke] __drizzle_migrations table missing (got: ${TABLE_COUNT})" >&2
  exit 1
fi

echo "[docker-migrate-smoke] ok — migrations applied via entrypoint"
