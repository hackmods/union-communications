"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import type { HubModule, UserRole } from "@/types/tenant";
import {
  groupHubToolLinks,
  hubToolLinkActive,
} from "@/components/hub/hub-nav-model";
import {
  listVisibleHubTools,
  resolveHubToolAccess,
} from "@/components/hub/hub-tool-catalog";
import { PUBLIC_CARD_TITLE_CLASS } from "@/lib/constants/public-type";
import { cn } from "@/lib/utils";

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
  const pathname = usePathname();
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
    <section
      aria-labelledby="officer-tools-heading"
      className="min-w-0 overflow-hidden rounded-xl border border-opseu-blue/20 bg-gradient-to-br from-opseu-blue/[0.07] via-white to-opseu-orange/[0.05] shadow-sm"
    >
      <div className="border-b border-opseu-blue/10 px-4 py-4 sm:px-5 sm:py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-opseu-blue">
          {t("qolCardEyebrow")}
        </p>
        <h2
          id="officer-tools-heading"
          className={cn(PUBLIC_CARD_TITLE_CLASS, "mt-1")}
        >
          {t("qolCardTitle")}
        </h2>
        <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-gray-600">
          {t("qolCardDesc")}
        </p>
      </div>

      {mfaOk ? (
        <div
          data-testid="hub-officer-tools"
          className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3 xl:grid-cols-4"
        >
          {groups.map((group) => (
            <div
              key={group.id}
              className="flex min-w-0 flex-col rounded-xl border border-slate-200/90 bg-white/90 p-3 shadow-sm sm:p-3.5"
            >
              <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                {t(group.labelKey)}
              </h3>
              <ul className="mt-3 flex flex-1 flex-col gap-2">
                {group.links.map((link) => {
                  const active = hubToolLinkActive(pathname, link.href);
                  return (
                    <li key={link.href} className="min-w-0">
                      <Link
                        href={link.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group flex min-h-11 flex-col rounded-lg border border-transparent px-2.5 py-2 transition-all duration-200 ease-out",
                          "hover:-translate-y-0.5 hover:border-opseu-blue/25 hover:bg-opseu-blue/[0.04] hover:shadow-sm",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/50 focus-visible:ring-offset-2",
                          "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
                          active &&
                            "border-opseu-blue/40 bg-opseu-blue/[0.06] ring-1 ring-opseu-blue/15",
                        )}
                      >
                        <span className="flex items-start justify-between gap-2">
                          <span className="text-sm font-semibold text-opseu-dark">
                            {link.label}
                          </span>
                          <span
                            className="mt-0.5 shrink-0 text-sm font-medium text-opseu-blue transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0"
                            aria-hidden
                          >
                            →
                          </span>
                        </span>
                        <span className="mt-0.5 text-sm leading-relaxed text-gray-600">
                          {t(`toolBlurbs.${link.blurbKey}`)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 py-4 sm:px-5">
          <Link
            href="/app/mfa"
            className="inline-flex min-h-11 items-center text-sm font-medium text-opseu-blue underline-offset-2 hover:underline"
          >
            {t("mfaRequired")}
          </Link>
        </div>
      )}
    </section>
  );
}
