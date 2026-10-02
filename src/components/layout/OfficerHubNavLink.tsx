"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useSessionChrome } from "@/components/auth/useSessionChrome";
import { isOfficerHubPublic } from "@/lib/features/officer-hub-public";
import { cn } from "@/lib/utils";

export function OfficerHubNavLink({
  layout = "desktop",
  onNavigate,
}: {
  layout?: "desktop" | "mobile";
  onNavigate?: () => void;
}) {
  const { authenticated } = useSessionChrome();
  const t = useTranslations("hub");
  const pathname = usePathname();
  // Keep Hub for platform operators too — they also get the Platform dropdown.
  // Use session-chrome auth so JWT refresh does not drop the link when Hub
  // is invite-only (public flag off).
  const available = authenticated || isOfficerHubPublic();

  if (!available) return null;

  const active = pathname.startsWith("/app");
  const className = layout === "desktop"
    ? "inline-flex min-h-11 items-center whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-opseu-blue/5 hover:text-opseu-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40"
    : "flex min-h-12 items-center rounded-lg px-3 py-2 font-medium text-slate-700 hover:bg-opseu-blue/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/50";

  return (
    <Link
      href="/app"
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(className, active && "bg-opseu-blue/10 font-semibold text-opseu-dark")}
      data-testid="officer-hub-nav-link"
    >
      {t("hubLink")}
    </Link>
  );
}
