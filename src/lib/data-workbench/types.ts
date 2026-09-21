import type { WorkbenchField, WorkbenchMapping } from "@/lib/db/schema/data-workbench";

export type DatasetKind = "table" | "member_employment";
export type CanonicalField =
  | "memberNumber"
  | "fullName"
  | "email"
  | "phone"
  | "localNumber"
  | "jobTitle"
  | "employer"
  | "worksite"
  | "department"
  | "supervisorName"
  | "effectiveFrom"
  | "effectiveTo"
  | "positionId"
  | "supervisorNumber";

export const MEMBER_EMPLOYMENT_FIELDS: Array<{
  id: CanonicalField;
  label: string;
  required?: boolean;
}> = [
  { id: "memberNumber", label: "Member number" },
  { id: "fullName", label: "Full name", required: true },
  { id: "email", label: "Email" },
  { id: "phone", label: "Phone" },
  { id: "localNumber", label: "Local number" },
  { id: "jobTitle", label: "Job title" },
  { id: "employer", label: "Employer" },
  { id: "worksite", label: "Worksite" },
  { id: "department", label: "Department" },
  { id: "supervisorName", label: "Supervisor" },
  { id: "effectiveFrom", label: "Effective from" },
  { id: "effectiveTo", label: "Effective to" },
  { id: "positionId", label: "Source position ID" },
  { id: "supervisorNumber", label: "Supervisor member number" },
];

export type ParsedTable = {
  sheetName: string;
  headers: string[];
  rows: Array<Record<string, string>>;
};

export type StagedPreviewRow = {
  rowIndex: number;
  rawValues: Record<string, string>;
  mappedValues: Record<string, unknown>;
  errors: string[];
  matchPersonId: string | null;
  matchReason: string | null;
  decision: "pending" | "accept" | "exclude" | "published";
};

export type DataDataset = {
  id: string;
  unionId: string;
  localId: string;
  name: string;
  description: string;
  kind: DatasetKind;
  fields: WorkbenchField[];
  mapping: WorkbenchMapping;
  mappingVersion: number;
  trustedSource: boolean;
  createdAt: string;
};

export type DataImportRun = {
  id: string;
  datasetId: string;
  fileName: string;
  contentHash: string;
  sheetName: string;
  mapping: WorkbenchMapping;
  mappingVersion: number;
  status: "review" | "partially_published" | "published" | "failed";
  rowCount: number;
  acceptedCount: number;
  heldCount: number;
  createdAt: string;
  publishedAt?: string | null;
};
