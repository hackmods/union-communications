import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { locals, unions } from "./tenant";

/** ORG-002 — local officer roster with term dates (governance, not Comms letterhead). */
export const officerRoster = pgTable(
  "officer_roster",
  {
    id: text("id").primaryKey(),
    unionId: text("union_id")
      .notNull()
      .references(() => unions.id, { onDelete: "restrict" }),
    localId: text("local_id")
      .notNull()
      .references(() => locals.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    role: text("role").notNull(),
    /** ISO date or datetime string (YYYY-MM-DD…). */
    termStart: text("term_start").notNull(),
    termEnd: text("term_end"),
    email: text("email"),
    phone: text("phone"),
    committees: jsonb("committees").$type<string[]>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("officer_roster_union_local_idx").on(t.unionId, t.localId),
    index("officer_roster_term_end_idx").on(t.termEnd),
  ],
);
