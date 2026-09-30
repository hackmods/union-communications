import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Host operator error/event store (Sentry-free). Not tenant casework —
 * API reads are MFA-gated site-admin only; INSERT is open to the app role
 * so reportServerError / client ingest / cron can append without platform GUC.
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
    meta: jsonb("meta").$type<Record<string, string | number | boolean | null>>(),
  },
  (t) => [
    index("observability_events_ts_idx").on(t.ts),
    index("observability_events_fp_ts_idx").on(t.fingerprint, t.ts),
    index("observability_events_level_ts_idx").on(t.level, t.ts),
    index("observability_events_source_ts_idx").on(t.source, t.ts),
  ],
);
