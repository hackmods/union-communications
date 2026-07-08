"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getVisibleModules } from "@/lib/modules/registry";
import { getTenantContext } from "@/lib/tenant/loader";
import type { HubModule } from "@/types/tenant";
import type { UserRole } from "@/types/tenant";
import { cn } from "@/lib/utils";

export function HubNav() {
  const { data: session } = useSession();
  const t = useTranslations("hub");

  if (!session?.user) return null;

  const tenant = session.user.unionId
    ? getTenantContext(session.user.unionId)
    : null;
  const enabledModules: HubModule[] =
    tenant?.union.enabledModules ?? ["comms"];
  const roles = (session.user.roles ?? []) as UserRole[];
  const modules = getVisibleModules(enabledModules, roles);

  return (
    <nav
      className="border-b border-gray-200 bg-gray-50"
      aria-label={t("navLabel")}
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-2 text-sm">
        <span className="font-semibold text-opseu-dark">{t("title")}</span>
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
              mod.requiresMfa &&
                !session.user.mfaVerified &&
                "opacity-60",
            )}
          >
            {mod.icon} {t(`modules.${mod.nameKey}`)}
          </Link>
        ))}
        <Link href="/app/mfa" className="rounded-md px-2 py-1 text-opseu-blue hover:bg-white">
          {session.user.mfaVerified ? t("mfaOk") : t("mfaRequired")}
        </Link>
      </div>
    </nav>
  );
}
