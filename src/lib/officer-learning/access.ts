import type { UserRole } from "@/types/tenant";

const REPORT_ROLES: UserRole[] = [
  "local_president",
  "local_exec",
  "union_admin",
  "division_admin",
  "platform_admin",
];

/** Phase C — who may enable reporting and view opt-in completions. */
export function canManageOfficerLearningReport(roles: UserRole[]): boolean {
  return roles.some((role) => REPORT_ROLES.includes(role));
}

export function canSyncOfficerLearning(roles: UserRole[]): boolean {
  return roles.length > 0;
}
