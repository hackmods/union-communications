"use client";

import { useTranslations } from "next-intl";
import { FeatureTeaserPanel } from "@/components/platform/FeatureTeaserPanel";
import { ButtonLink } from "@/components/ui/ButtonLink";

/**
 * Member-only visitors on `/app` when Local Portal is their home — soft plug
 * for Officer Hub instead of an immediate redirect to `/portal`.
 */
export function HubFeatureTeaser({ portalEnabled }: { portalEnabled: boolean }) {
  const t = useTranslations("hub.teaser");

  return (
    <FeatureTeaserPanel
      eyebrow={t("eyebrow")}
      title={t("title")}
      body={portalEnabled ? t("body") : t("bodyPortalOff")}
      bullets={[t("bulletCasework"), t("bulletMeetings"), t("bulletTools")]}
      actions={
        <>
          {portalEnabled ? (
            <ButtonLink href="/portal" variant="primary" size="md" trailingArrow>
              {t("openPortal")}
            </ButtonLink>
          ) : null}
          <p className="text-sm text-slate-600 sm:self-center">
            {portalEnabled ? t("askOfficers") : t("askOfficersPortalOff")}
          </p>
        </>
      }
    />
  );
}
