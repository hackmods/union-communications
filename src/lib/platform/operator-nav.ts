import type { UserRole } from "@/types/tenant";

/** Platform operator destinations — `platform_admin` only. */
export type PlatformOperatorNavKey =
  | "siteAdmin"
  | "invites"
  | "onboarding"
  | "feedback"
  | "audit";

export type PlatformOperatorNavItem = {
  href: string;
  labelKey: PlatformOperatorNavKey;
};

/** Header / Hub chrome — one entry to the operator landing page. */
export const PLATFORM_OPERATOR_NAV: readonly PlatformOperatorNavItem[] = [
  { href: "/app/site-admin", labelKey: "siteAdmin" },
];

/** Dashboard card shortcuts — not duplicated in Officer tools for platform_admin. */
export const PLATFORM_OPERATOR_DASHBOARD_SHORTCUTS: readonly PlatformOperatorNavItem[] =
  [
    { href: "/app/invites", labelKey: "invites" },
    { href: "/app/onboarding", labelKey: "onboarding" },
    { href: "/app/feedback", labelKey: "feedback" },
    { href: "/app/audit", labelKey: "audit" },
  ];

const OPERATOR_ROUTE_PREFIXES = [
  "/app/site-admin",
  ...PLATFORM_OPERATOR_DASHBOARD_SHORTCUTS.map((item) => item.href),
];

export function isPlatformOperator(
  roles: readonly string[] | UserRole[],
): boolean {
  return roles.includes("platform_admin");
}

export function platformOperatorNavActive(pathname: string): boolean {
  return OPERATOR_ROUTE_PREFIXES.some(
    (href) => pathname === href || pathname.startsWith(`${href}/`),
  );
}

export function platformOperatorLinkActive(
  pathname: string,
  href: string,
): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
