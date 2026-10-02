/**
 * Singleton state for ops lifecycle emails (deploy / restart).
 * Not tenant casework — accessed via retentionJob RLS context when Postgres is on.
 */
import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const opsBootNotifyState = pgTable("ops_boot_notify_state", {
  id: boolean("id").primaryKey().default(true),
  lastDeployCommit: text("last_deploy_commit"),
  lastDeployNotifiedAt: timestamp("last_deploy_notified_at", {
    withTimezone: true,
  }),
  lastRestartNotifiedAt: timestamp("last_restart_notified_at", {
    withTimezone: true,
  }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
