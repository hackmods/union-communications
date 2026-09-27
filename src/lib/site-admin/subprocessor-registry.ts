import type { subprocessorRegistry } from "@/lib/db/schema";

export type SubprocessorRecord = typeof subprocessorRegistry.$inferSelect;

/** A published row is a deliberate allow-list projection, never a spread of internal data. */
export function toSubprocessorPublicProjection(
  record: SubprocessorRecord,
  publishedAt = new Date(),
) {
  return {
    id: record.id,
    serviceName: record.serviceName,
    purpose: record.purpose,
    dataCategories: record.dataCategories,
    dataSubjects: record.dataSubjects,
    processingRegion: record.processingRegion,
    transferStatus: record.transferStatus,
    effectiveFrom: record.effectiveFrom,
    effectiveTo: record.effectiveTo,
    publicNotes: record.publicNotes,
    publishedAt,
  };
}

export function isSubprocessorPublishable(
  record: Pick<
    SubprocessorRecord,
    | "reviewStatus"
    | "publicDisclosureApproved"
    | "reviewedBy"
    | "createdBy"
    | "updatedBy"
    | "effectiveFrom"
    | "effectiveTo"
  >,
  now = new Date(),
): boolean {
  return (
    record.reviewStatus === "approved" &&
    record.publicDisclosureApproved &&
    Boolean(record.reviewedBy) &&
    record.reviewedBy !== record.createdBy &&
    record.reviewedBy !== record.updatedBy &&
    record.effectiveFrom <= now &&
    (record.effectiveTo === null || record.effectiveTo > now)
  );
}

/** Store date-only inclusive end dates as an exclusive UTC boundary in timestamptz. */
export function toExclusiveEndBoundary(dateOnly: string): string {
  const boundary = new Date(`${dateOnly}T00:00:00.000Z`);
  boundary.setUTCDate(boundary.getUTCDate() + 1);
  return boundary.toISOString();
}

/** Convert the stored exclusive boundary back to the date shown to operators and readers. */
export function fromExclusiveEndBoundary(value: Date | string | null): string {
  if (!value) return "";
  const boundary = value instanceof Date ? new Date(value) : new Date(value);
  boundary.setUTCDate(boundary.getUTCDate() - 1);
  return boundary.toISOString().slice(0, 10);
}
