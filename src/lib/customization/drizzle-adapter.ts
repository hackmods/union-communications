import { and, eq, getTableColumns, isNull, type SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { getDb, getRlsTx, isPostgresConfigured } from "@/lib/db/client";
import { withRlsContext, type RlsSessionContext } from "@/lib/db/rls-context";
import { customizationTables, mutableCustomizationTables, type CustomizationAdapter, type CustomizationTransaction, type CustomizationTable, type CustomizationRow, type CustomizationInsert, type MutableCustomizationTable, type RowMatch } from "./adapter";

function predicate<K extends CustomizationTable>(name: K, match: RowMatch<K>): SQL | undefined {
  const columns = getTableColumns(customizationTables[name] as PgTable);
  return and(...Object.entries(match).map(([key, value]) => {
    const column = columns[key];
    if (!column || value === undefined) throw new Error("Invalid customization match");
    return value === null ? isNull(column) : eq(column, value);
  }));
}
function createTransaction(isOpen: () => boolean): CustomizationTransaction {
 const bound = getRlsTx();
 function activeDb() {
  if (!bound || !isOpen() || getRlsTx() !== bound) throw new Error("Customization requires its active RLS transaction");
  return getDb();
 }
 return {
  async read<K extends CustomizationTable>(name: K, match: RowMatch<K> = {}, lock = false) {
    const query = activeDb().select().from(customizationTables[name] as PgTable).where(predicate(name, match));
    const rows = await (lock ? query.for("update") : query);
    return rows as unknown as CustomizationRow<K>[];
  },
  async insert<K extends CustomizationTable>(name: K, row: CustomizationInsert<K>) {
    // Each generic key ties its row to the exact Drizzle table at the API boundary.
    const rows = await activeDb().insert(customizationTables[name] as PgTable).values(row).returning();
    return rows[0] as unknown as CustomizationRow<K>;
  },
  async update<K extends MutableCustomizationTable>(name: K, match: RowMatch<K>, changes: Partial<CustomizationInsert<K>>) {
    if (!mutableCustomizationTables.includes(name) || !Object.keys(match).length) throw new Error("Unbounded or immutable customization update");
    const rows = await activeDb().update(customizationTables[name] as PgTable).set(changes).where(predicate(name, match)).returning();
    return rows as unknown as CustomizationRow<K>[];
  },
 };
}

export class DrizzleCustomizationAdapter implements CustomizationAdapter {
  readerTransaction<T>(context: RlsSessionContext, run: (tx: Pick<CustomizationTransaction, "read">) => Promise<T>): Promise<T> {
    return this.transaction({ ...context, mfaVerified: false, crossLocal: false }, tx => run({ read: tx.read }));
  }
  async transaction<T>(context: RlsSessionContext, run: (tx: CustomizationTransaction) => Promise<T>): Promise<T> {
    if (!isPostgresConfigured()) throw new Error("Customization PostgreSQL is unavailable");
    if (getRlsTx()) throw new Error("Customization adapter owns its transaction; pass its transaction handle to nested services");
    return withRlsContext({ ...context, crossLocal: false }, async () => {
      let open = true;
      try { return await run(createTransaction(() => open)); }
      finally { open = false; }
    });
  }
}
