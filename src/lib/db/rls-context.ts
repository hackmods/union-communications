import { sql } from "drizzle-orm";
import {
  getDb,
  isPostgresConfigured,
  runWithDbTx,
  type Db,
} from "@/lib/db/client";

export interface RlsSessionContext {
  unionId?: string;
  localId?: string;
  userId?: string;
  mfaVerified?: boolean;
  /** Elevated cross-local roles: union_admin / division_admin / platform_admin */
  crossLocal?: boolean;
}

/** Root client or transaction — both expose `execute` for SET LOCAL GUCs. */
export type RlsDbClient = Pick<Db, "execute">;

/**
 * Set Postgres session vars for RLS policies (SEC-003 / ADR-008).
 * Call inside a transaction after auth succeeds. No-ops if vars already empty.
 */
export async function applyRlsContext(
  db: RlsDbClient,
  ctx: RlsSessionContext,
): Promise<void> {
  await db.execute(
    sql`select set_config('app.current_union_id', ${ctx.unionId ?? ""}, true)`,
  );
  await db.execute(
    sql`select set_config('app.current_local_id', ${ctx.localId ?? ""}, true)`,
  );
  await db.execute(
    sql`select set_config('app.current_user_id', ${ctx.userId ?? ""}, true)`,
  );
  await db.execute(
    sql`select set_config('app.current_cross_local', ${ctx.crossLocal ? "true" : "false"}, true)`,
  );
  await db.execute(
    sql`select set_config('app.current_mfa_verified', ${ctx.mfaVerified ? "true" : "false"}, true)`,
  );
}

/**
 * Run a tenant-scoped operation with the RLS session GUCs applied.
 *
 * - Postgres mode: opens a transaction, applies `SET LOCAL app.*` vars, and
 *   arranges for `getDb()` to return that transaction so nested adapter queries
 *   are tenant-scoped on one connection (ADR-008).
 * - Memory mode (no `DATABASE_URL`): transparent pass-through so local dev and
 *   tests that use memory adapters are unaffected.
 *
 * Every tenant-scoped store/route call that knows the user's union/local scope
 * should go through this so RLS binds under the non-owner `unionops_app` role.
 */
export async function withRlsContext<T>(
  ctx: RlsSessionContext,
  fn: () => Promise<T>,
): Promise<T> {
  if (!isPostgresConfigured()) {
    return fn();
  }
  return getDb().transaction(async (tx) => {
    await applyRlsContext(tx, ctx);
    return runWithDbTx(tx, () => fn());
  });
}
