import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import type { Db } from "./client";

let client: ReturnType<typeof postgres> | null = null;
let db: Db | null = null;

/**
 * Owner / DDL role client (`MIGRATE_DATABASE_URL`).
 * Used for cross-tenant ops that must bypass RLS (demo purge). Never use for
 * ordinary Hub request paths — those stay on `DATABASE_URL` + `withRlsContext`.
 */
export function isOwnerDbConfigured(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return Boolean(env.MIGRATE_DATABASE_URL?.trim());
}

export function getOwnerDb(
  env: NodeJS.ProcessEnv = process.env,
): Db {
  const url = env.MIGRATE_DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "MIGRATE_DATABASE_URL is required for owner-role operations (demo purge).",
    );
  }
  if (!db) {
    client = postgres(url, { max: 2 });
    db = drizzle(client, { schema });
  }
  return db;
}

/** Close the owner pool (CLI scripts should call this before exit). */
export async function closeOwnerDb(): Promise<void> {
  db = null;
  if (client) {
    await client.end({ timeout: 2 });
    client = null;
  }
}
