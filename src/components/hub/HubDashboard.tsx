"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { getTenantContext } from "@/lib/tenant/loader";
import { resolveHubModulesForLocal } from "@/lib/president/local-prefs";
import { useSessionMfaOk } from "@/components/hub/MfaPolicyProvider";
import { Card } from "@/components/ui/Card";
import { HubOfficerToolsCatalog } from "@/components/hub/HubOfficerToolsCatalog";
import { MyTasksWidget } from "@/components/hub/MyTasksWidget";
import { MyCheckinsWidget } from "@/components/hub/MyCheckinsWidget";
import { useLiveTenant } from "@/components/hub/TenantLiveProvider";
import { PresidentSetupChecklist } from "@/components/hub/PresidentSetupChecklist";
import { PresidentTodayStrip } from "@/components/hub/PresidentTodayStrip";
import { PlatformOperatorCard } from "@/components/platform/PlatformOperatorCard";
import { resolveDashboardModel } from "@/components/hub/hub-dashboard-model";
import {
  PUBLIC_PAGE_TITLE_CLASS,
  PUBLIC_SECTION_TITLE_CLASS,
} from "@/lib/constants/public-type";
import { formatRoleList } from "@/lib/auth/role-labels";
import { cn } from "@/lib/utils";
import type { HubModule, UserRole } from "@/types/tenant";

export function HubDashboard() {
  const { data: session } = useSession();
  const t = useTranslations("hub");
  const tHome = useTranslations("hub.dashboardHome");
  const tRoles = useTranslations("hub.roleLabels");
  const pathname = usePathname();
  const mfaOk = useSessionMfaOk();
  const liveTenant = useLiveTenant();

  if (!session?.user) {
    return <p role="status" className="text-gray-700">{t("sessionLoading")}</p>;
  }

  const tenant = liveTenant ?? (session.user.unionId
    ? getTenantContext(session.user.unionId, session.user.localId)
    : null);
  const unionModules: HubModule[] = tenant?.union.enabledModules ?? [];
  const enabledModules = tenant?.union.id
    ? resolveHubModulesForLocal(tenant.union.id, session.user.localId, unionModules)
    : unionModules;
  const roles = (session.user.roles ?? []) as UserRole[];
  const { attention, platformAdmin, isPresident, showTasks, showCheckins, modules } =
    resolveDashboardModel(roles, enabledModules, mfaOk);
  const contextKey = `${session.user.unionId ?? ""}:${session.user.localId ?? ""}:${session.user.bargainingUnitId ?? ""}`;

  return (
    <div data-testid="hub-dashboard" className="space-y-6 pb-8 md:space-y-8">
      <header className="flex flex-col gap-2 border-b border-slate-200 pb-4 sm:pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-opseu-blue">
          {t("title")}
        </p>
        <h1 className={PUBLIC_PAGE_TITLE_CLASS}>{t("dashboard")}</h1>
        <p className="text-sm leading-relaxed text-gray-700 sm:text-base">
          {t("welcome", { name: session.user.name ?? session.user.email ?? "" })}
        </p>
        <p className="text-sm text-gray-700">
          {[tenant?.union.name, tenant?.local ? `${t("local")} ${tenant.local.localNumber}` : null, formatRoleList(roles, tRoles)]
            .filter(Boolean).join(" · ")}
        </p>
      </header>

      <div className={cn(
        "grid min-w-0 gap-5 lg:items-start xl:gap-7",
        platformAdmin ? "lg:grid-cols-1" : "lg:grid-cols-[minmax(0,1.65fr)_minmax(18rem,0.85fr)]",
      )}>
        <section aria-labelledby="hub-attention-heading" className="min-w-0 space-y-4">
          <div>
            <h2 id="hub-attention-heading" className={PUBLIC_SECTION_TITLE_CLASS}>
              {platformAdmin ? tHome("platformAttention") : tHome("attention")}
            </h2>
            <p className="mt-1 max-w-prose text-sm leading-relaxed text-gray-700">
              {platformAdmin ? tHome("platformAttentionBody") : tHome("attentionBody")}
            </p>
          </div>

          {attention === "platform" ? (
            <PlatformOperatorCard pathname={pathname} variant="profile" />
          ) : attention === "locked" ? (
            <Card density="compact" className="border-amber-300 bg-amber-50">
              <h3 className="font-semibold text-amber-950">{tHome("mfaTitle")}</h3>
              <p className="mt-2 text-sm leading-relaxed text-amber-950">{tHome("mfaBody")}</p>
              <Link href="/app/mfa" className="mt-3 inline-flex min-h-11 items-center font-semibold text-opseu-blue underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2">
                {t("mfaRequired")}
              </Link>
            </Card>
          ) : !tenant ? (
            <Card density="compact" className="border-slate-200 bg-slate-50">
              <p role="status" className="text-sm leading-relaxed text-gray-700">{tHome("tenantPending")}</p>
            </Card>
          ) : attention === "personal" ? (
            <div className="grid min-w-0 gap-3 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2" data-testid="hub-attention-widgets">
              {showTasks ? <MyTasksWidget key={`tasks:${contextKey}`} /> : null}
              {showCheckins ? <MyCheckinsWidget key={`checkins:${contextKey}`} /> : null}
            </div>
          ) : (
            <Card density="compact" className="border-slate-200 bg-slate-50">
              <p className="text-sm leading-relaxed text-gray-700">{tHome("noWorkModules")}</p>
            </Card>
          )}
        </section>

        {!platformAdmin && (tenant || !mfaOk) ? <aside className="min-w-0 space-y-4" aria-label={tHome("nextSteps")}>
          {!mfaOk ? (
            <section aria-labelledby="hub-next-heading" className="space-y-2">
              <h2 id="hub-next-heading" className={PUBLIC_SECTION_TITLE_CLASS}>{tHome("nextSteps")}</h2>
              <p className="text-sm leading-relaxed text-gray-700">{tHome("mfaNext")}</p>
            </section>
          ) : isPresident ? (
            <PresidentTodayStrip enabledModules={enabledModules} show />
          ) : (
            <section aria-labelledby="hub-next-heading" className="space-y-3">
              <h2 id="hub-next-heading" className={PUBLIC_SECTION_TITLE_CLASS}>{tHome("nextSteps")}</h2>
              <p className="text-sm leading-relaxed text-gray-700">{tHome("nextStepsBody")}</p>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                {modules.slice(0, 4).map((mod) => (
                  <li key={mod.id}>
                    <Link
                      href={mod.requiresMfa && !mfaOk ? "/app/mfa" : mod.href}
                      className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-opseu-dark hover:border-opseu-blue/40 focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                      <span>{t(`modules.${mod.nameKey}`)}</span>
                      <span aria-hidden="true">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
              {modules.length === 0 ? <p className="text-sm text-gray-700">{tHome("noNextSteps")}</p> : null}
            </section>
          )}
        </aside> : null}
      </div>

      <PresidentSetupChecklist enabledModules={enabledModules} show={isPresident && mfaOk && Boolean(tenant)} />

      {!platformAdmin && mfaOk && tenant ? (
        <section aria-label={tHome("browseTools")} className="border-t border-slate-200 pt-5">
          <HubOfficerToolsCatalog roles={roles} enabledModules={enabledModules} mfaOk={mfaOk} />
        </section>
      ) : null}
    </div>
  );
}
