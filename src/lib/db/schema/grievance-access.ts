import { check, index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { grievances } from "./grievance";
import { users } from "./tenant";

export const grievanceParticipants = pgTable(
  "grievance_participants",
  {
    id: text("id").primaryKey(),
    grievanceId: text("grievance_id").notNull().references(() => grievances.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    relationship: text("relationship").notNull().$type<"member" | "case_worker" | "representative" | "observer">(),
    accessLevel: text("access_level").notNull().$type<"member_safe" | "summary" | "case_read" | "case_write">(),
    addedById: text("added_by_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [
    check("grievance_participants_relationship_access_check", sql`(${t.relationship} = 'member' AND ${t.accessLevel} = 'member_safe') OR (${t.relationship} <> 'member' AND ${t.accessLevel} IN ('summary','case_read','case_write'))`),
    check("grievance_participants_case_worker_write_check", sql`${t.relationship} <> 'case_worker' OR ${t.accessLevel} = 'case_write'`),
    uniqueIndex("grievance_participants_active_uidx").on(t.grievanceId, t.userId).where(sql`${t.revokedAt} IS NULL`),
    index("grievance_participants_user_idx").on(t.userId, t.revokedAt),
  ],
);

export const grievanceMemberUpdates = pgTable(
  "grievance_member_updates",
  {
    id: text("id").primaryKey(),
    grievanceId: text("grievance_id").notNull().references(() => grievances.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    publishedById: text("published_by_id").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
    withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
  },
  (t) => [index("grievance_member_updates_case_idx").on(t.grievanceId, t.publishedAt)],
);

export const grievanceAttachmentShares = pgTable(
  "grievance_attachment_shares",
  {
    id: text("id").primaryKey(),
    grievanceId: text("grievance_id").notNull().references(() => grievances.id, { onDelete: "cascade" }),
    attachmentId: text("attachment_id").notNull(),
    sharedById: text("shared_by_id").notNull(),
    sharedAt: timestamp("shared_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("grievance_attachment_shares_active_uidx").on(t.grievanceId, t.attachmentId).where(sql`${t.revokedAt} IS NULL`),
    index("grievance_attachment_shares_case_idx").on(t.grievanceId, t.revokedAt),
  ],
);
