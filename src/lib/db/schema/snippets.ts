import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { bargainingUnits, locals, unions } from "./tenant";

export const caSnippets = pgTable(
  "ca_snippets",
  {
    id: text("id").primaryKey(),
    unionId: text("union_id")
      .notNull()
      .references(() => unions.id, { onDelete: "restrict" }),
    localId: text("local_id").references(() => locals.id, {
      onDelete: "set null",
    }),
    bargainingUnitId: text("bargaining_unit_id").references(
      () => bargainingUnits.id,
      { onDelete: "set null" },
    ),
    libraryId: text("library_id"),
    locale: text("locale").notNull().default("en"),
    title: text("title").notNull(),
    clauseRef: text("clause_ref").notNull(),
    body: text("body").notNull(),
    tags: jsonb("tags").notNull().$type<string[]>().default([]),
    createdById: text("created_by_id").notNull(),
    createdByName: text("created_by_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("ca_snippets_union_idx").on(t.unionId),
    index("ca_snippets_union_local_idx").on(t.unionId, t.localId),
    index("ca_snippets_clause_ref_idx").on(t.unionId, t.clauseRef),
    index("ca_snippets_library_locale_idx").on(t.unionId, t.libraryId, t.locale),
  ],
);
