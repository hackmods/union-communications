import {
  doublePrecision,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { locals, unions } from "./tenant";
import type { ExpenseLineItem } from "@/types/expenses";

/** ORG-009 — union business & purchase expense submissions. */
export const expenseSubmissions = pgTable(
  "expense_submissions",
  {
    id: text("id").primaryKey(),
    unionId: text("union_id")
      .notNull()
      .references(() => unions.id, { onDelete: "restrict" }),
    localId: text("local_id")
      .notNull()
      .references(() => locals.id, { onDelete: "restrict" }),
    submittedById: text("submitted_by_id").notNull(),
    submittedByName: text("submitted_by_name").notNull(),
    title: text("title").notNull(),
    purpose: text("purpose").notNull(),
    status: text("status").notNull(),
    lineItems: jsonb("line_items").$type<ExpenseLineItem[]>().notNull(),
    totalAmount: doublePrecision("total_amount").notNull(),
    approvedById: text("approved_by_id"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    deniedReason: text("denied_reason"),
    ledgerEntryId: text("ledger_entry_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("expense_submissions_union_local_idx").on(t.unionId, t.localId),
    index("expense_submissions_status_idx").on(t.status),
    index("expense_submissions_submitted_by_idx").on(t.submittedById),
  ],
);
