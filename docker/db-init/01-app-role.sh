#!/bin/bash
# Create / password-sync the non-owner app role on first Postgres init.
# Migration 0008_app_role.sql also CREATE ROLEs idempotently; this sets LOGIN password.
set -euo pipefail

APP_ROLE="${POSTGRES_APP_USER:-unionops_app}"
# Prefer dedicated app password; demo compose may reuse POSTGRES_PASSWORD.
APP_PASSWORD="${POSTGRES_APP_PASSWORD:-${POSTGRES_PASSWORD:-}}"

if [ -z "$APP_PASSWORD" ]; then
  echo "[db-init] no POSTGRES_APP_PASSWORD / POSTGRES_PASSWORD — skipping ${APP_ROLE} password"
  exit 0
fi

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<EOSQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${APP_ROLE}') THEN
    CREATE ROLE ${APP_ROLE} WITH
      LOGIN
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOINHERIT
      NOBYPASSRLS
      NOREPLICATION
      PASSWORD '${APP_PASSWORD}';
  ELSE
    ALTER ROLE ${APP_ROLE} WITH LOGIN PASSWORD '${APP_PASSWORD}';
  END IF;
END
\$\$;
EOSQL

echo "[db-init] ${APP_ROLE} password synced from POSTGRES_APP_PASSWORD"
