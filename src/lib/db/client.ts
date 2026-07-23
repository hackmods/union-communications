import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = ReturnType<typeof drizzle<typeof schema>>;

let client: ReturnType<typeof postgres> | null = null;
let db: Db | null = null;

/** True when a Postgres backend is configured for this process. */
export function isPostgresConfigured(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return Boolean(env.DATABASE_URL?.trim());
}

/**
 * Lazy Drizzle client. Only call when `isPostgresConfigured()` is true.
 * Throws if DATABASE_URL is missing — callers must feature-flag first.
 */
export function getDb(): Db {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Use memory adapters or configure Postgres.",
    );
  }
  if (!db) {
    client = postgres(url, { max: 10 });
    db = drizzle(client, { schema });
  }
  return db;
}

/** @internal test helper */
export function resetDbClient(): void {
  db = null;
  if (client) {
    void client.end({ timeout: 1 });
    client = null;
  }
}
