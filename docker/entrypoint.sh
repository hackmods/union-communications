#!/bin/sh
set -e

# No database migrations in the MVP (in-memory adapters).
# Placeholder kept for parity with the reference pipeline; when a
# persistent DB is added, run migrations here before starting the app.

exec "$@"
