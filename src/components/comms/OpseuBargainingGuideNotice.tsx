"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { GuideLayout, GuideCallout, GuideActionRow, GuideProse } from "@/components/comms/guide-ui";
import {
  guideCtaClass,
  guideCtaOutlineClass,
} from "@/components/comms/guideCtaClasses";
import { SourcesBlock } from "@/components/comms/SourcesBlock";

/** Replacement surface when OPSEU Brand Kit hides the generic bargaining guide. */
export function OpseuBargainingGuideNotice() {
  const t = useTranslations("bargainingGuide.opseuHidden");
  const nav = useTranslations("nav");
  const ts = useTranslations("sources");

  return (
    <GuideLayout
      title={t("title")}
      subtitle={t("subtitle")}
      intro={t("intro")}
      preset="playbook"
    >
      <GuideCallout tone="brand" className="mt-2">
        <p className="font-semibold text-opseu-dark">{t("whyTitle")}</p>
        <GuideProse className="mt-2">{t("whyBody")}</GuideProse>
      </GuideCallout>
      <GuideActionRow>
        <a
          href="https://opseu.org/"
          className={guideCtaClass}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("opseuHome")}
        </a>
        <a
          href="https://members.opseu.org/"
          className={guideCtaOutlineClass}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("memberPortal")}
        </a>
        <Link href="/guide/strike" className={guideCtaOutlineClass}>
          {nav("strikeGuide")}
        </Link>
        <Link href="/tools/proposal-tracker" className={guideCtaOutlineClass}>
          {nav("proposalTracker")}
        </Link>
      </GuideActionRow>
      <SourcesBlock pageId="bargaining" title={ts("title")} intro={ts("intro")} />
    </GuideLayout>
  );
}
