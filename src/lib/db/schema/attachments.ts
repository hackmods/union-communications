import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { AttachmentScanStatus } from "@/types/attachments";
import { bargainingUnits, locals, unions } from "./tenant";

/** Metadata for grievance / bumping / vault file uploads (bytes live in object storage). */
export const attachmentMeta = pgTable(
  "attachment_meta",
  {
    id: text("id").primaryKey(),
    unionId: text("union_id")
      .notNull()
      .references(() => unions.id, { onDelete: "restrict" }),
    localId: text("local_id")
      .notNull()
      .references(() => locals.id, { onDelete: "restrict" }),
    bargainingUnitId: text("bargaining_unit_id").references(
      () => bargainingUnits.id,
      { onDelete: "set null" },
    ),
    grievanceId: text("grievance_id"),
    bumpingCaseId: text("bumping_case_id"),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    storageKey: text("storage_key").notNull(),
    scanStatus: text("scan_status").notNull().$type<AttachmentScanStatus>(),
    uploadedById: text("uploaded_by_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("attachment_meta_union_local_idx").on(t.unionId, t.localId),
    index("attachment_meta_grievance_idx").on(t.grievanceId),
    index("attachment_meta_bumping_idx").on(t.bumpingCaseId),
  ],
);

/** Local Documents vault — CBAs, minutes, evidence not tied to a grievance. */
export const documents = pgTable(
  "documents",
  {
    id: text("id").primaryKey(),
    unionId: text("union_id")
      .notNull()
      .references(() => unions.id, { onDelete: "restrict" }),
    localId: text("local_id")
      .notNull()
      .references(() => locals.id, { onDelete: "restrict" }),
    bargainingUnitId: text("bargaining_unit_id").references(
      () => bargainingUnits.id,
      { onDelete: "set null" },
    ),
    title: text("title").notNull(),
    category: text("category"),
    description: text("description"),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    storageKey: text("storage_key").notNull(),
    scanStatus: text("scan_status").notNull().$type<AttachmentScanStatus>(),
    uploadedById: text("uploaded_by_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("documents_union_local_idx").on(t.unionId, t.localId)],
);
