"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { FeatureTeaserPanel } from "@/components/platform/FeatureTeaserPanel";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { canManageLocalModules } from "@/lib/tenant/access";
import { canSeeOfficerHubLink } from "@/lib/portal/access";
import type { UserRole } from "@/types/tenant";

/** Shown on `/portal` when `enabledModules.portal` is off for this union. */
export function PortalFeatureTeaser({ roles }: { roles: UserRole[] }) {
  const t = useTranslations("portal.teaser");
  const canConfigure = canManageLocalModules(roles);
  const showHubCta = canSeeOfficerHubLink(roles);

  return (
    <FeatureTeaserPanel
      eyebrow={t("eyebrow")}
      title={t("title")}
      body={t("body")}
      bullets={[t("bulletCircles"), t("bulletTogether"), t("bulletDispatch")]}
      actions={
        <>
          {showHubCta ? (
            <ButtonLink href="/app" variant="primary" size="md" trailingArrow>
              {t("openHub")}
            </ButtonLink>
          ) : null}
          {!canConfigure ? (
            <p className="text-sm text-gray-600 sm:self-center">{t("askOfficers")}</p>
          ) : null}
        </>
      }
      footer={
        canConfigure ? (
          <Link
            href="/app/configuration"
            className="font-medium text-opseu-blue underline"
          >
            {t("turnOnPortal")}
          </Link>
        ) : null
      }
    />
  );
}
