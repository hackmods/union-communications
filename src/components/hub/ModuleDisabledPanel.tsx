"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Callout } from "@/components/ui/Callout";
import { canManageLocalModules } from "@/lib/tenant/access";
import type { HubModule, UserRole } from "@/types/tenant";
import { PUBLIC_PAGE_TITLE_CLASS } from "@/lib/constants/public-type";

/** Shown when a Hub module is off — names the consequence and the next step. */
export function ModuleDisabledPanel({
  moduleId,
  roles,
}: {
  moduleId: HubModule;
  roles: UserRole[];
}) {
  const t = useTranslations("hub.moduleDisabled");
  const canConfigure = canManageLocalModules(roles);

  return (
    <div className="mx-auto max-w-xl space-y-4 py-8">
      <h1 className={PUBLIC_PAGE_TITLE_CLASS}>{t(`${moduleId}.title`)}</h1>
      <Callout tone="muted" measure="fill">
        <p>{t(`${moduleId}.body`)}</p>
        {canConfigure ? (
          <p className="mt-2">
            <Link
              href="/app/configuration"
              className="font-semibold text-opseu-blue underline"
            >
              {t("openConfiguration")}
            </Link>
          </p>
        ) : (
          <p className="mt-2 text-sm">{t("askPresident")}</p>
        )}
      </Callout>
      <Link href="/app" className="inline-flex text-sm font-medium text-opseu-blue underline">
        {t("backDashboard")}
      </Link>
    </div>
  );
}
