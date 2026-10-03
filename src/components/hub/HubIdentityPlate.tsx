"use client";

import { useTranslations } from "next-intl";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { formatRoleLabel } from "@/lib/auth/role-labels";
import { PUBLIC_PAGE_TITLE_CLASS } from "@/lib/constants/public-type";
import { isPlatformOperator } from "@/lib/platform/operator-nav";
import type { UserRole } from "@/types/tenant";
import {
  hubIdentityHeading,
  hubIdentityLocalLine,
} from "./hub-home-identity";

type HubIdentityPlateProps = {
  unionName?: string | null;
  localNumber?: string | null;
  personName: string;
  roles: readonly UserRole[];
  showPortalPeer: boolean;
};

export function HubIdentityPlate({
  unionName,
  localNumber,
  personName,
  roles,
  showPortalPeer,
}: HubIdentityPlateProps) {
  const t = useTranslations("hub");
  const tHome = useTranslations("hub.dashboardHome");
  const tRoles = useTranslations("hub.roleLabels");
  const tOp = useTranslations("hub.platformOperator");
  const operator = isPlatformOperator(roles);
  const heading = hubIdentityHeading({
    unionName,
    pendingFallback: tHome("identityPendingTitle"),
  });
  const localLine = hubIdentityLocalLine({
    localNumber,
    localLabel: (number) => tHome("identityLocal", { number }),
  });

  return (
    <Card
      variant="ghost"
      density="compact"
      data-testid="hub-identity-plate"
      className="pb-4 sm:pb-5"
    >
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <Eyebrow>{t("title")}</Eyebrow>
          <h1 className={`${PUBLIC_PAGE_TITLE_CLASS} mt-1`}>{heading}</h1>
          {localLine ? (
            <p className="mt-1 text-sm font-semibold text-opseu-dark sm:text-base">
              {localLine}
            </p>
          ) : null}
          <p className="mt-1 text-sm leading-relaxed text-slate-700 sm:text-base">
            {t("welcome", { name: personName })}
          </p>
          {roles.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={tHome("roleChips")}>
              {roles.map((role) => (
                <li
                  key={role}
                  className="rounded-full border border-opseu-blue/20 bg-white px-2.5 py-0.5 text-xs font-semibold text-opseu-dark"
                >
                  {formatRoleLabel(role, tRoles)}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {showPortalPeer || operator ? (
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            {showPortalPeer ? (
              <ButtonLink href="/portal" variant="outline" size="sm" trailingArrow>
                {t("portalLink")}
              </ButtonLink>
            ) : null}
            {operator ? (
              <ButtonLink href="/app/site-admin" variant="primary" size="sm" trailingArrow>
                {tOp("menu")}
              </ButtonLink>
            ) : null}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
