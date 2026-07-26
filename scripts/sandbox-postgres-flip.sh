#!/usr/bin/env bash
# Flip Proxmox CT 115 (or any docker host) to durable Postgres via compose overlay.
# Run ON THE SANDBOX HOST after overlaying unionops-src.tar.gz into /root/unionops-src.
#
# Usage (on CT 115):
#   tar -xzf /tmp/unionops-src.tar.gz -C /root/unionops-src
#   bash /root/unionops-src/scripts/sandbox-postgres-flip.sh
set -euo pipefail

SRC="${UNIONOPS_SRC:-/root/unionops-src}"
DOCKER_DIR="${SRC}/docker"
COMMIT="${BUILD_COMMIT_SHA:-unknown}"

cd "${DOCKER_DIR}"

if [[ ! -f docker-compose.durable.yml ]]; then
  echo "Missing docker-compose.durable.yml — deploy a commit with Postgres ops tooling first." >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  AUTH_SECRET=""
  if docker inspect unionops >/dev/null 2>&1; then
    AUTH_SECRET="$(docker inspect unionops --format '{{range .Config.Env}}{{println .}}{{end}}' | sed -n 's/^AUTH_SECRET=//p' | head -1)"
  fi
  if [[ -z "${AUTH_SECRET}" ]]; then
    AUTH_SECRET="$(openssl rand -base64 32)"
  fi
  PG_PASS="$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"
  PG_APP_PASS="$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"
  cat > .env <<EOF
AUTH_SECRET=${AUTH_SECRET}
POSTGRES_PASSWORD=${PG_PASS}
POSTGRES_APP_PASSWORD=${PG_APP_PASS}
AUTH_URL=http://192.168.0.115:3000
AUTH_ALLOW_DEMO_USERS=true
NEXT_PUBLIC_DEMO_SITE=true
EOF
  chmod 600 .env
  echo "[flip] wrote ${DOCKER_DIR}/.env"
else
  echo "[flip] using existing ${DOCKER_DIR}/.env"
fi

# shellcheck disable=SC1091
set -a && source .env && set +a

echo "[flip] stopping legacy standalone unionops container (if any)…"
docker stop unionops 2>/dev/null || true
docker rm unionops 2>/dev/null || true

echo "[flip] starting Postgres…"
docker compose -f docker-compose.yml -f docker-compose.durable.yml up -d db

for i in $(seq 1 30); do
  if docker compose exec -T db pg_isready -U "${POSTGRES_USER:-unionops}" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

NET="$(docker compose -f docker-compose.yml ps -q db | xargs -r docker inspect --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}' | head -1)"
if [[ -z "${NET}" ]]; then
  NET="docker_default"
fi
echo "[flip] migrate + seed on network ${NET}…"
docker run --rm --network "${NET}" \
  -v "${SRC}:/app" -w /app \
  -e MIGRATE_DATABASE_URL="postgres://${POSTGRES_USER:-unionops}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB:-unionops}" \
  -e DATABASE_URL="postgres://${POSTGRES_USER:-unionops}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB:-unionops}" \
  node:24-alpine sh -c "npm ci --ignore-scripts && npm run db:migrate && npm run db:seed"

echo "[flip] building web image (commit ${COMMIT})…"
docker compose -f docker-compose.yml -f docker-compose.durable.yml build \
  --build-arg CAPROVER_GIT_COMMIT_SHA="${COMMIT}"

echo "[flip] starting web with durable backends…"
docker compose -f docker-compose.yml -f docker-compose.durable.yml up -d web

sleep 5
wget -qO- http://127.0.0.1:3000/api/health || true
echo
echo "[flip] done — verify: HEALTH_URL=http://192.168.0.115:3000 HEALTH_REQUIRE_DURABLE=true npm run health:check"
