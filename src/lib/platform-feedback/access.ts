import type { UserRole } from "@/types/tenant";

/** Steward inbox is operator-only — not a tenant module. */
export function canReadSiteFeedbackInbox(roles: UserRole[]): boolean {
  return roles.includes("platform_admin");
}
