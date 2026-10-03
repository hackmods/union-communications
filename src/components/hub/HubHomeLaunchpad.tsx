"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { HubHomeTile } from "@/components/hub/HubHomeTile";
import { PresidentTodayStrip } from "@/components/hub/PresidentTodayStrip";
import {
  groupHubToolLinks,
  hubModuleActive,
  hubToolLinkActive,
} from "@/components/hub/hub-nav-model";
import {
  listVisibleHubTools,
  PLATFORM_ADMIN_OFFICER_MENU_EXCLUDES,
} from "@/components/hub/hub-tool-catalog";
import type { HubToolAccess } from "@/components/hub/hub-tool-catalog";
import type { HubModuleDefinition } from "@/lib/modules/registry";
import { hubMfaChallengeHref } from "@/lib/auth/mfa-return-path";
import type { HubModule, UserRole } from "@/types/tenant";

type HubHomeLaunchpadProps = {
  roles: UserRole[];
  enabledModules: HubModule[];
  modules: HubModuleDefinition[];
  mfaOk: boolean;
  isPresident: boolean;
  toolAccess: HubToolAccess;
};

type OfficerToolsGridProps = {
  groups: ReturnType<typeof groupHubToolLinks<{ href: string; label: string; blurbKey: string }>>;
  mfaOk: boolean;
  pathname: string;
  t: (key: string) => string;
};

function OfficerToolsGrid({ groups, mfaOk, pathname, t }: OfficerToolsGridProps) {
  if (!mfaOk) {
    return (
      <Link
        href={hubMfaChallengeHref()}
        className="inline-flex min-h-11 items-center text-sm font-medium text-opseu-blue underline-offset-2 hover:underline"
      >
        {t("mfaRequired")}
      </Link>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {groups.map((group) => (
        <div
          key={group.id}
          className="flex min-w-0 flex-col rounded-xl border border-slate-200/90 bg-white p-3 shadow-sm sm:p-3.5"
        >
          <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
            {t(group.labelKey)}
          </h3>
          <ul className="mt-3 flex flex-1 flex-col gap-2">
            {group.links.map((link) => (
              <li key={link.href} className="min-w-0">
                <HubHomeTile
                  href={link.href}
                  title={link.label}
                  body={t(`toolBlurbs.${link.blurbKey}`)}
                  current={hubToolLinkActive(pathname, link.href)}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function HubHomeLaunchpad({
  roles,
  enabledModules,
  modules,
  mfaOk,
  isPresident,
  toolAccess,
}: HubHomeLaunchpadProps) {
  const t = useTranslations("hub");
  const tHome = useTranslations("hub.dashboardHome");
  const pathname = usePathname();
  const visibleTools = listVisibleHubTools(toolAccess).filter(
    (item) =>
      !(
        roles.includes("platform_admin") &&
        PLATFORM_ADMIN_OFFICER_MENU_EXCLUDES.has(item.href)
      ),
  );
  const groups = groupHubToolLinks(
    visibleTools.map((item) => ({
      href: item.href,
      label: t(item.labelKey),
      blurbKey: item.blurbKey,
    })),
  );
  const hasLaunchpad =
    isPresident || modules.length > 0 || groups.length > 0;
  if (!hasLaunchpad) return null;

  return (
    <section
      aria-labelledby="hub-launchpad-heading"
      className="min-w-0 space-y-5"
      data-testid="hub-launchpad"
    >
      <SectionHeading
        id="hub-launchpad-heading"
        title={tHome("launchpadTitle")}
        intro={tHome("launchpadBody")}
      />

      <PresidentTodayStrip
        enabledModules={enabledModules}
        showLedger={toolAccess.ledger}
        showMeetings={toolAccess.meetings}
        show={isPresident}
      />

      {modules.length > 0 ? (
        <div className="space-y-3">
          <Eyebrow tone="muted">{tHome("launchpadModules")}</Eyebrow>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {modules.map((mod) => (
              <li key={mod.id} className="min-w-0">
                <HubHomeTile
                  href={
                    mod.requiresMfa && !mfaOk
                      ? hubMfaChallengeHref(mod.href)
                      : mod.href
                  }
                  title={t(`modules.${mod.nameKey}`)}
                  body={t(`modules.${mod.descriptionKey}`)}
                  emojiId={mod.emojiId}
                  current={hubModuleActive(pathname, mod.href)}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {groups.length > 0 ? (
        <div className="space-y-3">
          <Eyebrow tone="muted">{t("qolCardTitle")}</Eyebrow>
          <p className="max-w-prose text-sm leading-relaxed text-slate-600">
            {t("qolCardDesc")}
          </p>
          <div className="hidden md:block" data-testid="hub-officer-tools">
            <OfficerToolsGrid
              groups={groups}
              mfaOk={mfaOk}
              pathname={pathname}
              t={t}
            />
          </div>
          <details className="rounded-xl border border-opseu-blue/20 bg-gradient-to-br from-opseu-blue/[0.07] via-white to-opseu-orange/[0.05] md:hidden">
            <summary className="flex min-h-11 cursor-pointer items-center px-4 py-3 text-sm font-semibold text-opseu-dark marker:text-opseu-blue focus-visible:outline-2 focus-visible:outline-offset-[-3px]">
              {tHome("moreTools")}
            </summary>
            <div className="border-t border-opseu-blue/10 p-3">
              <OfficerToolsGrid
                groups={groups}
                mfaOk={mfaOk}
                pathname={pathname}
                t={t}
              />
            </div>
          </details>
        </div>
      ) : null}
    </section>
  );
}
