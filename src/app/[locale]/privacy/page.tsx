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
    <ComposedPageLayout composition="hub" size="wide" className="py-10 md:py-14">
      <header className="max-w-3xl">
        <h1 className={PUBLIC_PAGE_TITLE_CLASS}>{t("title")}</h1>
        <p className="mt-2 text-lg text-gray-600">{t("subtitle")}</p>
      </header>

      <GuideCallout className="mt-8 max-w-3xl" measure="fill">
        <h2 className="text-base font-semibold text-opseu-dark">
          {hubPublic ? t("leadTitleHub") : t("leadTitleCommsOnly")}
        </h2>
        <GuideProse className="mt-2">
          {hubPublic ? t("leadBodyHub") : t("leadBodyCommsOnly")}
        </GuideProse>
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
              <li className="leading-relaxed">{t("comms4")}</li>
            </GuideBulletList>
          </GuideSection>
        </PublicHubPanel>

        {hubPublic ? (
          <PublicHubPanel className="h-full">
            <GuideSection
              id="hub"
              title={t("hubTitle")}
              intro={t("hubIntro")}
              className="mt-0 border-l-0 pl-0 not-first-of-type:mt-0"
            >
              <GuideBulletList>
                <li className="leading-relaxed">{t("hubSelfHost")}</li>
                <li className="leading-relaxed">{t("hubHybrid")}</li>
                <li className="leading-relaxed">{t("hubDemo")}</li>
              </GuideBulletList>
            </GuideSection>
          </PublicHubPanel>
        ) : null}

        <PublicHubPanel
          className={hubPublic ? "h-full" : "h-full lg:col-span-1 xl:col-span-2"}
        >
          <GuideSection
            id="ontario"
            title={t("ontarioTitle")}
            className="mt-0 border-l-0 pl-0 not-first-of-type:mt-0"
          >
            <GuideProse>
              {hubPublic ? t("ontarioHub") : t("ontarioCommsOnly")}
            </GuideProse>
          </GuideSection>
        </PublicHubPanel>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <GuideCallout tone="muted" measure="fill" className="h-full">
          <h2 className="text-base font-semibold text-opseu-dark">
            {t("responsibilitiesTitle")}
          </h2>
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

        <GuideCallout tone="muted" measure="fill" className="h-full">
          <h2 className="text-base font-semibold text-opseu-dark">{t("installTitle")}</h2>
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

        <GuideCallout tone="plain" measure="fill" className="h-full">
          <h2 className="text-base font-semibold text-opseu-dark">{t("siteFeedbackTitle")}</h2>
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

        <GuideCallout tone="plain" measure="fill" className="h-full">
          <h2 className="text-base font-semibold text-opseu-dark">{t("contactTitle")}</h2>
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

        <GuideCallout
          tone="plain"
          measure="fill"
          className="h-full sm:col-span-2 xl:col-span-1"
        >
          <h2 className="text-base font-semibold text-opseu-dark">{t("securityTitle")}</h2>
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
    </ComposedPageLayout>
  );
}
