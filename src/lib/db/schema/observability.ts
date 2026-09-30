import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Host operator error/event store (Sentry-free). Not tenant casework —
 * API reads are MFA-gated site-admin only; INSERT is open to the app role
 * so reportServerError / client ingest / cron can append without platform GUC.
 * Optional union_id is a routing hint only (never invent; stamp when known).
 */
export const observabilityEvents = pgTable(
  "observability_events",
  {
    id: text("id").primaryKey(),
    ts: timestamp("ts", { withTimezone: true }).notNull().defaultNow(),
    level: text("level").notNull().$type<"error" | "warn" | "info">(),
    source: text("source")
      .notNull()
      .$type<"server" | "client" | "cron" | "edge">(),
    message: text("message").notNull(),
    name: text("name"),
    stack: text("stack"),
    digest: text("digest"),
    route: text("route"),
    build: text("build"),
    signal: text("signal"),
    requestId: text("request_id"),
    fingerprint: text("fingerprint").notNull(),
    unionId: text("union_id"),
    meta: jsonb("meta").$type<Record<string, string | number | boolean | null>>(),
  },
  (t) => [
    index("observability_events_ts_idx").on(t.ts),
    index("observability_events_fp_ts_idx").on(t.fingerprint, t.ts),
    index("observability_events_level_ts_idx").on(t.level, t.ts),
    index("observability_events_source_ts_idx").on(t.source, t.ts),
    index("observability_events_union_ts_idx").on(t.unionId, t.ts),
  ],
);

export const observabilityIssueAcks = pgTable("observability_issue_acks", {
  fingerprint: text("fingerprint").primaryKey(),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  acknowledgedBy: text("acknowledged_by").notNull(),
  note: text("note"),
});

export const observabilityAlertRules = pgTable(
  "observability_alert_rules",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    minLevel: text("min_level").notNull().$type<"error" | "warn" | "info">(),
    sources: text("sources")
      .array()
      .$type<Array<"server" | "client" | "cron" | "edge">>(),
    fingerprint: text("fingerprint"),
    unionId: text("union_id"),
    thresholdCount: integer("threshold_count").notNull().default(5),
    windowMinutes: integer("window_minutes").notNull().default(15),
    cooldownMinutes: integer("cooldown_minutes").notNull().default(60),
    recipients: text("recipients").array().notNull(),
    recipientsByUnion: jsonb("recipients_by_union").$type<
      Record<string, string[]>
    >(),
    emailFormat: text("email_format")
      .notNull()
      .default("multipart")
      .$type<"multipart" | "plain">(),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedBy: text("updated_by").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("observability_alert_rules_enabled_idx").on(t.enabled)],
);

export const observabilityAlertFirings = pgTable(
  "observability_alert_firings",
  {
    id: text("id").primaryKey(),
    ruleId: text("rule_id")
      .notNull()
      .references(() => observabilityAlertRules.id, { onDelete: "cascade" }),
    fingerprint: text("fingerprint"),
    unionId: text("union_id"),
    firedAt: timestamp("fired_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    eventCount: integer("event_count").notNull(),
    messageId: text("message_id"),
  },
  (t) => [
    index("observability_alert_firings_rule_idx").on(t.ruleId, t.firedAt),
    index("observability_alert_firings_fp_idx").on(t.fingerprint, t.firedAt),
  ],
);
