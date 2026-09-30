import type { UserRole } from "@/types/tenant";
import { isMfaOperatorBypassEmail } from "@/lib/auth/mfa-operator-bypass";

export function hostedCustomerProfileEnabled(
  env: Record<string, string | undefined>,
): boolean {
  const raw = env.UNIONOPS_HOSTED_CUSTOMER_MODE?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

/**
 * Current hosted capability mapping. Every account role except local_member
 * can reach at least one Hub module marked requiresMfa or administer tenant,
 * officer, or confidential casework capabilities. Unknown/missing roles fail
 * closed so a new role cannot silently bypass hosted MFA.
 */
const HOSTED_MFA_ROLES = new Set<UserRole>([
  "platform_admin",
  "union_admin",
  "division_admin",
  "local_president",
  "local_steward",
  "local_exec",
  "stability_member",
  "solo_account",
]);

export function rolesRequireHostedMfa(
  roles: readonly string[] | null | undefined,
): boolean {
  if (!roles?.length) return true;
  return roles.some((role) =>
    role === "local_member"
      ? false
      : HOSTED_MFA_ROLES.has(role as UserRole) || !isKnownRole(role),
  );
}

export function isKnownRole(role: string): role is UserRole {
  return [
    "platform_admin",
    "union_admin",
    "division_admin",
    "local_president",
    "local_steward",
    "local_exec",
    "stability_member",
    "local_member",
    "solo_account",
  ].includes(role);
}

export function sessionRequiresMfa(
  user: {
    email?: string | null;
    roles?: readonly string[] | null;
    mfaRequired?: boolean | null;
  } | null | undefined,
  mfaEnabled: boolean,
  hostedCustomerMode: boolean,
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (!mfaEnabled) return false;
  if (isMfaOperatorBypassEmail(user?.email, env)) return false;
  if (hostedCustomerMode) {
    return rolesRequireHostedMfa(user?.roles) || user?.mfaRequired === true;
  }
  if (typeof user?.mfaRequired === "boolean") return user.mfaRequired;
  return true;
}

export function accountRequiresMfa(input: {
  email?: string | null;
  roles: readonly string[];
  explicitMfaEnabled: boolean;
  legacyRequiresMfa: boolean;
  hostedCustomerMode: boolean;
  env?: Record<string, string | undefined>;
}): boolean {
  if (isMfaOperatorBypassEmail(input.email, input.env ?? process.env)) {
    return false;
  }
  if (!input.hostedCustomerMode) return input.legacyRequiresMfa;
  return rolesRequireHostedMfa(input.roles) || input.explicitMfaEnabled;
}
