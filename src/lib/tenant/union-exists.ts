import { eq, sql } from "drizzle-orm";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { unions } from "@/lib/db/schema/tenant";

/**
 * True when `unionId` is a real `unions` row. Fail-open (true) when Postgres
 * is not configured so memory-mode writers are not blocked.
 */
export async function unionExists(unionId: string): Promise<boolean> {
  if (!unionId.trim()) return false;
  if (!isPostgresConfigured()) return true;
  try {
    const db = getDb();
    const [row] = await db
      .select({ id: unions.id })
      .from(unions)
      .where(eq(unions.id, unionId))
      .limit(1);
    return Boolean(row);
  } catch {
    // Fail open on lookup errors — prefer a FK error over wrong soft-null.
    return true;
  }
}

/** Count rows in `unions`. Returns null when Postgres is unset or the query fails. */
export async function countUnions(): Promise<number | null> {
  if (!isPostgresConfigured()) return null;
  try {
    const db = getDb();
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(unions);
    return typeof row?.count === "number" ? row.count : Number(row?.count ?? 0);
  } catch {
    return null;
  }
}
