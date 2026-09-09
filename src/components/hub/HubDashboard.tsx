"use client";

import { signOut, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getTenantContext } from "@/lib/tenant/loader";
import { getVisibleModules } from "@/lib/modules/registry";
import { useSessionMfaOk } from "@/components/hub/MfaPolicyProvider";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Emoji } from "@/components/ui/Emoji";
import { HubOfficerToolsCatalog } from "@/components/hub/HubOfficerToolsCatalog";
import { MyTasksWidget } from "@/components/hub/MyTasksWidget";
import { MyCheckinsWidget } from "@/components/hub/MyCheckinsWidget";
import { useLiveTenant } from "@/components/hub/TenantLiveProvider";
import { isOfficerHubPublic } from "@/lib/features/officer-hub-public";
import { PlatformOperatorCard } from "@/components/platform/PlatformOperatorCard";
import { isPlatformOperator } from "@/lib/platform/operator-nav";
import { usePathname } from "@/i18n/navigation";
import {
  PUBLIC_CARD_TITLE_CLASS,
  PUBLIC_PAGE_TITLE_CLASS,
  PUBLIC_SECTION_TITLE_CLASS,
} from "@/lib/constants/public-type";
import type { HubModule, UserRole } from "@/types/tenant";

export function HubDashboard() {
  const { data: session } = useSession();
  const t = useTranslations("hub");
  const pathname = usePathname();
  const mfaOk = useSessionMfaOk();
  const liveTenant = useLiveTenant();

  if (!session?.user) {
    return (
      <p className="text-gray-600" aria-live="polite">
        {t("sessionLoading")}
      </p>
    );
  }

  const tenant =
    liveTenant ??
    (session.user.unionId
      ? getTenantContext(session.user.unionId, session.user.localId)
      : null);
  const enabledModules: HubModule[] =
    tenant?.union.enabledModules ?? ["comms"];
  const roles = (session.user.roles ?? []) as UserRole[];
  const modules = getVisibleModules(enabledModules, roles);
  const showSetupCard =
    roles.includes("local_president") && !isOfficerHubPublic();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className={PUBLIC_PAGE_TITLE_CLASS}>{t("dashboard")}</h1>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-gray-600 sm:text-base">
            {t("welcome", {
              name: session.user.name ?? session.user.email ?? "",
            })}
          </p>
        </div>
        <Button
          variant="outline"
          className="w-full shrink-0 sm:w-auto"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          {t("signOut")}
        </Button>
      </div>

      {isPlatformOperator(roles) ? (
        <PlatformOperatorCard pathname={pathname} />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 md:gap-5">
        {showSetupCard ? (
          <Card density="compact" className="border-opseu-blue/30 bg-white md:col-span-2">
            <h2 className={PUBLIC_CARD_TITLE_CLASS}>{t("setupCardTitle")}</h2>
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-gray-600">
              {t("setupCardBody")}
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Link
                href="/app/onboarding"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-opseu-blue px-4 text-sm font-medium text-white"
              >
                {t("setupCardOnboarding")}
              </Link>
              <Link
                href="/app/invites"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-opseu-dark"
              >
                {t("setupCardInvites")}
              </Link>
            </div>
          </Card>
        ) : null}

        {tenant ? (
          <Card density="compact" className="md:col-span-2">
            <h2 className="text-sm font-medium text-gray-700">{t("tenantInfo")}</h2>
            <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="font-medium text-gray-500">{t("union")}</dt>
                <dd className="mt-0.5 text-opseu-dark">{tenant.union.name}</dd>
              </div>
              {tenant.division ? (
                <div>
                  <dt className="font-medium text-gray-500">{t("division")}</dt>
                  <dd className="mt-0.5 text-opseu-dark">{tenant.division.name}</dd>
                </div>
              ) : null}
              {tenant.local ? (
                <div>
                  <dt className="font-medium text-gray-500">{t("local")}</dt>
                  <dd className="mt-0.5 text-opseu-dark">
                    Local {tenant.local.localNumber} - {tenant.local.subText}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="font-medium text-gray-500">{t("roles")}</dt>
                <dd className="mt-0.5 text-opseu-dark">{roles.join(", ")}</dd>
              </div>
            </dl>
          </Card>
        ) : null}
      </div>

      <HubOfficerToolsCatalog
        roles={roles}
        enabledModules={enabledModules}
        mfaOk={mfaOk}
      />

      <section aria-labelledby="hub-modules-heading" className="space-y-4">
        <h2 id="hub-modules-heading" className={PUBLIC_SECTION_TITLE_CLASS}>
          {t("yourModules")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {modules.map((mod) => {
            const locked = Boolean(mod.requiresMfa) && !mfaOk;
            const href = mod.href;
            return (
              <Card
                key={mod.id}
                density="compact"
                className={locked ? "opacity-60" : ""}
              >
                <CardTitle className={PUBLIC_CARD_TITLE_CLASS}>
                  <Emoji id={mod.emojiId} /> {t(`modules.${mod.nameKey}`)}
                </CardTitle>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {t(`modules.${mod.descriptionKey}`)}
                </p>
                {locked ? (
                  <Link
                    href="/app/mfa"
                    className="mt-3 inline-block text-sm text-opseu-blue underline"
                  >
                    {t("mfaRequired")}
                  </Link>
                ) : (
                  <Link
                    href={href}
                    className="mt-3 inline-block text-sm text-opseu-blue underline"
                  >
                    {t("openModule")}
                  </Link>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      <section
        aria-label={t("dashboard")}
        className="grid gap-4 md:grid-cols-2 md:gap-5"
      >
        <MyTasksWidget />
        <MyCheckinsWidget />
      </section>
    </div>
  );
}
