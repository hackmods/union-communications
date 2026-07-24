import {
  doublePrecision,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { locals, unions } from "./tenant";
import type { EstimatedCosts, ExpenseLineItem } from "@/types/travel";

/** ORG-008 — travel authorizations (TAR-style). */
export const travelAuthorizations = pgTable(
  "travel_authorizations",
  {
    id: text("id").primaryKey(),
    unionId: text("union_id")
      .notNull()
      .references(() => unions.id, { onDelete: "restrict" }),
    localId: text("local_id")
      .notNull()
      .references(() => locals.id, { onDelete: "restrict" }),
    requestedById: text("requested_by_id").notNull(),
    requestedByName: text("requested_by_name").notNull(),
    purpose: text("purpose").notNull(),
    eventName: text("event_name").notNull(),
    eventStartDate: text("event_start_date").notNull(),
    eventEndDate: text("event_end_date").notNull(),
    estimatedCosts: jsonb("estimated_costs").$type<EstimatedCosts>().notNull(),
    status: text("status").notNull(),
    approvedById: text("approved_by_id"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    deniedReason: text("denied_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("travel_authorizations_union_local_idx").on(t.unionId, t.localId),
    index("travel_authorizations_status_idx").on(t.status),
  ],
);

export const cashAdvances = pgTable(
  "cash_advances",
  {
    id: text("id").primaryKey(),
    travelAuthorizationId: text("travel_authorization_id")
      .notNull()
      .references(() => travelAuthorizations.id, { onDelete: "cascade" }),
    unionId: text("union_id")
      .notNull()
      .references(() => unions.id, { onDelete: "restrict" }),
    localId: text("local_id")
      .notNull()
      .references(() => locals.id, { onDelete: "restrict" }),
    amount: doublePrecision("amount").notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull(),
    issuedById: text("issued_by_id").notNull(),
    ledgerEntryId: text("ledger_entry_id").notNull(),
  },
  (t) => [
    index("cash_advances_auth_idx").on(t.travelAuthorizationId),
    index("cash_advances_union_local_idx").on(t.unionId, t.localId),
  ],
);

export const expenseClaims = pgTable(
  "expense_claims",
  {
    id: text("id").primaryKey(),
    travelAuthorizationId: text("travel_authorization_id")
      .notNull()
      .references(() => travelAuthorizations.id, { onDelete: "cascade" }),
    unionId: text("union_id")
      .notNull()
      .references(() => unions.id, { onDelete: "restrict" }),
    localId: text("local_id")
      .notNull()
      .references(() => locals.id, { onDelete: "restrict" }),
    claimantId: text("claimant_id").notNull(),
    status: text("status").notNull(),
    lineItems: jsonb("line_items").$type<ExpenseLineItem[]>().notNull(),
    advanceAmount: doublePrecision("advance_amount").notNull(),
    difference: doublePrecision("difference"),
    reconciledAt: timestamp("reconciled_at", { withTimezone: true }),
    reconciledById: text("reconciled_by_id"),
    reconcileLedgerEntryId: text("reconcile_ledger_entry_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("expense_claims_auth_idx").on(t.travelAuthorizationId),
    index("expense_claims_union_local_idx").on(t.unionId, t.localId),
  ],
);
