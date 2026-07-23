import { sql } from "drizzle-orm";
import type { Db } from "@/lib/db/client";

export interface RlsSessionContext {
  unionId?: string;
  localId?: string;
  /** Elevated cross-local roles: union_admin / division_admin / platform_admin */
  crossLocal?: boolean;
}

/**
 * Set Postgres session vars for RLS policies (SEC-003 / ADR-008).
 * Call inside a transaction after auth succeeds. No-ops if vars already empty.
 */
export async function applyRlsContext(
  db: Db,
  ctx: RlsSessionContext,
): Promise<void> {
  await db.execute(
    sql`select set_config('app.current_union_id', ${ctx.unionId ?? ""}, true)`,
  );
  await db.execute(
    sql`select set_config('app.current_local_id', ${ctx.localId ?? ""}, true)`,
  );
  await db.execute(
    sql`select set_config('app.current_cross_local', ${ctx.crossLocal ? "true" : "false"}, true)`,
  );
}
