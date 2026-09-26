import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { Link } from "@/i18n/navigation";
import { ComposedPageLayout } from "@/components/layout/ComposedPageLayout";
import {
  GuideBulletList,
  GuideCallout,
  GuideProse,
  GuideSection,
} from "@/components/comms/guide-ui";
import { PublicHubPanel } from "@/components/comms/PublicHubPanel";
import { isOfficerHubPublic } from "@/lib/features/officer-hub-public";
import { PUBLIC_PAGE_TITLE_CLASS } from "@/lib/constants/public-type";

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
    <ComposedPageLayout composition="hub" size="wide" className="py-10 md:py-14">
      <header className="max-w-3xl">
        <h1 className={PUBLIC_PAGE_TITLE_CLASS}>{t("title")}</h1>
        <p className="mt-2 text-lg text-gray-600">{t("subtitle")}</p>
      </header>

      <GuideCallout className="mt-8 max-w-3xl" measure="fill">
        <h2 className="text-base font-semibold text-opseu-dark">{t("leadTitle")}</h2>
        <GuideProse className="mt-2">{t("leadBody")}</GuideProse>
      </GuideCallout>

      <div className="mt-10 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <PublicHubPanel className="h-full">
          <GuideSection
            id="comms"
            title={t("commsTitle")}
            className="mt-0 border-l-0 pl-0 not-first-of-type:mt-0"
          >
            <GuideBulletList>
              <li className="leading-relaxed">{t("comms1")}</li>
              <li className="leading-relaxed">{t("comms2")}</li>
              <li className="leading-relaxed">{t("comms3")}</li>
            </GuideBulletList>
          </GuideSection>
        </PublicHubPanel>

        {hubPublic ? (
          <>
            <PublicHubPanel className="h-full">
              <GuideSection
                id="transit"
                title={t("transitTitle")}
                className="mt-0 border-l-0 pl-0 not-first-of-type:mt-0"
              >
                <GuideBulletList>
                  <li className="leading-relaxed">{t("transit1")}</li>
                  <li className="leading-relaxed">{t("transit2")}</li>
                  <li className="leading-relaxed">{t("transit3")}</li>
                </GuideBulletList>
              </GuideSection>
            </PublicHubPanel>

            <PublicHubPanel className="h-full">
              <GuideSection
                id="hub"
                title={t("hubTitle")}
                intro={t("hubIntro")}
                className="mt-0 border-l-0 pl-0 not-first-of-type:mt-0"
              >
                <GuideBulletList>
                  <li className="leading-relaxed">{t("hub1")}</li>
                  <li className="leading-relaxed">{t("hub2")}</li>
                  <li className="leading-relaxed">{t("hub3")}</li>
                  <li className="leading-relaxed">{t("hub4")}</li>
                  <li className="leading-relaxed">{t("hub5")}</li>
                </GuideBulletList>
              </GuideSection>
            </PublicHubPanel>

            <PublicHubPanel className="h-full">
              <GuideSection
                id="portal"
                title={t("portalTitle")}
                intro={t("portalIntro")}
                className="mt-0 border-l-0 pl-0 not-first-of-type:mt-0"
              >
                <GuideBulletList>
                  <li className="leading-relaxed">{t("portal1")}</li>
                  <li className="leading-relaxed">{t("portal2")}</li>
                  <li className="leading-relaxed">{t("portal3")}</li>
                  <li className="leading-relaxed">{t("portal4")}</li>
                </GuideBulletList>
              </GuideSection>
            </PublicHubPanel>

            <PublicHubPanel className="h-full lg:col-span-2 xl:col-span-1">
              <GuideSection
                id="operator"
                title={t("operatorTitle")}
                className="mt-0 border-l-0 pl-0 not-first-of-type:mt-0"
              >
                <GuideBulletList>
                  <li className="leading-relaxed">{t("operator1")}</li>
                  <li className="leading-relaxed">{t("operator2")}</li>
                  <li className="leading-relaxed">{t("operator3")}</li>
                  <li className="leading-relaxed">{t("operator4")}</li>
                </GuideBulletList>
              </GuideSection>
            </PublicHubPanel>
          </>
        ) : null}
      </div>

      {hubPublic ? (
        <GuideCallout tone="muted" measure="fill" className="mt-10 max-w-3xl">
          <h2 className="text-base font-semibold text-opseu-dark">{t("honestTitle")}</h2>
          <GuideProse className="mt-2">{t("honestBody")}</GuideProse>
        </GuideCallout>
      ) : null}

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <GuideCallout tone="plain" measure="fill" className="h-full">
          <h2 className="text-base font-semibold text-opseu-dark">{t("reportTitle")}</h2>
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

        <GuideCallout tone="plain" measure="fill" className="h-full">
          <h2 className="text-base font-semibold text-opseu-dark">{t("privacyTitle")}</h2>
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
    </ComposedPageLayout>
  );
}
