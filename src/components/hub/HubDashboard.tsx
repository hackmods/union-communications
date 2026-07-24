"use client";

import { signOut, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getTenantContext } from "@/lib/tenant/loader";
import { getVisibleModules } from "@/lib/modules/registry";
import { canInitiateHandoff } from "@/lib/handoff/package";
import { useSessionMfaOk } from "@/components/hub/MfaPolicyProvider";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Emoji } from "@/components/ui/Emoji";
import { MyTasksWidget } from "@/components/hub/MyTasksWidget";
import type { HubModule, UserRole } from "@/types/tenant";

export function HubDashboard() {
  const { data: session } = useSession();
  const t = useTranslations("hub");
  const mfaOk = useSessionMfaOk();

  if (!session?.user) {
    return (
      <p className="text-gray-600" aria-live="polite">
        {t("sessionLoading")}
      </p>
    );
  }

  const tenant = session.user.unionId
    ? getTenantContext(session.user.unionId)
    : null;
  const enabledModules: HubModule[] =
    tenant?.union.enabledModules ?? ["comms"];
  const roles = (session.user.roles ?? []) as UserRole[];
  const modules = getVisibleModules(enabledModules, roles);
  const showHandoff = canInitiateHandoff(roles);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-opseu-dark sm:text-3xl">
            {t("dashboard")}
          </h1>
          <p className="mt-1 text-sm text-gray-600 sm:text-base">
            {t("welcome", {
              name: session.user.name ?? session.user.email ?? "",
            })}
          </p>
        </div>
        <Button
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          {t("signOut")}
        </Button>
      </div>

      {tenant && (
        <Card density="compact" className="mt-4">
          <h2 className="text-sm font-medium text-gray-700">{t("tenantInfo")}</h2>
          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm sm:grid-cols-4">
            <div>
              <dt className="font-medium text-gray-500">{t("union")}</dt>
              <dd>{tenant.union.name}</dd>
            </div>
            {tenant.division && (
              <div>
                <dt className="font-medium text-gray-500">{t("division")}</dt>
                <dd>{tenant.division.name}</dd>
              </div>
            )}
            {tenant.local && (
              <div>
                <dt className="font-medium text-gray-500">{t("local")}</dt>
                <dd>
                  Local {tenant.local.localNumber} - {tenant.local.subText}
                </dd>
              </div>
            )}
            <div>
              <dt className="font-medium text-gray-500">{t("roles")}</dt>
              <dd>{roles.join(", ")}</dd>
            </div>
          </dl>
        </Card>
      )}

      <h2 className="mt-6 text-lg font-bold text-opseu-dark sm:text-xl">
        {t("yourModules")}
      </h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
        {modules.map((mod) => {
          const locked = Boolean(mod.requiresMfa) && !mfaOk;
          const href = mod.href.startsWith("/app") ? mod.href : "/";
          return (
            <Card
              key={mod.id}
              density="compact"
              className={locked ? "opacity-60" : ""}
            >
              <CardTitle className="text-base">
                <Emoji id={mod.emojiId} /> {t(`modules.${mod.nameKey}`)}
              </CardTitle>
              <p className="mt-1 text-xs text-gray-600 sm:text-sm">
                {t(`modules.${mod.descriptionKey}`)}
              </p>
              {locked ? (
                <Link
                  href="/app/mfa"
                  className="mt-2 inline-block text-sm text-opseu-blue underline"
                >
                  {t("mfaRequired")}
                </Link>
              ) : (
                <Link
                  href={href}
                  className="mt-2 inline-block text-sm text-opseu-blue underline"
                >
                  {t("openModule")}
                </Link>
              )}
            </Card>
          );
        })}
      </div>

      <MyTasksWidget />

      <Card density="compact" className="mt-6">
        <CardTitle className="text-base">{t("qolCardTitle")}</CardTitle>
        <p className="mt-1 text-xs text-gray-600 sm:text-sm">{t("qolCardDesc")}</p>
        {mfaOk ? (
          <div className="mt-2 flex flex-wrap gap-3 text-sm sm:gap-4">
            <Link href="/app/overdue" className="text-opseu-blue underline">
              {t("overdueLink")}
            </Link>
            <Link href="/app/snippets" className="text-opseu-blue underline">
              {t("snippetsLink")}
            </Link>
            <Link href="/app/marketplace" className="text-opseu-blue underline">
              {t("marketplaceLink")}
            </Link>
            {showHandoff && (
              <Link href="/app/handoff" className="text-opseu-blue underline">
                {t("handoffLink")}
              </Link>
            )}
          </div>
        ) : (
          <Link
            href="/app/mfa"
            className="mt-2 inline-block text-sm text-opseu-blue underline"
          >
            {t("mfaRequired")}
          </Link>
        )}
      </Card>

      <Card density="compact" className="mt-4">
        <CardTitle className="text-base">{t("hybridCardTitle")}</CardTitle>
        <p className="mt-1 text-xs text-gray-600 sm:text-sm">
          {t("hybridCardDesc")}
        </p>
        {mfaOk ? (
          <Link
            href="/app/hybrid"
            className="mt-2 inline-block text-sm text-opseu-blue underline"
          >
            {t("hybridLink")}
          </Link>
        ) : (
          <Link
            href="/app/mfa"
            className="mt-2 inline-block text-sm text-opseu-blue underline"
          >
            {t("mfaRequired")}
          </Link>
        )}
      </Card>
    </div>
  );
}
