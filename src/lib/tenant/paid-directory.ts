import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { withRlsContext } from "@/lib/db/rls-context";
import { divisions, locals, unions } from "@/lib/db/schema/tenant";

/** Absence of a durable database never grants paid directory access. */
export async function hasPaidTenantDirectory(unionId: string): Promise<boolean> {
  if (!isPostgresConfigured()) return false;
  const rows = await getDb()
    .select({ enabled: unions.paidTenantDirectoryEnabled })
    .from(unions)
    .where(and(eq(unions.id, unionId), isNull(unions.archivedAt)))
    .limit(1);
  return rows[0]?.enabled === true;
}

export async function setPaidTenantDirectory(
  unionId: string,
  enabled: boolean,
): Promise<boolean> {
  if (!isPostgresConfigured()) {
    throw new Error("Durable database required for paid directory entitlements");
  }
  const rows = await getDb()
    .update(unions)
    .set({ paidTenantDirectoryEnabled: enabled })
    .where(and(eq(unions.id, unionId), isNull(unions.archivedAt)))
    .returning({ id: unions.id });
  return rows.length > 0;
}

/** Fixed, non-personal directory projection; no users, cases, or membership rows. */
export async function listPaidTenantDirectory(unionId: string, userId: string) {
  if (!isPostgresConfigured()) return [];
  return withRlsContext({ unionId, userId, crossLocal: true }, async () =>
    getDb()
      .select({
        id: locals.id,
        localNumber: locals.localNumber,
        divisionId: locals.divisionId,
        divisionName: divisions.name,
      })
      .from(locals)
      .leftJoin(divisions, eq(locals.divisionId, divisions.id))
      .where(and(eq(locals.unionId, unionId), isNull(locals.archivedAt)))
      .orderBy(asc(locals.localNumber)),
  );
}
