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
  | "supervisorNumber"
  | "membershipStatus"
  | "duesStanding"
  | "duesPeriod"
  | "duesSource"
  | "classification"
  | "hireDate";

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
  { id: "membershipStatus", label: "Membership status" },
  { id: "duesStanding", label: "Dues standing" },
  { id: "duesPeriod", label: "Dues period" },
  { id: "duesSource", label: "Dues source" },
  { id: "classification", label: "Classification" },
  { id: "hireDate", label: "Hire date" },
];

/** Canonical member/employment field ids allowed in mappings (excludes custom dataset fields). */
export const CANONICAL_MEMBER_FIELD_IDS: CanonicalField[] = MEMBER_EMPLOYMENT_FIELDS.map((field) => field.id);

export const MEMBERSHIP_STATUS_VALUES = ["active", "leave", "resigned", "unknown"] as const;
export const DUES_STANDING_VALUES = ["good", "arrears", "unknown", "exempt"] as const;
export const DUES_SOURCE_VALUES = ["employer_report", "card_roster", "officer_note"] as const;

export type MembershipStatusValue = (typeof MEMBERSHIP_STATUS_VALUES)[number];
export type DuesStandingValue = (typeof DUES_STANDING_VALUES)[number];
export type DuesSourceValue = (typeof DUES_SOURCE_VALUES)[number];

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
  publishedAt: string | null;
};

export type PersonListItem = {
  id: string;
  displayName: string;
  memberNumber: string | null;
  profile: Record<string, unknown>;
  duesStanding: string | null;
  membershipStatus: string | null;
  openJobCount: number;
  assignments: Array<{
    id: string;
    jobTitle: string;
    employer: string;
    worksite: string;
    department: string;
    positionKey: string;
    supervisorName: string;
    supervisorPersonId: string | null;
    effectiveFrom: string | null;
    effectiveTo: string | null;
  }>;
};

export type PersonProfile = {
  person: { id: string; displayName: string; createdAt: string };
  asOf: string;
  memberNumber: string | null;
  identifiers: Array<{ namespace: string; value: string }>;
  profile: Record<string, unknown>;
  duesStanding: string | null;
  duesPeriod: string | null;
  duesSource: string | null;
  membershipStatus: string | null;
  memberships: Array<{
    id: string;
    memberNumber: string;
    effectiveFrom: string | null;
    effectiveTo: string | null;
    runId: string;
    observedAt: string;
  }>;
  assignments: Array<{
    id: string;
    jobTitle: string;
    employer: string;
    worksite: string;
    department: string;
    positionKey: string;
    supervisorName: string;
    supervisorPersonId: string | null;
    effectiveFrom: string | null;
    effectiveTo: string | null;
    runId: string;
    rowIndex: number;
    observedAt: string;
  }>;
  assertions: Array<{
    id: string;
    fieldKey: string;
    value: unknown;
    effectiveFrom: string | null;
    effectiveTo: string | null;
    runId: string;
    rowIndex: number;
    observedAt: string;
  }>;
  reporting: {
    chains: Array<{
      positionKey: string;
      jobTitle: string;
      chain: Array<{ id: string; displayName: string }>;
    }>;
    directReports: Array<{ id: string; displayName: string }>;
  };
};
