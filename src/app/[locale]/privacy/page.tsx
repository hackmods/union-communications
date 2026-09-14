import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { Link } from "@/i18n/navigation";
import {
  GuideLayout,
  GuideBulletList,
  GuideCallout,
  GuideProse,
  GuideSection,
} from "@/components/comms/guide-ui";
import { isOfficerHubPublic } from "@/lib/features/officer-hub-public";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/privacy", params);
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("privacyPage");
  const hubPublic = isOfficerHubPublic();

  return (
    <GuideLayout title={t("title")} subtitle={t("subtitle")} preset="narrow">
      <div className="space-y-10">
        <GuideCallout>
          <p className="font-semibold text-opseu-dark">
            {hubPublic ? t("leadTitleHub") : t("leadTitleCommsOnly")}
          </p>
          <GuideProse className="mt-2">
            {hubPublic ? t("leadBodyHub") : t("leadBodyCommsOnly")}
          </GuideProse>
        </GuideCallout>

        <GuideSection
          id="comms"
          title={t("commsTitle")}
          className="mt-0 not-first-of-type:mt-0"
        >
          <GuideBulletList>
            <li className="leading-relaxed">{t("comms1")}</li>
            <li className="leading-relaxed">{t("comms2")}</li>
            <li className="leading-relaxed">{t("comms3")}</li>
            <li className="leading-relaxed">{t("comms4")}</li>
          </GuideBulletList>
        </GuideSection>

        {hubPublic ? (
          <GuideSection
            id="hub"
            title={t("hubTitle")}
            intro={t("hubIntro")}
            className="mt-0 not-first-of-type:mt-0"
          >
            <GuideBulletList>
              <li className="leading-relaxed">{t("hubSelfHost")}</li>
              <li className="leading-relaxed">{t("hubHybrid")}</li>
              <li className="leading-relaxed">{t("hubDemo")}</li>
            </GuideBulletList>
          </GuideSection>
        ) : null}

        <GuideSection
          id="ontario"
          title={t("ontarioTitle")}
          className="mt-0 not-first-of-type:mt-0"
        >
          <GuideProse>
            {hubPublic ? t("ontarioHub") : t("ontarioCommsOnly")}
          </GuideProse>
        </GuideSection>

        <GuideCallout tone="muted">
          <p className="font-semibold text-opseu-dark">
            {t("responsibilitiesTitle")}
          </p>
          <GuideProse className="mt-2">
            {t("responsibilitiesBody")}{" "}
            <Link
              href="/guide/photo-consent"
              className="font-medium text-opseu-blue underline underline-offset-2"
            >
              {t("photoConsentLink")}
            </Link>
            .
          </GuideProse>
        </GuideCallout>

        <GuideCallout tone="muted">
          <p className="font-semibold text-opseu-dark">{t("installTitle")}</p>
          <GuideProse className="mt-2">
            {t("installBody")}{" "}
            <Link
              href="/install"
              className="font-medium text-opseu-blue underline underline-offset-2"
            >
              {t("installLink")}
            </Link>
            .
          </GuideProse>
        </GuideCallout>

        <GuideCallout tone="plain">
          <p className="font-semibold text-opseu-dark">{t("siteFeedbackTitle")}</p>
          <GuideProse className="mt-2">
            {t("siteFeedbackBody")}{" "}
            <Link
              href="/feedback"
              className="font-medium text-opseu-blue underline underline-offset-2"
            >
              {t("siteFeedbackLink")}
            </Link>
            .
          </GuideProse>
        </GuideCallout>

        <GuideCallout tone="plain">
          <p className="font-semibold text-opseu-dark">{t("contactTitle")}</p>
          <GuideProse className="mt-2">
            {t("contactBody")}{" "}
            <Link
              href="/support"
              className="font-medium text-opseu-blue underline underline-offset-2"
            >
              {t("supportLink")}
            </Link>
            .
          </GuideProse>
        </GuideCallout>

        <GuideCallout tone="plain">
          <p className="font-semibold text-opseu-dark">{t("securityTitle")}</p>
          <GuideProse className="mt-2">
            {t("securityBody")}{" "}
            <Link
              href="/security"
              className="font-medium text-opseu-blue underline underline-offset-2"
            >
              {t("securityLink")}
            </Link>
            .
          </GuideProse>
        </GuideCallout>
      </div>
    </GuideLayout>
  );
}
