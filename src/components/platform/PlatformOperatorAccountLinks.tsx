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

  const itemClass = cn(
    layout === "inline"
      ? "block rounded-md px-2 py-1 text-sm text-opseu-dark transition-colors hover:bg-opseu-blue/5"
      : "flex min-h-11 items-center rounded-md px-3 py-2 text-sm text-opseu-dark hover:bg-opseu-blue/5",
    linkClassName,
  );

  return (
    <div
      className={cn(
        layout === "inline"
          ? "flex flex-col gap-0.5 border-l border-gray-200 pl-2"
          : "mt-1 space-y-0.5 border-l-2 border-opseu-blue/20 pl-3",
      )}
      aria-label={t("menu")}
    >
      <p
        className={cn(
          "font-medium text-gray-500",
          layout === "inline" ? "px-2 text-xs" : "px-3 text-xs uppercase tracking-wide",
        )}
      >
        {t("menu")}
      </p>
      {PLATFORM_OPERATOR_NAV.map((item) => {
        const active = platformOperatorLinkActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              itemClass,
              active && "bg-opseu-blue/10 font-semibold",
            )}
          >
            {t(item.labelKey)}
          </Link>
        );
      })}
    </div>
  );
}
