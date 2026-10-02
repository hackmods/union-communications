"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  isPlatformOperator,
  PLATFORM_OPERATOR_NAV,
  platformOperatorLinkActive,
} from "@/lib/platform/operator-nav";
import type { UserRole } from "@/types/tenant";
import { cn } from "@/lib/utils";

type PlatformOperatorAccountLinksProps = {
  layout: "inline" | "stack";
  onNavigate?: () => void;
  linkClassName?: string;
};

/** Stacked under Profile in account chrome (public header + Hub drawer). */
export function PlatformOperatorAccountLinks({
  layout,
  onNavigate,
  linkClassName,
}: PlatformOperatorAccountLinksProps) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const t = useTranslations("hub.platformOperator");

  const authenticated = status === "authenticated" && Boolean(session?.user);
  const roles = (session?.user?.roles ?? []) as UserRole[];
  if (!authenticated || !isPlatformOperator(roles)) return null;

  const item = PLATFORM_OPERATOR_NAV[0];
  if (!item) return null;

  const active = platformOperatorLinkActive(pathname, item.href);
  const itemClass = cn(
    layout === "inline"
      ? "block rounded-md px-2 py-1 text-sm text-opseu-dark transition-colors hover:bg-opseu-blue/5"
      : "flex min-h-11 items-center rounded-md px-3 py-2 text-sm text-opseu-dark hover:bg-opseu-blue/5",
    linkClassName,
    active && "bg-opseu-blue/10 font-semibold",
  );

  return (
    <div
      className={cn(
        layout === "inline"
          ? "border-l border-gray-200 pl-2"
          : "mt-1 border-l-2 border-opseu-blue/20 pl-3",
      )}
    >
      <Link href={item.href} onClick={onNavigate} className={itemClass}>
        {t("menu")}
      </Link>
    </div>
  );
}
