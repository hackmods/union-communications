import { bigserial, index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export type MarketingSubscriptionStatus = "pending_confirmation" | "confirmed" | "suppressed";
export type MarketingConsentEventType = "grant" | "confirmation" | "withdrawal" | "unsubscribe" | "admin_correction" | "provider_bounce" | "provider_complaint";
export type MarketingTokenPurpose = "confirm" | "preferences" | "unsubscribe";
export type MarketingCampaignStatus = "draft" | "approved" | "released" | "paused" | "completed";
export type MarketingDeliveryStatus = "queued" | "sending" | "accepted" | "failed" | "suppressed";

/** Platform-wide, self-submitted individual addresses. No tenant or member-roster relationship. */
export const marketingSubscribers = pgTable("marketing_subscribers", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  lookupKey: text("lookup_key").notNull(),
  locale: text("locale").notNull().$type<"en" | "fr">(),
  status: text("status").notNull().$type<MarketingSubscriptionStatus>(),
  latestGrantId: text("latest_grant_id"),
  wordingVersion: text("wording_version"),
  lastRequestAt: timestamp("last_request_at", { withTimezone: true }),
  lastPreferencesAt: timestamp("last_preferences_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("marketing_subscribers_lookup_uidx").on(t.lookupKey), index("marketing_subscribers_status_idx").on(t.status, t.locale)]);

/** Append-only consent evidence, ordered by a database-assigned sequence. */
export const marketingConsentEvents = pgTable("marketing_consent_events", {
  sequence: bigserial("sequence", { mode: "number" }).primaryKey(),
  id: text("id").notNull(),
  subscriberId: text("subscriber_id").notNull().references(() => marketingSubscribers.id, { onDelete: "restrict" }),
  destinationEmail: text("destination_email").notNull(),
  eventType: text("event_type").notNull().$type<MarketingConsentEventType>(),
  locale: text("locale").$type<"en" | "fr">(),
  wordingVersion: text("wording_version"),
  wordingText: text("wording_text"),
  source: text("source").notNull(),
  grantEventId: text("grant_event_id"),
  reason: text("reason"),
  actorId: text("actor_id"),
  requestId: text("request_id"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("marketing_consent_event_id_uidx").on(t.id), index("marketing_consent_subscriber_idx").on(t.subscriberId, t.sequence)]);

/** Opaque signed-link hashes; raw bearer links never enter the database. */
export const marketingActionTokens = pgTable("marketing_action_tokens", {
  id: text("id").primaryKey(),
  subscriberId: text("subscriber_id").notNull().references(() => marketingSubscribers.id, { onDelete: "restrict" }),
  tokenHash: text("token_hash").notNull(),
  purpose: text("purpose").notNull().$type<MarketingTokenPurpose>(),
  grantEventId: text("grant_event_id"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("marketing_action_token_hash_uidx").on(t.tokenHash), index("marketing_action_token_expiry_idx").on(t.expiresAt)]);

/** Durable public-request throttle; key is an HMAC of the client address. */
export const marketingRequestLimits = pgTable("marketing_request_limits", {
  key: text("key").primaryKey(),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull().defaultNow(),
  attempts: integer("attempts").notNull().default(0),
}, (t) => [index("marketing_request_limits_window_idx").on(t.windowStartedAt)]);

/** Approved templates are copied into a release row before any recipient is queued. */
export const marketingCampaigns = pgTable("marketing_campaigns", {
  id: text("id").primaryKey(),
  subjectEn: text("subject_en").notNull(),
  subjectFr: text("subject_fr").notNull(),
  bodyEn: text("body_en").notNull(),
  bodyFr: text("body_fr").notNull(),
  status: text("status").notNull().default("draft").$type<MarketingCampaignStatus>(),
  approvalReference: text("approval_reference"),
  approvedBy: text("approved_by"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  releasedBy: text("released_by"),
  releasedAt: timestamp("released_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (t) => [index("marketing_campaigns_created_idx").on(t.createdAt)]);

export const marketingDeliveries = pgTable("marketing_deliveries", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id").notNull().references(() => marketingCampaigns.id, { onDelete: "restrict" }),
  subscriberId: text("subscriber_id").notNull().references(() => marketingSubscribers.id, { onDelete: "restrict" }),
  kind: text("kind").notNull().default("campaign").$type<"campaign" | "test">(),
  status: text("status").notNull().default("queued").$type<MarketingDeliveryStatus>(),
  attemptCount: integer("attempt_count").notNull().default(0),
  providerMessageId: text("provider_message_id"),
  errorCode: text("error_code"),
  queuedAt: timestamp("queued_at", { withTimezone: true }).notNull().defaultNow(),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
}, (t) => [uniqueIndex("marketing_delivery_once_uidx").on(t.campaignId, t.subscriberId, t.kind), index("marketing_delivery_queue_idx").on(t.status, t.queuedAt), index("marketing_delivery_provider_idx").on(t.providerMessageId)]);

/** Minimal provider failure/complaint evidence; never stores the webhook payload. */
export const marketingProviderEvents = pgTable("marketing_provider_events", {
  id: text("id").primaryKey(),
  deliveryId: text("delivery_id").notNull().references(() => marketingDeliveries.id, { onDelete: "restrict" }),
  eventType: text("event_type").notNull().$type<"temporary_failure" | "permanent_failure" | "complained" | "unsubscribed">(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Serializes send rate across replicas. */
export const marketingDispatchControl = pgTable("marketing_dispatch_control", {
  id: integer("id").primaryKey(),
  nextSendAt: timestamp("next_send_at", { withTimezone: true }).notNull().defaultNow(),
});
