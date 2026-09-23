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

EXPECTED_TAIL="$(node -e 'const journal = require("./src/lib/db/migrations/meta/_journal.json"); process.stdout.write(journal.entries.at(-1).tag)')"
JOURNAL_ENTRY_COUNT="$(node -e 'const journal = require("./src/lib/db/migrations/meta/_journal.json"); process.stdout.write(String(journal.entries.length))')"
RECONCILE_START_INDEX="$(node -e 'const journal = require("./src/lib/db/migrations/meta/_journal.json"); const index = journal.entries.findIndex((entry) => entry.tag === "0036_verified_boot_reconcile"); if (index < 0) throw new Error("reconciliation migration missing"); process.stdout.write(String(index))')"
RECONCILE_WHEN="$(node -e 'const journal = require("./src/lib/db/migrations/meta/_journal.json"); const entry = journal.entries.find((item) => item.tag === "0036_verified_boot_reconcile"); if (!entry) throw new Error("reconciliation migration missing"); process.stdout.write(String(entry.when))')"
RECONCILE_TAIL_COUNT="$((JOURNAL_ENTRY_COUNT - RECONCILE_START_INDEX))"
HOLE_EXPECTED_COUNT="$((JOURNAL_ENTRY_COUNT - 3 - RECONCILE_TAIL_COUNT))"
REPAIRED_EXPECTED_COUNT="$((JOURNAL_ENTRY_COUNT - 3))"

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

app_psql() {
  "${COMPOSE[@]}" exec -T -e "PGPASSWORD=${POSTGRES_APP_PASSWORD}" db psql \
    -h 127.0.0.1 -U unionops_app -d "${POSTGRES_DB}" -v ON_ERROR_STOP=1 "$@"
}

app_scalar() {
  app_psql -tAc "$1" | tail -1
}

FRESH_LOG="${LOG_DIR}/fresh.log"
echo "[docker-migrate-smoke] fresh-volume migrate + verify…"
run_gate "${FRESH_LOG}"
cat "${FRESH_LOG}"

grep -q "running database deploy gate" "${FRESH_LOG}"
grep -Fq "verified tail=${EXPECTED_TAIL}" "${FRESH_LOG}"
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

echo "[docker-migrate-smoke] runtime-role UnionOps Data local RLS…"
"${COMPOSE[@]}" exec -T db psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO unions (id, name, slug, enabled_modules)
VALUES ('data-rls-union', 'Data RLS Smoke', 'data-rls-smoke', '[]'::jsonb);
INSERT INTO locals (id, union_id, local_number)
VALUES ('data-rls-local', 'data-rls-union', 'RLS');
SQL
app_psql <<'SQL'
SELECT set_config('app.current_union_id', 'data-rls-union', false);
SELECT set_config('app.current_local_id', 'data-rls-local', false);
SELECT set_config('app.current_cross_local', 'false', false);
INSERT INTO data_datasets (id, union_id, local_id, name, kind, fields, created_by_id)
VALUES ('data-rls-fixture', 'data-rls-union', 'data-rls-local', 'RLS fixture', 'table', '[]'::jsonb, 'smoke-user');
SQL
DATA_CROSS_UNION="$(app_scalar "SELECT set_config('app.current_union_id', 'data-other-union', false); SELECT set_config('app.current_local_id', 'data-other-local', false); SELECT count(*) FROM data_datasets WHERE id = 'data-rls-fixture'")"
[[ "${DATA_CROSS_UNION}" == "0" ]] || { echo "Data RLS cross-union read=${DATA_CROSS_UNION}; expected 0" >&2; exit 1; }
DATA_CROSS_LOCAL="$(app_scalar "SELECT set_config('app.current_union_id', 'data-rls-union', false); SELECT set_config('app.current_local_id', 'data-other-local', false); SELECT count(*) FROM data_datasets WHERE id = 'data-rls-fixture'")"
[[ "${DATA_CROSS_LOCAL}" == "0" ]] || { echo "Data RLS cross-local read=${DATA_CROSS_LOCAL}; expected 0" >&2; exit 1; }
DATA_SAME_LOCAL="$(app_scalar "SELECT set_config('app.current_union_id', 'data-rls-union', false); SELECT set_config('app.current_local_id', 'data-rls-local', false); SELECT count(*) FROM data_datasets WHERE id = 'data-rls-fixture'")"
[[ "${DATA_SAME_LOCAL}" == "1" ]] || { echo "Data RLS same-local read=${DATA_SAME_LOCAL}; expected 1" >&2; exit 1; }
app_psql <<'SQL'
SELECT set_config('app.current_union_id', 'data-rls-union', false);
SELECT set_config('app.current_local_id', 'data-rls-local', false);
DELETE FROM data_datasets WHERE id = 'data-rls-fixture';
SQL
echo "[docker-migrate-smoke] UnionOps Data RLS cross-union=0 cross-local=0 same-local=1"

# Reproduce the live journal-hole state: later migrations exist, 0027-0029 do
# not, and the obsolete metadata table claims success. The new reconciliation
# tail must repair shape without rewriting history or losing the sentinel row.
# The expected tail/count assertions derive from the immutable journal. Remove
# the three historical holes plus the reconciliation migration and every later
# entry: that models the production state before 0036 shipped and lets Drizzle
# apply the entire new tail.
echo "[docker-migrate-smoke] reproducing historical ${HOLE_EXPECTED_COUNT}/${JOURNAL_ENTRY_COUNT} journal-hole upgrade…"
"${COMPOSE[@]}" exec -T db psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" \
  -v ON_ERROR_STOP=1 -v reconcile_when="${RECONCILE_WHEN}" <<'SQL'
INSERT INTO unions (id, name, slug, enabled_modules, is_demo)
VALUES ('union-opseu', 'Preserve Me', 'preserve-me', '[]'::jsonb, false)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, is_demo = false;

DELETE FROM drizzle.__drizzle_migrations
WHERE created_at IN (1784877000000, 1784878000000, 1784879000000)
   OR created_at >= :reconcile_when;

-- Rewind schema objects introduced after the historical state. The fixture is
-- created from a fresh current database, so removing only journal entries would
-- make 0038/0039 collide with their already-created foreign-key constraints.
DROP TABLE IF EXISTS proposal_events CASCADE;
DROP TABLE IF EXISTS proposal_publications CASCADE;
DROP TABLE IF EXISTS proposal_rows CASCADE;
DROP TABLE IF EXISTS proposal_packages CASCADE;
DROP TABLE IF EXISTS bylaw_drafts CASCADE;
DROP TABLE IF EXISTS local_public_tool_settings CASCADE;
DROP TABLE IF EXISTS union_public_tool_settings CASCADE;
DROP TABLE IF EXISTS platform_public_tool_settings CASCADE;
DROP TABLE IF EXISTS data_assertions CASCADE;
DROP TABLE IF EXISTS data_datasets CASCADE;
DROP TABLE IF EXISTS data_employment_assignments CASCADE;
DROP TABLE IF EXISTS data_identifiers CASCADE;
DROP TABLE IF EXISTS data_import_runs CASCADE;
DROP TABLE IF EXISTS data_people CASCADE;
DROP TABLE IF EXISTS data_publications CASCADE;
DROP TABLE IF EXISTS data_records CASCADE;
DROP TABLE IF EXISTS data_staged_rows CASCADE;
DROP TABLE IF EXISTS data_union_memberships CASCADE;

-- Rewind the Members Portal authorization/Portal tail as well. The journal-hole
-- fixture replays every migration after the reconciliation point; retaining
-- these current objects would make otherwise-forward-only migrations collide
-- with their own tables, columns, constraints, or RLS policies.
DROP POLICY IF EXISTS grievances_case_insert ON grievances;
DROP POLICY IF EXISTS grievances_case_update ON grievances;
DROP POLICY IF EXISTS grievances_case_delete ON grievances;
DROP POLICY IF EXISTS officer_roster_member_scope ON officer_roster;
DROP POLICY IF EXISTS officer_roster_manage_insert ON officer_roster;
DROP POLICY IF EXISTS officer_roster_manage_update ON officer_roster;
DROP POLICY IF EXISTS officer_roster_manage_delete ON officer_roster;
DROP POLICY IF EXISTS grievance_events_parent_isolation ON grievance_events;
DROP POLICY IF EXISTS grievance_events_parent_write ON grievance_events;
DROP POLICY IF EXISTS grievance_events_parent_write_update ON grievance_events;
DROP POLICY IF EXISTS grievance_events_parent_write_delete ON grievance_events;
DROP POLICY IF EXISTS grievance_notes_parent_isolation ON grievance_notes;
DROP POLICY IF EXISTS grievance_notes_parent_write ON grievance_notes;
DROP POLICY IF EXISTS grievance_notes_parent_write_update ON grievance_notes;
DROP POLICY IF EXISTS grievance_notes_parent_write_delete ON grievance_notes;
DROP POLICY IF EXISTS grievance_outcomes_parent_isolation ON grievance_outcomes;
DROP POLICY IF EXISTS grievance_outcomes_parent_write ON grievance_outcomes;
DROP POLICY IF EXISTS grievance_outcomes_parent_write_update ON grievance_outcomes;
DROP POLICY IF EXISTS grievance_outcomes_parent_write_delete ON grievance_outcomes;

DROP TABLE IF EXISTS grievance_attachment_shares CASCADE;
DROP TABLE IF EXISTS grievance_member_updates CASCADE;
DROP TABLE IF EXISTS grievance_participants CASCADE;
DROP TABLE IF EXISTS break_glass_grants CASCADE;
DROP TABLE IF EXISTS committee_memberships CASCADE;
DROP TABLE IF EXISTS authority_delegations CASCADE;
DROP TABLE IF EXISTS officer_assignments CASCADE;
DROP TABLE IF EXISTS local_memberships CASCADE;

DROP TABLE IF EXISTS portal_bulletin_comments CASCADE;
DROP TABLE IF EXISTS portal_roll_call_answers CASCADE;
DROP TABLE IF EXISTS portal_pipeline_cards CASCADE;
DROP TABLE IF EXISTS portal_pipeline_columns CASCADE;
DROP TABLE IF EXISTS portal_bulletin_posts CASCADE;
DROP TABLE IF EXISTS portal_actions CASCADE;
DROP TABLE IF EXISTS portal_calendar_events CASCADE;
DROP TABLE IF EXISTS portal_binder_items CASCADE;
DROP TABLE IF EXISTS portal_floor_messages CASCADE;
DROP TABLE IF EXISTS portal_roll_call_questions CASCADE;
DROP TABLE IF EXISTS portal_pipeline_boards CASCADE;
DROP TABLE IF EXISTS portal_dispatch_items CASCADE;
DROP TABLE IF EXISTS portal_momentum_items CASCADE;
DROP TABLE IF EXISTS portal_sidebar_messages CASCADE;
DROP TABLE IF EXISTS portal_sidebar_participants CASCADE;
DROP TABLE IF EXISTS portal_sidebar_threads CASCADE;
DROP TABLE IF EXISTS portal_circle_memberships CASCADE;
DROP TABLE IF EXISTS portal_circles CASCADE;

DROP INDEX IF EXISTS committees_scope_fk_uidx;
DROP POLICY IF EXISTS audit_log_tenant_isolation ON audit_log;
ALTER TABLE officer_roster DROP COLUMN IF EXISTS user_id;
ALTER TABLE officer_roster DROP COLUMN IF EXISTS canonical_position;
ALTER TABLE grievances DROP CONSTRAINT IF EXISTS grievances_privacy_mode_check;
ALTER TABLE grievances DROP COLUMN IF EXISTS member_user_id;
ALTER TABLE grievances DROP COLUMN IF EXISTS privacy_mode;
ALTER TABLE audit_log DROP COLUMN IF EXISTS circle_id;

ALTER TABLE discussion_posts DROP COLUMN IF EXISTS mentioned_user_ids;
ALTER TABLE discussion_posts DROP COLUMN IF EXISTS reactions;
ALTER TABLE discussion_posts DROP COLUMN IF EXISTS updated_at;
ALTER TABLE tasks DROP COLUMN IF EXISTS notes;
ALTER TABLE tasks DROP COLUMN IF EXISTS mentioned_user_ids;
ALTER TABLE tasks DROP COLUMN IF EXISTS reactions;
ALTER TABLE tasks DROP COLUMN IF EXISTS updated_at;

DROP TABLE IF EXISTS access_requests CASCADE;

-- Rewind customization foundation (0054) + membership policy uniqueness (0055).
-- Forward-only CREATE TABLE / ALTER would collide with objects left from the
-- fresh-volume migrate that precedes this journal-hole fixture.
DROP TABLE IF EXISTS customization_delivery_fragments CASCADE;
DROP TABLE IF EXISTS customization_public_projections CASCADE;
DROP TABLE IF EXISTS customization_section_controls CASCADE;
DROP TABLE IF EXISTS customization_preset_bindings CASCADE;
DROP TABLE IF EXISTS customization_maintenance_grants CASCADE;
DROP TABLE IF EXISTS customization_operations CASCADE;
DROP TABLE IF EXISTS customization_revisions CASCADE;
DROP TABLE IF EXISTS customization_releases CASCADE;
DROP TABLE IF EXISTS customization_drafts CASCADE;
DROP TABLE IF EXISTS customization_heads CASCADE;
DROP TABLE IF EXISTS customization_resources CASCADE;
DROP TABLE IF EXISTS customization_assets CASCADE;
DROP TABLE IF EXISTS customization_audit CASCADE;
DROP TABLE IF EXISTS customization_policy CASCADE;
DROP TABLE IF EXISTS customization_scopes CASCADE;
DROP INDEX IF EXISTS locals_union_number_active_uidx;
DROP INDEX IF EXISTS local_memberships_primary_active_uidx;
ALTER TABLE unions DROP CONSTRAINT IF EXISTS unions_membership_policy_check;
ALTER TABLE unions DROP COLUMN IF EXISTS membership_policy;
DROP FUNCTION IF EXISTS public.customization_fragment_access(text, text, text, text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.customization_current_access(text, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.customization_audience(text, text) CASCADE;
DROP FUNCTION IF EXISTS public.customization_scope_live(text) CASCADE;
DROP FUNCTION IF EXISTS public.customization_root(text, boolean) CASCADE;
DROP FUNCTION IF EXISTS public.customization_immutable() CASCADE;
DROP FUNCTION IF EXISTS public.customization_row_guard() CASCADE;
DROP FUNCTION IF EXISTS public.customization_scope_guard() CASCADE;

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

HOLE_COUNT="$(psql_scalar "SELECT count(*) FROM drizzle.__drizzle_migrations")"
[[ "${HOLE_COUNT}" == "${HOLE_EXPECTED_COUNT}" ]] || {
  echo "[docker-migrate-smoke] journal-hole count=${HOLE_COUNT}; expected ${HOLE_EXPECTED_COUNT} (${JOURNAL_ENTRY_COUNT} total minus 0027/0028/0029 and the ${RECONCILE_TAIL_COUNT}-entry reconciliation tail)" >&2
  exit 1
}
REPAIR_LOG="${LOG_DIR}/repair.log"
if ! run_gate "${REPAIR_LOG}"; then
  cat "${REPAIR_LOG}" >&2
  exit 1
fi
cat "${REPAIR_LOG}"
grep -Fq "verified tail=${EXPECTED_TAIL}" "${REPAIR_LOG}"

REPAIRED_COUNT="$(psql_scalar "SELECT count(*) FROM drizzle.__drizzle_migrations")"
[[ "${REPAIRED_COUNT}" == "${REPAIRED_EXPECTED_COUNT}" ]] || {
  echo "[docker-migrate-smoke] post-repair journal count=${REPAIRED_COUNT}; expected ${REPAIRED_EXPECTED_COUNT} (hole + replayed reconciliation tail)" >&2
  exit 1
}
TASKS_AFTER="$(psql_scalar "SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name IN ('notes','mentioned_user_ids','reactions','updated_at')")"
[[ "${TASKS_AFTER}" == "4" ]] || {
  echo "[docker-migrate-smoke] tasks columns after repair=${TASKS_AFTER}/4" >&2
  exit 1
}
TIME_TABLES="$(psql_scalar "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('time_worker_groups','time_ot_policies','time_shift_series','pto_accrual_policies','payroll_export_profiles')")"
[[ "${TIME_TABLES}" == "5" ]] || {
  echo "[docker-migrate-smoke] time tables after repair=${TIME_TABLES}/5" >&2
  exit 1
}
META_AFTER="$(psql_scalar "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'platform_meta'")"
[[ "${META_AFTER}" == "0" ]] || {
  echo "[docker-migrate-smoke] platform_meta still present after repair" >&2
  exit 1
}
PRESERVED="$(psql_scalar "SELECT count(*) FROM unions WHERE id = 'union-opseu' AND name = 'Preserve Me' AND is_demo = true")"
[[ "${PRESERVED}" == "1" ]] || {
  echo "[docker-migrate-smoke] sentinel union-opseu not preserved/demo-flagged (count=${PRESERVED})" >&2
  exit 1
}

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
