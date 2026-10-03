import type { UserRole } from "@/types/tenant";
import { isMfaOperatorBypassEmail } from "@/lib/auth/mfa-operator-bypass";

export function hostedCustomerProfileEnabled(
  env: Record<string, string | undefined>,
): boolean {
  const raw = env.UNIONOPS_HOSTED_CUSTOMER_MODE?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

/**
 * Current hosted capability mapping. Privileged roles *can* require MFA.
 * Local officers are not forced at first Hub login — a Local opts in, or the
 * person enrolls an authenticator. Host operators stay on MFA immediately.
 * Unknown/missing roles fail closed so a new role cannot silently bypass.
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

const HOST_OPERATOR_MFA_ROLES = new Set<UserRole>([
  "platform_admin",
  "union_admin",
  "division_admin",
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

/** Site / union operators — MFA from the first session, not a Local opt-in. */
export function rolesRequireHostOperatorMfa(
  roles: readonly string[] | null | undefined,
): boolean {
  if (!roles?.length) return true;
  return roles.some(
    (role) =>
      HOST_OPERATOR_MFA_ROLES.has(role as UserRole) || !isKnownRole(role),
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
    if (rolesRequireHostOperatorMfa(user?.roles)) return true;
    return user?.mfaRequired === true;
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
  /** True when this Local has opted into officer MFA (default off). */
  localMfaRequired?: boolean;
  env?: Record<string, string | undefined>;
}): boolean {
  if (isMfaOperatorBypassEmail(input.email, input.env ?? process.env)) {
    return false;
  }
  if (!input.hostedCustomerMode) return input.legacyRequiresMfa;
  if (rolesRequireHostOperatorMfa(input.roles)) return true;
  if (input.localMfaRequired) {
    return rolesRequireHostedMfa(input.roles) || input.explicitMfaEnabled;
  }
  return input.explicitMfaEnabled;
}
