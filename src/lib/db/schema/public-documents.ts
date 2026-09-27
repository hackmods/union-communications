import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export type PublicDocumentPayload = {
  kind: "policy" | "file" | "external";
  title: { en: string; fr: string };
  summary: { en: string; fr: string };
  purpose: { en: string; fr: string };
  audience: { en: string; fr: string };
  format: string;
  language: "en" | "fr" | "en-fr";
  owner: string;
  source: string;
  hosting: "UnionOps" | "External source";
  externalUrl?: string;
  content?: { en: string; fr: string };
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  storageKey?: string;
  sha256?: string;
  scanStatus?: string;
  redistributionPermission?: string;
  relatedGuide?: string;
  unionBrand?: string;
  linkedSurfaces?: string[];
  effectiveAt?: string;
  requiresAcceptance?: boolean;
  acceptanceScope?: "individual" | "organization";
  humanApproved?: boolean;
  required?: boolean;
};

/** Public catalog head. Each content/file replacement appends an immutable version. */
export const publicDocuments = pgTable("public_documents", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull(),
  status: text("status").notNull().$type<"draft" | "scheduled" | "published" | "archived">(),
  currentVersion: integer("current_version").notNull(),
  publishedVersion: integer("published_version"),
  scheduledVersion: integer("scheduled_version"),
  brandPresetId: text("brand_preset_id"),
  hostWidePolicy: boolean("host_wide_policy").notNull().default(false),
  publishAt: timestamp("publish_at", { withTimezone: true }),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdById: text("created_by_id").notNull(),
  updatedById: text("updated_by_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("public_documents_slug_uidx").on(t.slug), index("public_documents_status_publish_idx").on(t.status, t.publishAt)]);

export const publicDocumentVersions = pgTable("public_document_versions", {
  id: text("id").primaryKey(),
  documentId: text("document_id").notNull().references(() => publicDocuments.id, { onDelete: "restrict" }),
  version: integer("version").notNull(),
  payload: jsonb("payload").notNull().$type<PublicDocumentPayload>(),
  createdById: text("created_by_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("public_document_versions_doc_version_uidx").on(t.documentId, t.version), index("public_document_versions_doc_idx").on(t.documentId, t.createdAt)]);

/** Acceptance is bound to one immutable version and one identity/union/local subject. */
export const publicDocumentAcceptances = pgTable("public_document_acceptances", {
  id: text("id").primaryKey(),
  documentVersionId: text("document_version_id").notNull().references(() => publicDocumentVersions.id, { onDelete: "restrict" }),
  resourceSlug: text("resource_slug").notNull(),
  subjectType: text("subject_type").notNull().$type<"individual" | "union" | "local">(),
  subjectId: text("subject_id").notNull(),
  acceptedById: text("accepted_by_id").notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }).notNull().defaultNow(),
  requestId: text("request_id"),
  acceptanceSource: text("acceptance_source").notNull().default("legacy"),
  authorityAttested: boolean("authority_attested").notNull().default(false),
  authorityAttestationVersion: text("authority_attestation_version"),
  authorityAttestedAt: timestamp("authority_attested_at", { withTimezone: true }),
}, (t) => [uniqueIndex("public_document_acceptances_subject_uidx").on(t.documentVersionId, t.subjectType, t.subjectId), index("public_document_acceptances_subject_idx").on(t.subjectType, t.subjectId, t.acceptedAt)]);
