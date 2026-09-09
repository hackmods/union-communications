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
  return buildPublicPageMetadata("/security", params);
}

export default async function SecurityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("securityPage");
  const hubPublic = isOfficerHubPublic();

  return (
    <GuideLayout title={t("title")} subtitle={t("subtitle")} preset="narrow">
      <div className="space-y-10">
        <GuideCallout>
          <p className="font-semibold text-opseu-dark">{t("leadTitle")}</p>
          <GuideProse className="mt-2">{t("leadBody")}</GuideProse>
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
          </GuideBulletList>
        </GuideSection>

        {hubPublic ? (
          <>
            <GuideSection
              id="transit"
              title={t("transitTitle")}
              className="mt-0 not-first-of-type:mt-0"
            >
              <GuideBulletList>
                <li className="leading-relaxed">{t("transit1")}</li>
                <li className="leading-relaxed">{t("transit2")}</li>
                <li className="leading-relaxed">{t("transit3")}</li>
              </GuideBulletList>
            </GuideSection>

            <GuideSection
              id="hub"
              title={t("hubTitle")}
              intro={t("hubIntro")}
              className="mt-0 not-first-of-type:mt-0"
            >
              <GuideBulletList>
                <li className="leading-relaxed">{t("hub1")}</li>
                <li className="leading-relaxed">{t("hub2")}</li>
                <li className="leading-relaxed">{t("hub3")}</li>
                <li className="leading-relaxed">{t("hub4")}</li>
                <li className="leading-relaxed">{t("hub5")}</li>
              </GuideBulletList>
            </GuideSection>

            <GuideSection
              id="portal"
              title={t("portalTitle")}
              intro={t("portalIntro")}
              className="mt-0 not-first-of-type:mt-0"
            >
              <GuideBulletList>
                <li className="leading-relaxed">{t("portal1")}</li>
                <li className="leading-relaxed">{t("portal2")}</li>
                <li className="leading-relaxed">{t("portal3")}</li>
                <li className="leading-relaxed">{t("portal4")}</li>
              </GuideBulletList>
            </GuideSection>

            <GuideCallout tone="muted">
              <p className="font-semibold text-opseu-dark">{t("honestTitle")}</p>
              <GuideProse className="mt-2">{t("honestBody")}</GuideProse>
            </GuideCallout>

            <GuideSection
              id="operator"
              title={t("operatorTitle")}
              className="mt-0 not-first-of-type:mt-0"
            >
              <GuideBulletList>
                <li className="leading-relaxed">{t("operator1")}</li>
                <li className="leading-relaxed">{t("operator2")}</li>
                <li className="leading-relaxed">{t("operator3")}</li>
                <li className="leading-relaxed">{t("operator4")}</li>
              </GuideBulletList>
            </GuideSection>
          </>
        ) : null}

        <GuideCallout tone="plain">
          <p className="font-semibold text-opseu-dark">{t("reportTitle")}</p>
          <GuideProse className="mt-2">
            {t("reportBody")}{" "}
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
          <p className="font-semibold text-opseu-dark">{t("privacyTitle")}</p>
          <GuideProse className="mt-2">
            {t("privacyBody")}{" "}
            <Link
              href="/privacy"
              className="font-medium text-opseu-blue underline underline-offset-2"
            >
              {t("privacyLink")}
            </Link>
            .
          </GuideProse>
        </GuideCallout>
      </div>
    </GuideLayout>
  );
}
