import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { locals, unions } from "./tenant";

export type WorkbenchFieldType = "text" | "number" | "date" | "boolean";
export type WorkbenchField = {
  id: string;
  label: string;
  type: WorkbenchFieldType;
  access: "restricted" | "officer";
};
export type WorkbenchMapping = Record<string, string | null>;

export const dataDatasets = pgTable(
  "data_datasets",
  {
    id: text("id").primaryKey(),
    unionId: text("union_id").notNull().references(() => unions.id, { onDelete: "restrict" }),
    localId: text("local_id").notNull().references(() => locals.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    kind: text("kind").notNull().$type<"table" | "member_employment">(),
    fields: jsonb("fields").notNull().$type<WorkbenchField[]>(),
    mapping: jsonb("mapping").notNull().$type<WorkbenchMapping>().default({}),
    mappingVersion: integer("mapping_version").notNull().default(1),
    activeRevision: integer("active_revision").notNull().default(0),
    trustedSource: boolean("trusted_source").notNull().default(false),
    createdById: text("created_by_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("data_datasets_union_local_idx").on(t.unionId, t.localId)],
);

export const dataImportRuns = pgTable(
  "data_import_runs",
  {
    id: text("id").primaryKey(),
    unionId: text("union_id").notNull().references(() => unions.id, { onDelete: "restrict" }),
    localId: text("local_id").notNull().references(() => locals.id, { onDelete: "restrict" }),
    datasetId: text("dataset_id").notNull().references(() => dataDatasets.id, { onDelete: "restrict" }),
    fileName: text("file_name").notNull(),
    contentHash: text("content_hash").notNull(),
    storageKey: text("storage_key").notNull(),
    scanStatus: text("scan_status").notNull(),
    sheetName: text("sheet_name").notNull().default(""),
    mapping: jsonb("mapping").notNull().$type<WorkbenchMapping>(),
    mappingVersion: integer("mapping_version").notNull(),
    status: text("status").notNull().$type<"review" | "partially_published" | "published" | "failed">(),
    rowCount: integer("row_count").notNull(),
    acceptedCount: integer("accepted_count").notNull().default(0),
    heldCount: integer("held_count").notNull().default(0),
    createdById: text("created_by_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (t) => [
    index("data_import_runs_dataset_idx").on(t.datasetId, t.createdAt),
    index("data_import_runs_union_local_idx").on(t.unionId, t.localId),
    uniqueIndex("data_import_replay_idx").on(t.datasetId, t.contentHash, t.mappingVersion),
  ],
);

export const dataStagedRows = pgTable(
  "data_staged_rows",
  {
    id: text("id").primaryKey(),
    unionId: text("union_id").notNull().references(() => unions.id, { onDelete: "restrict" }),
    localId: text("local_id").notNull().references(() => locals.id, { onDelete: "restrict" }),
    runId: text("run_id").notNull().references(() => dataImportRuns.id, { onDelete: "cascade" }),
    rowIndex: integer("row_index").notNull(),
    rawValues: jsonb("raw_values").notNull().$type<Record<string, string>>(),
    mappedValues: jsonb("mapped_values").notNull().$type<Record<string, unknown>>(),
    errors: jsonb("errors").notNull().$type<string[]>().default([]),
    matchPersonId: text("match_person_id"),
    matchReason: text("match_reason"),
    decision: text("decision").notNull().default("pending").$type<"pending" | "accept" | "exclude" | "published">(),
  },
  (t) => [uniqueIndex("data_staged_run_row_idx").on(t.runId, t.rowIndex), index("data_staged_union_local_idx").on(t.unionId, t.localId)],
);

export const dataPublications = pgTable(
  "data_publications",
  {
    id: text("id").primaryKey(),
    unionId: text("union_id").notNull().references(() => unions.id, { onDelete: "restrict" }),
    localId: text("local_id").notNull().references(() => locals.id, { onDelete: "restrict" }),
    datasetId: text("dataset_id").notNull().references(() => dataDatasets.id, { onDelete: "restrict" }),
    runId: text("run_id").notNull().references(() => dataImportRuns.id, { onDelete: "restrict" }),
    revision: integer("revision").notNull(),
    acceptedCount: integer("accepted_count").notNull(),
    publishedById: text("published_by_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("data_publications_dataset_revision_idx").on(t.datasetId, t.revision), index("data_publications_union_local_idx").on(t.unionId, t.localId)],
);

export const dataRecords = pgTable(
  "data_records",
  {
    id: text("id").primaryKey(),
    unionId: text("union_id").notNull().references(() => unions.id, { onDelete: "restrict" }),
    localId: text("local_id").notNull().references(() => locals.id, { onDelete: "restrict" }),
    datasetId: text("dataset_id").notNull().references(() => dataDatasets.id, { onDelete: "restrict" }),
    publicationId: text("publication_id").notNull().references(() => dataPublications.id, { onDelete: "restrict" }),
    rowIndex: integer("row_index").notNull(),
    values: jsonb("values").notNull().$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("data_records_dataset_publication_idx").on(t.datasetId, t.publicationId), index("data_records_union_local_idx").on(t.unionId, t.localId)],
);

export const dataPeople = pgTable(
  "data_people",
  {
    id: text("id").primaryKey(),
    unionId: text("union_id").notNull().references(() => unions.id, { onDelete: "restrict" }),
    localId: text("local_id").notNull().references(() => locals.id, { onDelete: "restrict" }),
    displayName: text("display_name").notNull(),
    createdById: text("created_by_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("data_people_union_local_name_idx").on(t.unionId, t.localId, t.displayName)],
);

export const dataIdentifiers = pgTable(
  "data_identifiers",
  {
    id: text("id").primaryKey(),
    unionId: text("union_id").notNull().references(() => unions.id, { onDelete: "restrict" }),
    localId: text("local_id").notNull().references(() => locals.id, { onDelete: "restrict" }),
    personId: text("person_id").notNull().references(() => dataPeople.id, { onDelete: "cascade" }),
    namespace: text("namespace").notNull(),
    value: text("value").notNull(),
    sourceRunId: text("source_run_id").notNull().references(() => dataImportRuns.id, { onDelete: "restrict" }),
  },
  (t) => [uniqueIndex("data_identifiers_union_namespace_value_idx").on(t.unionId, t.namespace, t.value), index("data_identifiers_union_local_idx").on(t.unionId, t.localId)],
);

export const dataAssertions = pgTable(
  "data_assertions",
  {
    id: text("id").primaryKey(),
    unionId: text("union_id").notNull().references(() => unions.id, { onDelete: "restrict" }),
    localId: text("local_id").notNull().references(() => locals.id, { onDelete: "restrict" }),
    personId: text("person_id").notNull().references(() => dataPeople.id, { onDelete: "cascade" }),
    runId: text("run_id").notNull().references(() => dataImportRuns.id, { onDelete: "restrict" }),
    rowIndex: integer("row_index").notNull(),
    fieldKey: text("field_key").notNull(),
    value: jsonb("value").notNull(),
    effectiveFrom: text("effective_from"),
    effectiveTo: text("effective_to"),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull().defaultNow(),
    decision: text("decision").notNull().default("accepted"),
  },
  (t) => [index("data_assertions_person_field_idx").on(t.personId, t.fieldKey, t.effectiveFrom), index("data_assertions_union_local_idx").on(t.unionId, t.localId)],
);

export const dataEmploymentAssignments = pgTable(
  "data_employment_assignments",
  {
    id: text("id").primaryKey(),
    unionId: text("union_id").notNull().references(() => unions.id, { onDelete: "restrict" }),
    localId: text("local_id").notNull().references(() => locals.id, { onDelete: "restrict" }),
    personId: text("person_id").notNull().references(() => dataPeople.id, { onDelete: "cascade" }),
    runId: text("run_id").notNull().references(() => dataImportRuns.id, { onDelete: "restrict" }),
    rowIndex: integer("row_index").notNull(),
    employer: text("employer").notNull().default(""),
    jobTitle: text("job_title").notNull().default(""),
    worksite: text("worksite").notNull().default(""),
    department: text("department").notNull().default(""),
    supervisorName: text("supervisor_name").notNull().default(""),
    positionKey: text("position_key").notNull().default(""),
    supervisorPersonId: text("supervisor_person_id"),
    effectiveFrom: text("effective_from"),
    effectiveTo: text("effective_to"),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("data_employment_person_date_idx").on(t.personId, t.effectiveFrom), index("data_employment_union_local_idx").on(t.unionId, t.localId)],
);

export const dataUnionMemberships = pgTable(
  "data_union_memberships",
  {
    id: text("id").primaryKey(),
    unionId: text("union_id").notNull().references(() => unions.id, { onDelete: "restrict" }),
    localId: text("local_id").notNull().references(() => locals.id, { onDelete: "restrict" }),
    personId: text("person_id").notNull().references(() => dataPeople.id, { onDelete: "cascade" }),
    runId: text("run_id").notNull().references(() => dataImportRuns.id, { onDelete: "restrict" }),
    memberNumber: text("member_number").notNull(),
    effectiveFrom: text("effective_from"),
    effectiveTo: text("effective_to"),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("data_membership_union_number_idx").on(t.unionId, t.memberNumber), index("data_membership_union_local_idx").on(t.unionId, t.localId)],
);
