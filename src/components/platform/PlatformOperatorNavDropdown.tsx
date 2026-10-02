"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  isPlatformOperator,
  PLATFORM_OPERATOR_NAV,
  platformOperatorNavActive,
  platformOperatorLinkActive,
} from "@/lib/platform/operator-nav";
import type { UserRole } from "@/types/tenant";
import { cn } from "@/lib/utils";

type PlatformOperatorNavDropdownProps = {
  onNavigate?: () => void;
  /** Hub bar uses gray hover; public header uses blue tint. */
  variant?: "public" | "hub";
  triggerClassName?: string;
};

export function PlatformOperatorNavDropdown({
  onNavigate,
  variant = "public",
  triggerClassName,
}: PlatformOperatorNavDropdownProps) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const t = useTranslations("hub.platformOperator");

  const authenticated = status === "authenticated" && Boolean(session?.user);
  const roles = (session?.user?.roles ?? []) as UserRole[];
  if (!authenticated || !isPlatformOperator(roles)) return null;

  const item = PLATFORM_OPERATOR_NAV[0];
  if (!item) return null;

  const active = platformOperatorNavActive(pathname);
  const linkActive = platformOperatorLinkActive(pathname, item.href);

  const linkClass =
    variant === "hub"
      ? "font-medium whitespace-nowrap rounded-md px-2 py-1 hover:bg-white"
      : "rounded-md px-2 py-1 font-medium transition-colors duration-150 hover:bg-opseu-blue/5";

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={linkActive ? "page" : undefined}
      className={cn(
        linkClass,
        (active || linkActive) && "bg-opseu-blue/10 font-semibold text-opseu-dark",
        triggerClassName,
      )}
    >
      {t("menu")}
    </Link>
  );
}
