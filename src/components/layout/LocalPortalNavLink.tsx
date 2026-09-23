"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { canAccessPortal } from "@/lib/portal/access";
import { getTenantContext } from "@/lib/tenant/loader";
import type { UserRole } from "@/types/tenant";
import { cn } from "@/lib/utils";

export function LocalPortalNavLink({
  layout = "desktop",
  onNavigate,
}: {
  layout?: "desktop" | "mobile";
  onNavigate?: () => void;
}) {
  const { data: session, status } = useSession();
  const t = useTranslations("hub");
  const pathname = usePathname();

  if (status !== "authenticated" || !session?.user) return null;

  const roles = (session.user.roles ?? []) as UserRole[];
  const tenant = session.user.unionId
    ? getTenantContext(session.user.unionId)
    : null;
  const portalEnabled = Boolean(tenant?.union.enabledModules.includes("portal"));
  if (!portalEnabled || !canAccessPortal(roles)) return null;

  const active = pathname.startsWith("/portal");
  const className =
    layout === "desktop"
      ? "inline-flex min-h-10 items-center rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-opseu-blue/5 hover:text-opseu-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40"
      : "flex min-h-12 items-center rounded-lg px-3 py-2 font-medium text-slate-700 hover:bg-opseu-blue/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/50";

  return (
    <Link
      href="/portal"
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(className, active && "bg-opseu-blue/10 font-semibold text-opseu-dark")}
      data-testid="local-portal-nav-link"
    >
      {t("portalLink")}
    </Link>
  );
}
