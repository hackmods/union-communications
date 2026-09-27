import { boolean, index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export type SubprocessorTransferStatus =
  | "within_canada"
  | "cross_border"
  | "not_applicable"
  | "under_review";
export type SubprocessorReviewStatus = "unreviewed" | "approved" | "rejected";
export type SubprocessorDpaStatus =
  | "unreviewed"
  | "under_review"
  | "approved"
  | "not_applicable";
export type SubprocessorLocalizedText = { en: string; fr: string };
export type SubprocessorLocalizedList = { en: string[]; fr: string[] };

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

/** Internal platform-wide record. RLS permits only an MFA-verified platform admin. */
export const subprocessorRegistry = pgTable(
  "subprocessor_registry",
  {
    id: text("id").primaryKey(),
    serviceName: text("service_name").notNull(),
    purpose: jsonb("purpose").notNull().$type<SubprocessorLocalizedText>(),
    dataCategories: jsonb("data_categories").notNull().$type<SubprocessorLocalizedList>(),
    dataSubjects: jsonb("data_subjects").notNull().$type<SubprocessorLocalizedList>(),
    processingRegion: text("processing_region").notNull(),
    transferStatus: text("transfer_status").notNull().$type<SubprocessorTransferStatus>(),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
    effectiveTo: timestamp("effective_to", { withTimezone: true }),
    reviewStatus: text("review_status").notNull().default("unreviewed").$type<SubprocessorReviewStatus>(),
    dpaStatus: text("dpa_status").notNull().default("unreviewed").$type<SubprocessorDpaStatus>(),
    publicDisclosureApproved: boolean("public_disclosure_approved").notNull().default(false),
    publicNotes: jsonb("public_notes").notNull().$type<SubprocessorLocalizedText>(),
    internalNotes: text("internal_notes").notNull().default(""),
    verificationEvidence: text("verification_evidence").notNull().default(""),
    reviewOwner: text("review_owner"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdBy: text("created_by").notNull(),
    createdAt: createdAt(),
    updatedBy: text("updated_by").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("subprocessor_registry_updated_idx").on(table.updatedAt)],
);

/** Minimal projection for public Trust pages; never stores review/DPA notes. */
export const subprocessorPublicProjections = pgTable(
  "subprocessor_public_projections",
  {
    id: text("id").primaryKey().references(() => subprocessorRegistry.id, { onDelete: "cascade" }),
    serviceName: text("service_name").notNull(),
    purpose: jsonb("purpose").notNull().$type<SubprocessorLocalizedText>(),
    dataCategories: jsonb("data_categories").notNull().$type<SubprocessorLocalizedList>(),
    dataSubjects: jsonb("data_subjects").notNull().$type<SubprocessorLocalizedList>(),
    processingRegion: text("processing_region").notNull(),
    transferStatus: text("transfer_status").notNull().$type<SubprocessorTransferStatus>(),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
    effectiveTo: timestamp("effective_to", { withTimezone: true }),
    publicNotes: jsonb("public_notes").notNull().$type<SubprocessorLocalizedText>(),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("subprocessor_public_effective_idx").on(table.effectiveFrom)],
);

/** Append-only security evidence for create, edit, review, publish, and withdraw operations. */
export const subprocessorAuditEvents = pgTable(
  "subprocessor_audit_events",
  {
    id: text("id").primaryKey(),
    actorId: text("actor_id").notNull(),
    providerId: text("provider_id"),
    action: text("action").notNull(),
    beforeRecord: jsonb("before_record").$type<Record<string, unknown> | null>(),
    afterRecord: jsonb("after_record").$type<Record<string, unknown> | null>(),
    createdAt: createdAt(),
  },
  (table) => [
    index("subprocessor_audit_provider_idx").on(table.providerId, table.createdAt),
    index("subprocessor_audit_created_idx").on(table.createdAt),
  ],
);
