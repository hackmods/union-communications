"use client";

import { signOut } from "next-auth/react";
import type { Session } from "next-auth";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getTenantContext } from "@/lib/tenant/loader";
import { getVisibleModules } from "@/lib/modules/registry";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Emoji } from "@/components/ui/Emoji";
import type { HubModule, UserRole } from "@/types/tenant";

interface HubDashboardProps {
  session: Session;
}

export function HubDashboard({ session }: HubDashboardProps) {
  const t = useTranslations("hub");
  const user = session.user!;

  const tenant = user.unionId ? getTenantContext(user.unionId) : null;
  const enabledModules: HubModule[] = tenant?.union.enabledModules ?? ["comms"];
  const roles = (user.roles ?? []) as UserRole[];
  const modules = getVisibleModules(enabledModules, roles);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-opseu-dark">{t("dashboard")}</h1>
          <p className="mt-1 text-gray-600">
            {t("welcome", { name: user.name ?? user.email ?? "" })}
          </p>
        </div>
        <Button variant="outline" onClick={() => signOut({ callbackUrl: "/" })}>
          {t("signOut")}
        </Button>
      </div>

      {tenant && (
        <Card className="mt-6">
          <CardTitle>{t("tenantInfo")}</CardTitle>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
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
                  Local {tenant.local.localNumber} — {tenant.local.subText}
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

      <h2 className="mt-8 text-xl font-bold text-opseu-dark">{t("yourModules")}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((mod) => {
          const locked = mod.requiresMfa && !user.mfaVerified;
          const href = mod.href.startsWith("/app") ? mod.href : "/";
          return (
            <Card key={mod.id} className={locked ? "opacity-60" : ""}>
              <CardTitle>
                <Emoji id={mod.emojiId} /> {t(`modules.${mod.nameKey}`)}
              </CardTitle>
              <p className="mt-2 text-sm text-gray-600">
                {t(`modules.${mod.descriptionKey}`)}
              </p>
              {locked ? (
                <Link href="/app/mfa" className="mt-4 inline-block text-sm text-opseu-blue underline">
                  {t("mfaRequired")}
                </Link>
              ) : (
                <Link href={href} className="mt-4 inline-block text-sm text-opseu-blue underline">
                  {t("openModule")}
                </Link>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
