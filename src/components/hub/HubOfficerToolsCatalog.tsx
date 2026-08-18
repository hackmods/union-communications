"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { HubModule, UserRole } from "@/types/tenant";
import { groupHubToolLinks } from "@/components/hub/hub-nav-model";
import {
  listVisibleHubTools,
  resolveHubToolAccess,
} from "@/components/hub/hub-tool-catalog";

type HubOfficerToolsCatalogProps = {
  roles: UserRole[];
  enabledModules: HubModule[];
  mfaOk: boolean;
};

export function HubOfficerToolsCatalog({
  roles,
  enabledModules,
  mfaOk,
}: HubOfficerToolsCatalogProps) {
  const t = useTranslations("hub");
  const access = resolveHubToolAccess(roles, enabledModules);
  const groups = groupHubToolLinks(
    listVisibleHubTools(access).map((item) => ({
      href: item.href,
      label: t(item.labelKey),
      blurbKey: item.blurbKey,
    })),
  );

  if (groups.length === 0) return null;

  return (
    <section className="mt-6" aria-labelledby="officer-tools-heading">
      <h2
        id="officer-tools-heading"
        className="text-lg font-bold text-opseu-dark sm:text-xl"
      >
        {t("qolCardTitle")}
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-gray-600">{t("qolCardDesc")}</p>
      {mfaOk ? (
        <div
          data-testid="hub-officer-tools"
          className="mt-4 grid gap-6 sm:grid-cols-2 sm:gap-8 xl:grid-cols-4"
        >
          {groups.map((group) => (
            <div key={group.id}>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                {t(group.labelKey)}
              </h3>
              <ul className="mt-3 space-y-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="group block rounded-lg border border-transparent px-1 py-1 transition-colors hover:border-opseu-blue/15 hover:bg-opseu-blue/5"
                    >
                      <span className="inline-flex min-h-11 items-center font-medium text-opseu-blue underline-offset-2 group-hover:underline">
                        {link.label}
                      </span>
                      <span className="mt-0.5 block text-sm text-gray-600">
                        {t(`toolBlurbs.${link.blurbKey}`)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <Link
          href="/app/mfa"
          className="mt-3 inline-block text-sm text-opseu-blue underline"
        >
          {t("mfaRequired")}
        </Link>
      )}
    </section>
  );
}
