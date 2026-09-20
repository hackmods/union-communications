/**
 * Hub Bylaws drafts + Proposal packages (confidential casework).
 * Companion DDL: `0039_hub_bylaws_proposals.sql`.
 */
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { bargainingUnits, locals, unions } from "./tenant";

export const bylawDrafts = pgTable(
  "bylaw_drafts",
  {
    id: text("id").primaryKey(),
    unionId: text("union_id")
      .notNull()
      .references(() => unions.id, { onDelete: "restrict" }),
    localId: text("local_id")
      .notNull()
      .references(() => locals.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    status: text("status").notNull().default("draft"),
    mode: text("mode").notNull().default("template"),
    form: jsonb("form").notNull().$type<Record<string, unknown>>(),
    updatedById: text("updated_by_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("bylaw_drafts_union_local_idx").on(t.unionId, t.localId),
    index("bylaw_drafts_status_idx").on(t.status),
  ],
);

export const proposalPackages = pgTable(
  "proposal_packages",
  {
    id: text("id").primaryKey(),
    unionId: text("union_id")
      .notNull()
      .references(() => unions.id, { onDelete: "restrict" }),
    localId: text("local_id")
      .notNull()
      .references(() => locals.id, { onDelete: "restrict" }),
    bargainingUnitId: text("bargaining_unit_id").references(
      () => bargainingUnits.id,
      { onDelete: "set null" },
    ),
    name: text("name").notNull(),
    roundLabel: text("round_label").notNull().default(""),
    status: text("status").notNull().default("active"),
    caucusNote: text("caucus_note").notNull().default(""),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    publishedSummary: jsonb("published_summary").$type<{
      headline: string;
      bullets: string[];
      guideHref?: string;
    } | null>(),
    createdById: text("created_by_id").notNull(),
    updatedById: text("updated_by_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("proposal_packages_union_local_idx").on(t.unionId, t.localId),
    index("proposal_packages_status_idx").on(t.status),
  ],
);

export const proposalRows = pgTable(
  "proposal_rows",
  {
    id: text("id").primaryKey(),
    packageId: text("package_id")
      .notNull()
      .references(() => proposalPackages.id, { onDelete: "cascade" }),
    unionId: text("union_id")
      .notNull()
      .references(() => unions.id, { onDelete: "restrict" }),
    localId: text("local_id")
      .notNull()
      .references(() => locals.id, { onDelete: "restrict" }),
    article: text("article").notNull().default(""),
    currentLanguage: text("current_language").notNull().default(""),
    unionProposal: text("union_proposal").notNull().default(""),
    employerCounter: text("employer_counter").notNull().default(""),
    status: text("status").notNull().default("open"),
    notes: text("notes").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    assigneeIds: jsonb("assignee_ids").notNull().$type<string[]>().default([]),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("proposal_rows_package_idx").on(t.packageId),
    index("proposal_rows_union_local_idx").on(t.unionId, t.localId),
  ],
);

export const proposalEvents = pgTable(
  "proposal_events",
  {
    id: text("id").primaryKey(),
    packageId: text("package_id")
      .notNull()
      .references(() => proposalPackages.id, { onDelete: "cascade" }),
    rowId: text("row_id"),
    unionId: text("union_id")
      .notNull()
      .references(() => unions.id, { onDelete: "restrict" }),
    localId: text("local_id")
      .notNull()
      .references(() => locals.id, { onDelete: "restrict" }),
    authorId: text("author_id").notNull(),
    authorName: text("author_name").notNull(),
    kind: text("kind").notNull(),
    body: text("body").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("proposal_events_package_idx").on(t.packageId),
    index("proposal_events_union_local_idx").on(t.unionId, t.localId),
  ],
);

/** Member-safe published snapshots for Local Portal. */
export const proposalPublications = pgTable(
  "proposal_publications",
  {
    id: text("id").primaryKey(),
    packageId: text("package_id")
      .notNull()
      .references(() => proposalPackages.id, { onDelete: "cascade" }),
    unionId: text("union_id")
      .notNull()
      .references(() => unions.id, { onDelete: "restrict" }),
    localId: text("local_id")
      .notNull()
      .references(() => locals.id, { onDelete: "restrict" }),
    headline: text("headline").notNull(),
    bullets: jsonb("bullets").notNull().$type<string[]>().default([]),
    guideHref: text("guide_href"),
    publishedById: text("published_by_id").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (t) => [
    index("proposal_publications_union_local_idx").on(t.unionId, t.localId),
    index("proposal_publications_package_idx").on(t.packageId),
  ],
);
