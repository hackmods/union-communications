import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { locals, unions, users } from "./tenant";

/**
 * Explicit opt-in for local member broadcast (ADR-022).
 * Never treat Hub account creation or invites as broadcast consent.
 */
export const memberBroadcastConsents = pgTable(
  "member_broadcast_consents",
  {
    id: text("id").primaryKey(),
    unionId: text("union_id")
      .notNull()
      .references(() => unions.id, { onDelete: "cascade" }),
    localId: text("local_id")
      .notNull()
      .references(() => locals.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    status: text("status")
      .notNull()
      .$type<"confirmed" | "revoked">()
      .default("confirmed"),
    wordingVersion: text("wording_version").notNull(),
    consentedAt: timestamp("consented_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("member_broadcast_consents_user_local_uidx").on(
      t.userId,
      t.localId,
    ),
    index("member_broadcast_consents_local_status_idx").on(
      t.unionId,
      t.localId,
      t.status,
    ),
  ],
);

export const memberBroadcastCampaigns = pgTable(
  "member_broadcast_campaigns",
  {
    id: text("id").primaryKey(),
    unionId: text("union_id")
      .notNull()
      .references(() => unions.id, { onDelete: "cascade" }),
    localId: text("local_id")
      .notNull()
      .references(() => locals.id, { onDelete: "cascade" }),
    createdById: text("created_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    subject: text("subject").notNull(),
    bodyText: text("body_text").notNull(),
    openTrackingRequested: text("open_tracking_requested")
      .notNull()
      .$type<"yes" | "no">()
      .default("no"),
    openTrackingApplied: text("open_tracking_applied")
      .notNull()
      .$type<"yes" | "no">()
      .default("no"),
    recipientCount: text("recipient_count").notNull().default("0"),
    acceptedCount: text("accepted_count").notNull().default("0"),
    failedCount: text("failed_count").notNull().default("0"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("member_broadcast_campaigns_local_idx").on(t.unionId, t.localId),
  ],
);
