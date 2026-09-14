"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { NavDropdown } from "@/components/layout/nav/NavDropdown";
import {
  isPlatformOperator,
  PLATFORM_OPERATOR_NAV,
  platformOperatorLinkActive,
  platformOperatorNavActive,
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
  const [openMenu, setOpenMenu] = useState<{ path: string } | null>(null);

  const authenticated = status === "authenticated" && Boolean(session?.user);
  const roles = (session?.user?.roles ?? []) as UserRole[];
  if (!authenticated || !isPlatformOperator(roles)) return null;

  const open = openMenu?.path === pathname;
  const active = platformOperatorNavActive(pathname);

  const defaultTrigger =
    variant === "hub"
      ? "font-medium whitespace-nowrap hover:bg-white"
      : "rounded-md px-2 py-1 font-medium transition-colors duration-150 hover:bg-opseu-blue/5";

  return (
    <NavDropdown
      label={t("menu")}
      open={open}
      active={active}
      onToggle={() =>
        setOpenMenu((prev) =>
          prev?.path === pathname ? null : { path: pathname },
        )
      }
      onClose={() => setOpenMenu(null)}
      triggerClassName={cn(defaultTrigger, triggerClassName)}
    >
      {PLATFORM_OPERATOR_NAV.map((item) => {
        const linkActive = platformOperatorLinkActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            role="menuitem"
            tabIndex={-1}
            aria-current={linkActive ? "page" : undefined}
            onClick={() => {
              onNavigate?.();
              window.setTimeout(() => setOpenMenu(null), 0);
            }}
            className={cn(
              "block px-3 py-2 text-sm outline-none hover:bg-gray-50 focus-visible:bg-opseu-blue/10 focus-visible:ring-2 focus-visible:ring-opseu-blue/40",
              linkActive && "bg-opseu-blue/10 font-semibold text-opseu-dark",
            )}
          >
            {t(item.labelKey)}
          </Link>
        );
      })}
    </NavDropdown>
  );
}
