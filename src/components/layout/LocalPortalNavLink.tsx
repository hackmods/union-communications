"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useSessionChrome } from "@/components/auth/useSessionChrome";
import { canAccessPortal } from "@/lib/portal/access";
import type { UserRole } from "@/types/tenant";
import { cn } from "@/lib/utils";

export function LocalPortalNavLink({
  layout = "desktop",
  onNavigate,
}: {
  layout?: "desktop" | "mobile";
  onNavigate?: () => void;
}) {
  const { session, authenticated, coldLoading } = useSessionChrome();
  const t = useTranslations("hub");
  const pathname = usePathname();

  const className =
    layout === "desktop"
      ? "inline-flex min-h-10 items-center rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-opseu-blue/5 hover:text-opseu-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40"
      : "flex min-h-12 items-center rounded-lg px-3 py-2 font-medium text-slate-700 hover:bg-opseu-blue/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/50";

  // Reserve space only on cold start (no user yet). JWT refresh keeps
  // session.user — do not flash an empty pulse over a known session.
  if (coldLoading) {
    return (
      <span
        aria-hidden
        className={cn(
          className,
          "pointer-events-none animate-pulse bg-slate-100 text-transparent",
        )}
        data-testid="local-portal-nav-loading"
      >
        {t("portalLink")}
      </span>
    );
  }

  if (!authenticated || !session?.user) return null;

  const roles = (session.user.roles ?? []) as UserRole[];
  // Show by default for portal-eligible roles (including platform_admin).
  // Tenant module gates still apply on /portal itself.
  if (!canAccessPortal(roles)) return null;

  const active = pathname.startsWith("/portal");

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
