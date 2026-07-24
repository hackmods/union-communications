import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { locals, unions } from "./tenant";
import type {
  ElectionCycleStatus,
  ElectionTally,
  Nomination,
} from "@/types/elections";

/** ORG-003 — election cycles (nominations + manual tallies; no online voting). */
export const electionCycles = pgTable(
  "election_cycles",
  {
    id: text("id").primaryKey(),
    unionId: text("union_id")
      .notNull()
      .references(() => unions.id, { onDelete: "restrict" }),
    localId: text("local_id")
      .notNull()
      .references(() => locals.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    positions: jsonb("positions").notNull().$type<string[]>(),
    status: text("status").notNull().$type<ElectionCycleStatus>(),
    nominations: jsonb("nominations").notNull().$type<Nomination[]>(),
    tallies: jsonb("tallies").notNull().$type<ElectionTally[]>(),
    termStart: text("term_start"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("election_cycles_union_local_idx").on(t.unionId, t.localId),
    index("election_cycles_status_idx").on(t.status),
  ],
);
