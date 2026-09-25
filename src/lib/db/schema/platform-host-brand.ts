/**
 * Durable instance host-brand overrides (platform admin).
 * Precedence vs file/env is resolved in `host-brand-store.ts`.
 */
import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { HostBrandDefaults } from "@/lib/constants/host-brand";

export const platformHostBrand = pgTable("platform_host_brand", {
  id: text("id").primaryKey(),
  payload: jsonb("payload").notNull().$type<Partial<HostBrandDefaults>>(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
