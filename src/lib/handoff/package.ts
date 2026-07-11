import type { HandoffPackage, HandoffRequest } from "@/types/qol";
import type { Grievance } from "@/types/grievance";

export const HANDOFF_CHECKLIST = [
  "Confirm MFA access for the incoming steward",
  "Review open and overdue grievances together",
  "Transfer member contact notes (communication log)",
  "Share CA clause snippets relevant to open cases",
  "Export a hybrid encrypted backup before handoff",
  "Introduce the incoming steward to key contacts",
] as const;

export function buildHandoffPackage(input: {
  unionId: string;
  localId: string;
  fromOfficerId: string;
  request: HandoffRequest;
  grievances: Grievance[];
}): HandoffPackage {
  return {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    unionId: input.unionId,
    localId: input.localId,
    fromOfficerId: input.fromOfficerId,
    toStewardId: input.request.toStewardId,
    toStewardName: input.request.toStewardName,
    notes: input.request.notes,
    grievanceIds: input.grievances.map((g) => g.id),
    checklist: [...HANDOFF_CHECKLIST],
  };
}

export function canInitiateHandoff(roles: string[]): boolean {
  return roles.some((r) =>
    [
      "local_president",
      "union_admin",
      "division_admin",
      "platform_admin",
    ].includes(r),
  );
}
