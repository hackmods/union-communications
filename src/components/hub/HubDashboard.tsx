"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { getTenantContext } from "@/lib/tenant/loader";
import { resolveHubModulesForLocal } from "@/lib/president/local-prefs";
import { useSessionMfaOk } from "@/components/hub/MfaPolicyProvider";
import { Card } from "@/components/ui/Card";
import { HubIdentityPlate } from "@/components/hub/HubIdentityPlate";
import { HubHomeLaunchpad } from "@/components/hub/HubHomeLaunchpad";
import { MyTasksWidget } from "@/components/hub/MyTasksWidget";
import { MyCheckinsWidget } from "@/components/hub/MyCheckinsWidget";
import { useLiveTenant } from "@/components/hub/TenantLiveProvider";
import { PresidentSetupChecklist } from "@/components/hub/PresidentSetupChecklist";
import { resolveHubToolAccess } from "@/components/hub/hub-tool-catalog";
import { hubShowsLocalPortalPeer } from "@/components/hub/hub-nav-model";
import { PlatformOperatorCard } from "@/components/platform/PlatformOperatorCard";
import { resolveDashboardModel } from "@/components/hub/hub-dashboard-model";
import { hubMfaChallengeHref } from "@/lib/auth/mfa-return-path";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { HubModule, UserRole } from "@/types/tenant";

export function HubDashboard() {
  const { data: session, update } = useSession();
  const t = useTranslations("hub");
  const tHome = useTranslations("hub.dashboardHome");
  const pathname = usePathname();
  const mfaOk = useSessionMfaOk();
  const liveTenant = useLiveTenant();
  const refreshedJwt = useRef(false);

  // One-shot JWT tenancy/role refresh so Hub labels match Postgres after role
  // changes. Gate with a ref so a changing `update` identity cannot re-fire
  // and flicker session-gated chrome (e.g. Platform admin).
  useEffect(() => {
    if (refreshedJwt.current) return;
    refreshedJwt.current = true;
    void update();
  }, [update]);

  if (!session?.user) {
    return <p role="status" className="text-slate-700">{t("sessionLoading")}</p>;
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
  const toolAccess = resolveHubToolAccess(roles, enabledModules, {
    unionId: session.user.unionId,
    localId: session.user.localId,
  });
  const contextKey = `${session.user.unionId ?? ""}:${session.user.localId ?? ""}:${session.user.bargainingUnitId ?? ""}`;
  const showPortalPeer = hubShowsLocalPortalPeer(
    tenant ? enabledModules : undefined,
    roles,
    Boolean(tenant),
  );
  const showLaunchpad = !platformAdmin && mfaOk && Boolean(tenant);

  return (
    <div data-testid="hub-dashboard" className="space-y-6 pb-8 md:space-y-8">
      <HubIdentityPlate
        unionName={tenant?.union.name}
        localNumber={tenant?.local?.localNumber}
        personName={session.user.name ?? session.user.email ?? ""}
        roles={roles}
        showPortalPeer={showPortalPeer}
      />

      <section aria-labelledby="hub-attention-heading" className="min-w-0 space-y-4">
        <SectionHeading
          id="hub-attention-heading"
          title={platformAdmin ? tHome("platformAttention") : tHome("attention")}
          intro={platformAdmin ? tHome("platformAttentionBody") : tHome("attentionBody")}
        />

        {attention === "platform" ? (
          <PlatformOperatorCard pathname={pathname} variant="card" />
        ) : attention === "locked" ? (
          <Card density="compact" className="border-amber-300 bg-amber-50">
            <h3 className="font-semibold text-amber-950">{tHome("mfaTitle")}</h3>
            <p className="mt-2 text-sm leading-relaxed text-amber-950">{tHome("mfaBody")}</p>
            <Link href={hubMfaChallengeHref()} className="mt-3 inline-flex min-h-11 items-center font-semibold text-opseu-blue underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2">
              {t("mfaRequired")}
            </Link>
          </Card>
        ) : !tenant ? (
          <Card density="compact" className="border-slate-200 bg-slate-50">
            <p role="status" className="text-sm leading-relaxed text-slate-700">{tHome("tenantPending")}</p>
          </Card>
        ) : attention === "personal" ? (
          <div className="grid min-w-0 gap-3 md:grid-cols-2" data-testid="hub-attention-widgets">
            {showTasks ? <MyTasksWidget key={`tasks:${contextKey}`} /> : null}
            {showCheckins ? <MyCheckinsWidget key={`checkins:${contextKey}`} /> : null}
          </div>
        ) : (
          <Card density="compact" className="border-slate-200 bg-slate-50">
            <p className="text-sm leading-relaxed text-slate-700">{tHome("noWorkModules")}</p>
          </Card>
        )}
      </section>

      {showLaunchpad ? (
        <HubHomeLaunchpad
          roles={roles}
          enabledModules={enabledModules}
          modules={modules}
          mfaOk={mfaOk}
          isPresident={isPresident}
          toolAccess={toolAccess}
        />
      ) : null}

      <PresidentSetupChecklist enabledModules={enabledModules} show={isPresident && mfaOk && Boolean(tenant)} />
    </div>
  );
}
