#!/usr/bin/env bash
# End-to-end contract for the production image database deployment gate.
# Uses a unique compose project/volume on every run and removes only that test
# project on exit.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE="${1:-union-communications:ci}"
IMAGE_WAS_SUPPLIED=$([[ $# -gt 0 ]] && echo true || echo false)
DOCKER_DIR="${ROOT}/docker"
PROJECT="unionops_migrate_smoke_${$}_${RANDOM}"
COMPOSE=(docker compose -p "${PROJECT}" -f "${DOCKER_DIR}/docker-compose.yml")
LOG_DIR="$(mktemp -d)"

cleanup() {
  "${COMPOSE[@]}" down -v --remove-orphans >/dev/null 2>&1 || true
  rm -rf "${LOG_DIR}"
}
trap cleanup EXIT

cd "${ROOT}"

if [[ "${IMAGE_WAS_SUPPLIED}" == "false" ]]; then
  echo "[docker-migrate-smoke] building ${IMAGE}…"
  docker build -f docker/Dockerfile -t "${IMAGE}" .
elif ! docker image inspect "${IMAGE}" >/dev/null 2>&1; then
  echo "[docker-migrate-smoke] supplied image is not available locally: ${IMAGE}" >&2
  exit 1
fi

if [[ -f "${DOCKER_DIR}/.env" ]]; then
  # shellcheck disable=SC1091
  set -a && source "${DOCKER_DIR}/.env" && set +a
fi
export AUTH_SECRET="${AUTH_SECRET:-$(openssl rand -base64 32)}"
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)}"
export POSTGRES_APP_PASSWORD="${POSTGRES_APP_PASSWORD:-$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)}"
export POSTGRES_USER="${POSTGRES_USER:-unionops}"
export POSTGRES_DB="${POSTGRES_DB:-unionops}"
export POSTGRES_PORT=0

echo "[docker-migrate-smoke] starting fresh Postgres volume project=${PROJECT}…"
"${COMPOSE[@]}" up -d db

for _ in $(seq 1 30); do
  if "${COMPOSE[@]}" exec -T db pg_isready -U "${POSTGRES_USER}" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done
"${COMPOSE[@]}" exec -T db pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" >/dev/null

DB_CONTAINER="$("${COMPOSE[@]}" ps -q db)"
NET="$(docker inspect --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}' "${DB_CONTAINER}" | head -1)"
if [[ -z "${NET}" ]]; then
  echo "[docker-migrate-smoke] could not resolve compose network" >&2
  exit 1
fi

OWNER_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}"
APP_URL="postgres://unionops_app:${POSTGRES_APP_PASSWORD}@db:5432/${POSTGRES_DB}"

run_gate() {
  local log_file="$1"
  shift
  docker run --rm --network "${NET}" \
    -e AUTH_SECRET="${AUTH_SECRET}" \
    -e MIGRATE_DATABASE_URL="${OWNER_URL}" \
    -e DATABASE_URL="${APP_URL}" \
    -e POSTGRES_APP_PASSWORD="${POSTGRES_APP_PASSWORD}" \
    "$@" \
    "${IMAGE}" node -e "process.exit(0)" >"${log_file}" 2>&1
}

psql_scalar() {
  "${COMPOSE[@]}" exec -T db psql \
    -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -tAc "$1"
}

FRESH_LOG="${LOG_DIR}/fresh.log"
echo "[docker-migrate-smoke] fresh-volume migrate + verify…"
run_gate "${FRESH_LOG}"
cat "${FRESH_LOG}"

grep -q "running database deploy gate" "${FRESH_LOG}"
grep -q "verified tail=0036_verified_boot_reconcile" "${FRESH_LOG}"
grep -q "database deploy gate passed" "${FRESH_LOG}"
if grep -q "severity.*NOTICE" "${FRESH_LOG}"; then
  echo "[docker-migrate-smoke] postgres NOTICE leaked into deploy logs" >&2
  exit 1
fi

JOURNAL_TABLES="$(psql_scalar "SELECT count(*) FROM information_schema.tables WHERE table_name = '__drizzle_migrations'")"
[[ "${JOURNAL_TABLES}" == "1" ]] || { echo "journal table count=${JOURNAL_TABLES}" >&2; exit 1; }

TASKS_0027_COUNT="$(psql_scalar "SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name IN ('notes','mentioned_user_ids','reactions','updated_at')")"
[[ "${TASKS_0027_COUNT}" == "4" ]] || { echo "tasks 0027 columns=${TASKS_0027_COUNT}/4" >&2; exit 1; }

META_TABLES="$(psql_scalar "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'platform_meta'")"
[[ "${META_TABLES}" == "0" ]] || { echo "platform_meta still exists" >&2; exit 1; }

# Reproduce the live journal-hole state: later migrations exist, 0027-0029 do
# not, and the obsolete metadata table claims success. The new reconciliation
# tail must repair shape without rewriting history or losing the sentinel row.
echo "[docker-migrate-smoke] reproducing historical 33/36 journal-hole upgrade…"
"${COMPOSE[@]}" exec -T db psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO unions (id, name, slug, enabled_modules, is_demo)
VALUES ('union-opseu', 'Preserve Me', 'preserve-me', '[]'::jsonb, false)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, is_demo = false;

DELETE FROM drizzle.__drizzle_migrations
WHERE created_at IN (1784877000000, 1784878000000, 1784879000000, 1789875000000);

ALTER TABLE discussion_posts DROP COLUMN IF EXISTS mentioned_user_ids;
ALTER TABLE discussion_posts DROP COLUMN IF EXISTS reactions;
ALTER TABLE discussion_posts DROP COLUMN IF EXISTS updated_at;
ALTER TABLE tasks DROP COLUMN IF EXISTS notes;
ALTER TABLE tasks DROP COLUMN IF EXISTS mentioned_user_ids;
ALTER TABLE tasks DROP COLUMN IF EXISTS reactions;
ALTER TABLE tasks DROP COLUMN IF EXISTS updated_at;

DROP TABLE IF EXISTS time_worker_groups CASCADE;
DROP TABLE IF EXISTS time_ot_policies CASCADE;
DROP TABLE IF EXISTS time_shift_series CASCADE;
DROP TABLE IF EXISTS pto_accrual_policies CASCADE;
DROP TABLE IF EXISTS payroll_export_profiles CASCADE;
ALTER TABLE time_workers DROP COLUMN IF EXISTS employee_number;
ALTER TABLE time_workers DROP COLUMN IF EXISTS email;
ALTER TABLE time_workers DROP COLUMN IF EXISTS phone;
ALTER TABLE time_workers DROP COLUMN IF EXISTS job_title;
ALTER TABLE time_workers DROP COLUMN IF EXISTS department;
ALTER TABLE time_workers DROP COLUMN IF EXISTS hire_date;
ALTER TABLE time_workers DROP COLUMN IF EXISTS employment_type;
ALTER TABLE time_workers DROP COLUMN IF EXISTS default_job_code_id;
ALTER TABLE time_workers DROP COLUMN IF EXISTS supervisor_worker_id;
ALTER TABLE time_workers DROP COLUMN IF EXISTS notes;
ALTER TABLE time_workers DROP COLUMN IF EXISTS group_ids;
ALTER TABLE time_shifts DROP COLUMN IF EXISTS series_id;
ALTER TABLE time_shifts DROP COLUMN IF EXISTS series_occurrence_date;

DROP INDEX IF EXISTS attachment_meta_time_entry_idx;
ALTER TABLE time_entries DROP COLUMN IF EXISTS clock_in_photo_attachment_id;
ALTER TABLE time_entries DROP COLUMN IF EXISTS clock_out_photo_attachment_id;
ALTER TABLE attachment_meta DROP COLUMN IF EXISTS time_entry_id;
ALTER TABLE attachment_meta DROP COLUMN IF EXISTS punch_kind;

CREATE TABLE platform_meta (
  id smallint PRIMARY KEY,
  schema_version integer NOT NULL,
  data_version integer NOT NULL,
  applied_migrations integer NOT NULL,
  boot_commit_accepted text NOT NULL
);
INSERT INTO platform_meta VALUES (1, 35, 1, 33, 'misleading-old-state');
SQL

[[ "$(psql_scalar "SELECT count(*) FROM drizzle.__drizzle_migrations")" == "33" ]]
REPAIR_LOG="${LOG_DIR}/repair.log"
run_gate "${REPAIR_LOG}"
cat "${REPAIR_LOG}"
grep -q "verified tail=0036_verified_boot_reconcile" "${REPAIR_LOG}"

[[ "$(psql_scalar "SELECT count(*) FROM drizzle.__drizzle_migrations")" == "34" ]]
[[ "$(psql_scalar "SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name IN ('notes','mentioned_user_ids','reactions','updated_at')")" == "4" ]]
[[ "$(psql_scalar "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('time_worker_groups','time_ot_policies','time_shift_series','pto_accrual_policies','payroll_export_profiles')")" == "5" ]]
[[ "$(psql_scalar "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'platform_meta'")" == "0" ]]
[[ "$(psql_scalar "SELECT count(*) FROM unions WHERE id = 'union-opseu' AND name = 'Preserve Me' AND is_demo = true")" == "1" ]]

echo "[docker-migrate-smoke] concurrent no-op boots serialize…"
set +e
run_gate "${LOG_DIR}/concurrent-a.log" &
PID_A=$!
run_gate "${LOG_DIR}/concurrent-b.log" &
PID_B=$!
wait "${PID_A}"; EXIT_A=$?
wait "${PID_B}"; EXIT_B=$?
set -e
[[ "${EXIT_A}" == "0" && "${EXIT_B}" == "0" ]] || {
  cat "${LOG_DIR}/concurrent-a.log" "${LOG_DIR}/concurrent-b.log" >&2
  exit 1
}

echo "[docker-migrate-smoke] removing critical DDL; server command must never run…"
"${COMPOSE[@]}" exec -T db psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" \
  -v ON_ERROR_STOP=1 -c 'ALTER TABLE tasks DROP COLUMN notes'

NEGATIVE_LOG="${LOG_DIR}/negative.log"
set +e
docker run --rm --network "${NET}" \
  -e AUTH_SECRET="${AUTH_SECRET}" \
  -e NODE_ENV=production \
  -e MIGRATE_CONTINUE_ON_ERROR=true \
  -e MIGRATE_DATABASE_URL="${OWNER_URL}" \
  -e DATABASE_URL="${APP_URL}" \
  -e POSTGRES_APP_PASSWORD="${POSTGRES_APP_PASSWORD}" \
  "${IMAGE}" node -e "process.exit(42)" >"${NEGATIVE_LOG}" 2>&1
NEGATIVE_EXIT=$?
set -e
cat "${NEGATIVE_LOG}"
[[ "${NEGATIVE_EXIT}" == "1" ]] || {
  echo "[docker-migrate-smoke] damaged schema exit=${NEGATIVE_EXIT}; expected gate exit 1 (42 means server ran)" >&2
  exit 1
}
grep -q "required shape verification failed: missing column public.tasks.notes" "${NEGATIVE_LOG}"
grep -q "MIGRATE_CONTINUE_ON_ERROR is ignored in production" "${NEGATIVE_LOG}"
grep -q "database deploy gate failed — refusing to start" "${NEGATIVE_LOG}"

echo "[docker-migrate-smoke] ok — fresh, journal-hole repair, concurrency, and fail-closed shape gates passed"
