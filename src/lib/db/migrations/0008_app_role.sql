-- SEC-003: Non-owner application DB role so RLS policies actually bind.
--
-- The migration / drizzle-kit role (POSTGRES_USER) owns tables and bypasses RLS
-- by default. Runtime must connect as `unionops_app` (no BYPASSRLS, not owner).
-- Set the role password outside this migration (docker init or ALTER ROLE) via
-- POSTGRES_APP_PASSWORD — never commit a password here.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'unionops_app') THEN
    CREATE ROLE unionops_app WITH
      LOGIN
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOINHERIT
      NOBYPASSRLS
      NOREPLICATION;
  ELSE
    -- Harden existing role if re-run / upgraded.
    ALTER ROLE unionops_app WITH
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOINHERIT
      NOBYPASSRLS
      NOREPLICATION;
  END IF;
END
$$;

DO $$
BEGIN
  EXECUTE format(
    'GRANT CONNECT ON DATABASE %I TO unionops_app',
    current_database()
  );
END
$$;

GRANT USAGE ON SCHEMA public TO unionops_app;

-- Tenant + case tables (and any later tables created by the migration owner).
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO unionops_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO unionops_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO unionops_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO unionops_app;

-- Intentionally no GRANT CREATE / OWNERSHIP. Migrations stay on the owner role
-- (MIGRATE_DATABASE_URL / POSTGRES_USER). App runtime uses DATABASE_URL as
-- unionops_app so RLS from 0002 / 0005 / 0006 / 0007 applies.
