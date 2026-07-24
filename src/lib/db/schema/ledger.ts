import {
  doublePrecision,
  index,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { locals, unions } from "./tenant";

/** ORG-006 — local discretionary fund ledger (not dues/ERP). */
export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: text("id").primaryKey(),
    unionId: text("union_id")
      .notNull()
      .references(() => unions.id, { onDelete: "restrict" }),
    localId: text("local_id")
      .notNull()
      .references(() => locals.id, { onDelete: "restrict" }),
    /** ISO date or datetime string (YYYY-MM-DD…). */
    entryDate: text("entry_date").notNull(),
    description: text("description").notNull(),
    amount: doublePrecision("amount").notNull(),
    entryType: text("entry_type").notNull(),
    category: text("category").notNull(),
    recordedById: text("recorded_by_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("ledger_entries_union_local_idx").on(t.unionId, t.localId),
    index("ledger_entries_date_idx").on(t.entryDate),
    index("ledger_entries_type_idx").on(t.entryType),
    index("ledger_entries_category_idx").on(t.category),
  ],
);
