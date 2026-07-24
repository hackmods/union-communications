import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { locals, unions } from "./tenant";

/** ORG-004 — internal committee roster. */
export const committees = pgTable(
  "committees",
  {
    id: text("id").primaryKey(),
    unionId: text("union_id")
      .notNull()
      .references(() => unions.id, { onDelete: "restrict" }),
    localId: text("local_id")
      .notNull()
      .references(() => locals.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    description: text("description"),
    memberOfficerIds: jsonb("member_officer_ids").notNull().$type<string[]>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("committees_union_local_idx").on(t.unionId, t.localId),
    index("committees_name_idx").on(t.name),
  ],
);
