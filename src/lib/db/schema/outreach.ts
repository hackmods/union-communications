import {
  bigserial,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { unions, users } from "./tenant";

/** Union-wide outreach list metadata (ADR-023). Not local member broadcast. */
export const outreachLists = pgTable(
  "outreach_lists",
  {
    id: text("id").primaryKey(),
    unionId: text("union_id")
      .notNull()
      .references(() => unions.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    status: text("status")
      .notNull()
      .$type<"active" | "paused">()
      .default("active"),
    createdById: text("created_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("outreach_lists_union_slug_uidx").on(t.unionId, t.slug),
    index("outreach_lists_union_idx").on(t.unionId, t.status),
  ],
);

export const outreachSubscribers = pgTable(
  "outreach_subscribers",
  {
    id: text("id").primaryKey(),
    listId: text("list_id")
      .notNull()
      .references(() => outreachLists.id, { onDelete: "cascade" }),
    unionId: text("union_id")
      .notNull()
      .references(() => unions.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    lookupKey: text("lookup_key").notNull(),
    locale: text("locale").notNull().$type<"en" | "fr">(),
    status: text("status")
      .notNull()
      .$type<"pending_confirmation" | "confirmed" | "suppressed">()
      .default("pending_confirmation"),
    wordingVersion: text("wording_version"),
    latestGrantId: text("latest_grant_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("outreach_subscribers_list_lookup_uidx").on(t.listId, t.lookupKey),
    index("outreach_subscribers_union_status_idx").on(
      t.unionId,
      t.listId,
      t.status,
    ),
  ],
);

export const outreachConsentEvents = pgTable(
  "outreach_consent_events",
  {
    sequence: bigserial("sequence", { mode: "number" }).primaryKey(),
    id: text("id").notNull(),
    subscriberId: text("subscriber_id")
      .notNull()
      .references(() => outreachSubscribers.id, { onDelete: "restrict" }),
    unionId: text("union_id")
      .notNull()
      .references(() => unions.id, { onDelete: "cascade" }),
    listId: text("list_id")
      .notNull()
      .references(() => outreachLists.id, { onDelete: "cascade" }),
    destinationEmail: text("destination_email").notNull(),
    eventType: text("event_type")
      .notNull()
      .$type<
        | "grant"
        | "confirmation"
        | "withdrawal"
        | "unsubscribe"
        | "import_attestation"
        | "provider_bounce"
        | "provider_complaint"
      >(),
    locale: text("locale").$type<"en" | "fr">(),
    wordingVersion: text("wording_version"),
    wordingText: text("wording_text"),
    source: text("source").notNull(),
    grantEventId: text("grant_event_id"),
    reason: text("reason"),
    actorId: text("actor_id"),
    requestId: text("request_id"),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("outreach_consent_event_id_uidx").on(t.id),
    index("outreach_consent_subscriber_idx").on(t.subscriberId, t.sequence),
  ],
);

export const outreachSuppressions = pgTable(
  "outreach_suppressions",
  {
    id: text("id").primaryKey(),
    unionId: text("union_id")
      .notNull()
      .references(() => unions.id, { onDelete: "cascade" }),
    listId: text("list_id").references(() => outreachLists.id, {
      onDelete: "cascade",
    }),
    email: text("email").notNull(),
    lookupKey: text("lookup_key").notNull(),
    reason: text("reason").notNull(),
    source: text("source").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("outreach_suppressions_union_lookup_uidx").on(
      t.unionId,
      t.lookupKey,
    ),
  ],
);

export const outreachCampaigns = pgTable(
  "outreach_campaigns",
  {
    id: text("id").primaryKey(),
    unionId: text("union_id")
      .notNull()
      .references(() => unions.id, { onDelete: "cascade" }),
    listId: text("list_id")
      .notNull()
      .references(() => outreachLists.id, { onDelete: "cascade" }),
    createdById: text("created_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    subject: text("subject").notNull(),
    bodyText: text("body_text").notNull(),
    status: text("status")
      .notNull()
      .$type<"draft" | "released" | "paused" | "completed">()
      .default("draft"),
    approvalReference: text("approval_reference"),
    recipientCount: text("recipient_count").notNull().default("0"),
    acceptedCount: text("accepted_count").notNull().default("0"),
    failedCount: text("failed_count").notNull().default("0"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    releasedAt: timestamp("released_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [index("outreach_campaigns_union_idx").on(t.unionId, t.listId)],
);

export const outreachDeliveries = pgTable(
  "outreach_deliveries",
  {
    id: text("id").primaryKey(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => outreachCampaigns.id, { onDelete: "cascade" }),
    unionId: text("union_id")
      .notNull()
      .references(() => unions.id, { onDelete: "cascade" }),
    subscriberId: text("subscriber_id")
      .notNull()
      .references(() => outreachSubscribers.id, { onDelete: "restrict" }),
    destinationEmail: text("destination_email").notNull(),
    providerMessageId: text("provider_message_id"),
    status: text("status")
      .notNull()
      .$type<"queued" | "sending" | "accepted" | "failed" | "suppressed">()
      .default("queued"),
    errorCode: text("error_code"),
    queuedAt: timestamp("queued_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [
    index("outreach_deliveries_queue_idx").on(t.status, t.queuedAt),
    index("outreach_deliveries_provider_idx").on(t.providerMessageId),
  ],
);

export const outreachActionTokens = pgTable(
  "outreach_action_tokens",
  {
    id: text("id").primaryKey(),
    unionId: text("union_id")
      .notNull()
      .references(() => unions.id, { onDelete: "cascade" }),
    listId: text("list_id")
      .notNull()
      .references(() => outreachLists.id, { onDelete: "cascade" }),
    subscriberId: text("subscriber_id")
      .notNull()
      .references(() => outreachSubscribers.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    purpose: text("purpose").notNull().$type<"confirm" | "unsubscribe">(),
    grantEventId: text("grant_event_id"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("outreach_action_tokens_expiry_idx").on(t.expiresAt)],
);
