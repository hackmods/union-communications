import {
  boolean,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import type { BrandKit, BrandKitPatch } from "@/types/entities";

export const localBrandKits = pgTable(
  "local_brand_kits",
  {
    unionId: text("union_id").notNull(),
    localId: text("local_id").notNull(),
    brandKit: jsonb("brand_kit").$type<BrandKit>().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedBy: text("updated_by").notNull(),
  },
  (t) => [primaryKey({ columns: [t.unionId, t.localId] })],
);

export const userBrandOverlays = pgTable(
  "user_brand_overlays",
  {
    unionId: text("union_id").notNull(),
    userId: text("user_id").notNull(),
    overlay: jsonb("overlay").$type<BrandKitPatch>().notNull().default({}),
    onboardingComplete: boolean("onboarding_complete").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.unionId, t.userId] })],
);

export const commsPresetCatalog = pgTable("comms_preset_catalog", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  nameFr: text("name_fr"),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedBy: text("updated_by").notNull(),
});
