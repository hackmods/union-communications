import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type { AttachmentScanStatus } from "@/types/attachments";
import type { TimePunchPhotoKind } from "@/types/time";
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
    expenseClaimId: text("expense_claim_id"),
    expenseSubmissionId: text("expense_submission_id"),
    timeEntryId: text("time_entry_id"),
    punchKind: text("punch_kind").$type<TimePunchPhotoKind>(),
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
    index("attachment_meta_expense_claim_idx").on(t.expenseClaimId),
    index("attachment_meta_expense_submission_idx").on(t.expenseSubmissionId),
    index("attachment_meta_time_entry_idx").on(t.timeEntryId),
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
    visibility: text("visibility").notNull().$type<"local_shared" | "restricted">().default("local_shared"),
    currentVersion: integer("current_version").notNull().default(1),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    archivedById: text("archived_by_id"),
    legalHold: boolean("legal_hold").notNull().default(false),
    retentionUntil: timestamp("retention_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("documents_union_local_idx").on(t.unionId, t.localId), index("documents_archive_idx").on(t.unionId, t.localId, t.archivedAt)],
);

/** Immutable bytes and provenance for each private vault revision. */
export const documentVersions = pgTable(
  "document_versions",
  {
    id: text("id").primaryKey(),
    documentId: text("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
    unionId: text("union_id").notNull().references(() => unions.id, { onDelete: "restrict" }),
    localId: text("local_id").notNull().references(() => locals.id, { onDelete: "restrict" }),
    version: integer("version").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    storageKey: text("storage_key").notNull(),
    /** Null only for legacy v1 rows pending object-store integrity backfill. */
    sha256: text("sha256"),
    scanStatus: text("scan_status").notNull().$type<AttachmentScanStatus>(),
    uploadedById: text("uploaded_by_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("document_versions_document_version_uidx").on(t.documentId, t.version), index("document_versions_scope_idx").on(t.unionId, t.localId, t.documentId)],
);

/** Explicit current local-user grants for restricted vault records. */
export const documentAccessGrants = pgTable(
  "document_access_grants",
  {
    id: text("id").primaryKey(),
    documentId: text("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
    unionId: text("union_id").notNull().references(() => unions.id, { onDelete: "restrict" }),
    localId: text("local_id").notNull().references(() => locals.id, { onDelete: "restrict" }),
    userId: text("user_id").notNull(),
    grantedById: text("granted_by_id").notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("document_access_grants_active_uidx").on(t.documentId, t.userId), index("document_access_grants_user_scope_idx").on(t.unionId, t.localId, t.userId, t.revokedAt)],
);
