"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getVisibleModules } from "@/lib/modules/registry";
import { getTenantContext } from "@/lib/tenant/loader";
import { canInitiateHandoff } from "@/lib/handoff/package";
import { canAccessGrievanceModule } from "@/lib/grievance/access";
import type { HubModule, UserRole } from "@/types/tenant";
import { cn } from "@/lib/utils";
import { Emoji } from "@/components/ui/Emoji";

export function HubNav() {
  const { data: session, status } = useSession();
  const t = useTranslations("hub");

  // Login sits under /app; hide hub chrome until the session is ready.
  if (status !== "authenticated" || !session?.user) return null;

  const tenant = session.user.unionId
    ? getTenantContext(session.user.unionId)
    : null;
  const enabledModules: HubModule[] =
    tenant?.union.enabledModules ?? ["comms"];
  const roles = (session.user.roles ?? []) as UserRole[];
  const modules = getVisibleModules(enabledModules, roles);
  const mfaOk = !!session.user.mfaVerified;
  const hasGrievance = canAccessGrievanceModule(roles);
  const showHandoff = canInitiateHandoff(roles);

  const toolLinks = [
    hasGrievance && {
      href: "/app/overdue",
      label: t("overdueLink"),
    },
    hasGrievance && {
      href: "/app/snippets",
      label: t("snippetsLink"),
    },
    hasGrievance && {
      href: "/app/marketplace",
      label: t("marketplaceLink"),
    },
    showHandoff && {
      href: "/app/handoff",
      label: t("handoffLink"),
    },
    hasGrievance && {
      href: "/app/hybrid",
      label: t("hybridLink"),
    },
  ].filter(Boolean) as { href: string; label: string }[];

  return (
    <nav
      className="border-b border-gray-200 bg-gray-50"
      aria-label={t("navLabel")}
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-2 text-sm">
        <Link
          href="/app"
          className="font-semibold text-opseu-dark hover:underline"
        >
          {t("title")}
        </Link>
        <span className="text-gray-400">|</span>
        {tenant && (
          <span className="text-gray-600">
            {tenant.union.name}
            {tenant.local && ` · Local ${tenant.local.localNumber}`}
          </span>
        )}
        <span className="flex-1" />
        {modules.map((mod) => (
          <Link
            key={mod.id}
            href={mod.href.startsWith("/app") ? mod.href : "/"}
            className={cn(
              "rounded-md px-2 py-1 hover:bg-white",
              mod.requiresMfa && !mfaOk && "opacity-60",
            )}
          >
            <Emoji id={mod.emojiId} /> {t(`modules.${mod.nameKey}`)}
          </Link>
        ))}
        {toolLinks.length > 0 && (
          <details className="relative">
            <summary
              className={cn(
                "cursor-pointer list-none rounded-md px-2 py-1 hover:bg-white [&::-webkit-details-marker]:hidden",
                !mfaOk && "opacity-60",
              )}
            >
              {t("toolsMenu")} ▾
            </summary>
            <div
              className="absolute right-0 z-20 mt-1 min-w-[12rem] rounded-lg border border-gray-200 bg-white py-1 shadow-md"
              role="menu"
              aria-label={t("toolsMenu")}
            >
              {toolLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  role="menuitem"
                  className="block px-3 py-2 text-sm hover:bg-gray-50"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </details>
        )}
        <Link
          href="/app/mfa"
          className="rounded-md px-2 py-1 text-opseu-blue hover:bg-white"
        >
          {mfaOk ? t("mfaOk") : t("mfaRequired")}
        </Link>
      </div>
    </nav>
  );
}
