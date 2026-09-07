import type { UserRole } from "@/types/tenant";

/** Platform operator destinations — `platform_admin` only. */
export type PlatformOperatorNavKey =
  | "invites"
  | "onboarding"
  | "feedback"
  | "audit";

export type PlatformOperatorNavItem = {
  href: string;
  labelKey: PlatformOperatorNavKey;
};

export const PLATFORM_OPERATOR_NAV: readonly PlatformOperatorNavItem[] = [
  { href: "/app/invites", labelKey: "invites" },
  { href: "/app/onboarding", labelKey: "onboarding" },
  { href: "/app/feedback", labelKey: "feedback" },
  { href: "/app/audit", labelKey: "audit" },
];

export function isPlatformOperator(
  roles: readonly string[] | UserRole[],
): boolean {
  return roles.includes("platform_admin");
}

export function platformOperatorNavActive(pathname: string): boolean {
  return PLATFORM_OPERATOR_NAV.some(
    (item) =>
      pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
}

export function platformOperatorLinkActive(
  pathname: string,
  href: string,
): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
