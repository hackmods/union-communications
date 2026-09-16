import { AsyncLocalStorage } from "node:async_hooks";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Request-scoped transaction (SEC-003 / ADR-008).
 * `withRlsContext()` in rls-context.ts runs a tenant-scoped operation inside a
 * transaction and stores it here; `getDb()` returns it so nested adapter queries
 * share one transaction with the RLS session GUCs (`SET LOCAL`) applied once.
 */
const txScope = new AsyncLocalStorage<{ tx: unknown }>();

/** Run `fn` with `tx` as the active transaction returned by `getDb()`. */
export function runWithDbTx<T>(tx: unknown, fn: () => Promise<T>): Promise<T> {
  return txScope.run({ tx }, () => fn());
}

/** The active RLS-scoped transaction, if one is in progress. */
export function getRlsTx(): unknown {
  return txScope.getStore()?.tx;
}

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
 * Returns the active RLS-scoped transaction when one is in progress so
 * tenant-scoped adapter queries ride the same connection + GUC context.
 */
export function getDb(): Db {
  const activeTx = getRlsTx();
  if (activeTx) {
    return activeTx as Db;
  }
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
